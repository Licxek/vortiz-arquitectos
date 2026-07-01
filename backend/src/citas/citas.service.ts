import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cita, EstadoCita } from './cita.entity';
import { MailService } from '../mail/mail.service';
import { EmailLayoutService } from '../mail/email-layout.service';
import { CrearCitaDto } from './dto/crear-cita.dto';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { In } from 'typeorm';
import { MensajesConsultaService } from './mensajes-consulta.service';

const ESTADOS_VALIDOS: EstadoCita[] = [
  'pendiente',
  'confirmada',
  'cancelada',
  'completada',
  'no_asistio',
];

@Injectable()
export class CitasService {
  private readonly logger = new Logger('CitasService');

  constructor(
    @InjectRepository(Cita) private repo: Repository<Cita>,
    private mailService: MailService,
    private emailLayout: EmailLayoutService,
    private configuracionService: ConfiguracionService,
    private mensajesService: MensajesConsultaService,
  ) {}

  async findAll() {
    const citas = await this.repo.find({
      relations: ['servicio'],
      order: { fecha: 'ASC', hora: 'ASC' },
    });

    if (citas.length === 0) return citas;

    const ids = citas.map((c) => c.id);
    const ultimos = await this.repo.manager.query(
      `
    SELECT DISTINCT ON ("citaId") 
      "citaId", id, texto, autor, metodo, "createdAt"
    FROM mensajes_consulta
    WHERE "citaId" = ANY($1)
    ORDER BY "citaId", "createdAt" DESC
    `,
      [ids],
    );

    const mapa = new Map<number, any>();
    ultimos.forEach((m: any) => mapa.set(m.citaId, m));

    return citas.map((cita) => ({
      ...cita,
      ultimoMensaje: mapa.get(cita.id) || null,
    })) as any;
  }

  findOne(id: number) {
    return this.repo.findOne({
      where: { id },
      relations: ['servicio'],
    });
  }

  async crear(data: CrearCitaDto) {
    if (
      !data.nombre ||
      !data.correo ||
      !data.telefono ||
      !data.fecha ||
      !data.hora ||
      !data.tipo
    ) {
      throw new BadRequestException('Faltan campos obligatorios');
    }
    if (!['consulta', 'proyecto'].includes(data.tipo)) {
      throw new BadRequestException('Tipo no válido');
    }
    if (data.tipo === 'proyecto' && !data.servicioId) {
      throw new BadRequestException(
        'Para una cita de proyecto debes seleccionar un servicio',
      );
    }

    const fechaCita = new Date(data.fecha + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaCita.getTime() < hoy.getTime()) {
      throw new BadRequestException(
        'No se pueden agendar citas en fechas pasadas.',
      );
    }

    const duracion = data.duracion ?? 60;
    const conflicto = await this.hayEmpalme(data.fecha, data.hora, duracion);
    if (conflicto) {
      throw new BadRequestException(
        'El horario solicitado no está disponible. Por favor elige otro.',
      );
    }

    const cita = this.repo.create({
      nombre: data.nombre.trim(),
      correo: data.correo.trim().toLowerCase(),
      telefono: data.telefono.trim(),
      tipo: data.tipo,
      servicioId: data.tipo === 'consulta' ? null : data.servicioId!,
      motivo: data.motivo?.trim() || '',
      fecha: data.fecha,
      hora: data.hora,
      duracion: data.duracion ?? 60,
      estado: data.estado ?? 'pendiente',
    });

    const guardada = await this.repo.save(cita);
    const completa = await this.findOne(guardada.id);

    if (completa) {
      if (completa.estado === 'confirmada') {
        const ctx = await this.emailLayout.obtenerContexto();
        const html = await this.htmlConfirmacion(completa, ctx);
        this.mailService
          .enviar(
            completa.correo,
            `Tu cita ha sido confirmada — ${ctx.negocio.nombre}`,
            html,
          )
          .catch((err) =>
            this.logger.error(`Error enviando confirmación: ${err.message}`),
          );
      } else {
        this.notificarNuevaCita(completa).catch((err) =>
          this.logger.error(`Error notificando nueva cita: ${err.message}`),
        );
      }
    }

    return completa;
  }

  async cambiarEstado(id: number, estado: EstadoCita) {
    if (!ESTADOS_VALIDOS.includes(estado)) {
      throw new BadRequestException('Estado no válido');
    }
    const cita = await this.repo.findOne({ where: { id } });
    if (!cita) throw new NotFoundException('Cita no encontrada');
    cita.estado = estado;
    await this.repo.save(cita);
    const actualizada = await this.findOne(id);

    if (actualizada) {
      const ctx = await this.emailLayout.obtenerContexto();

      if (estado === 'confirmada') {
        const html = await this.htmlConfirmacion(actualizada, ctx);
        this.mailService
          .enviar(
            actualizada.correo,
            `Tu cita ha sido confirmada — ${ctx.negocio.nombre}`,
            html,
          )
          .catch((err) =>
            this.logger.error(`Error enviando confirmación: ${err.message}`),
          );
      } else if (estado === 'cancelada') {
        const html = await this.htmlCancelacion(actualizada, ctx);
        this.mailService
          .enviar(
            actualizada.correo,
            `Tu cita ha sido cancelada — ${ctx.negocio.nombre}`,
            html,
          )
          .catch((err) =>
            this.logger.error(`Error enviando cancelación: ${err.message}`),
          );
      } else if (estado === 'no_asistio') {
        const html = await this.htmlNoAsistio(actualizada, ctx);
        this.mailService
          .enviar(
            actualizada.correo,
            `Lamentamos no haberte visto — ${ctx.negocio.nombre}`,
            html,
          )
          .catch((err) =>
            this.logger.error(
              `Error enviando aviso de no asistencia: ${err.message}`,
            ),
          );
      }
    }

    return actualizada;
  }

  async eliminar(id: number) {
    const r = await this.repo.delete(id);
    if (r.affected === 0) throw new NotFoundException('Cita no encontrada');
    return { ok: true };
  }

  // ============ Helpers de correo ============

  private async notificarNuevaCita(cita: Cita) {
    const servicio = this.nombreServicio(cita);
    const ctx = await this.emailLayout.obtenerContexto();

    // 1) Cliente: SIEMPRE recibe acuse
    await this.mailService.enviar(
      cita.correo,
      `Recibimos tu solicitud de cita — ${ctx.negocio.nombre}`,
      this.htmlAcuseCliente(cita, servicio, ctx),
    );

    // 2) Admin: solo si el toggle está activo
    const config = await this.configuracionService.obtener();
    const notifActiva = config.notificaciones?.nuevaCita !== false;

    if (notifActiva) {
      const correoAdmin = config.contacto?.correoNotificaciones?.trim();

      if (correoAdmin) {
        await this.mailService.enviar(
          correoAdmin,
          `Nueva cita pendiente — ${cita.nombre}`,
          this.htmlAvisoAdmin(cita, servicio, ctx),
        );
      } else {
        await this.mailService.enviarAAdmins(
          `Nueva cita pendiente — ${cita.nombre}`,
          this.htmlAvisoAdmin(cita, servicio, ctx),
        );
      }
    }
  }

  private nombreServicio(cita: Cita): string {
    return (
      cita.servicio?.titulo ||
      (cita.tipo === 'consulta' ? 'Consulta inicial' : 'Proyecto')
    );
  }

  private formatearFecha(fechaISO: string, hora: string): string {
    const d = new Date(fechaISO + 'T00:00:00');
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()} · ${hora}`;
  }

  // ============ PLANTILLAS DE CORREO ============

  private htmlAcuseCliente(cita: Cita, servicio: string, ctx: any): string {
    const nombre = cita.nombre.split(' ')[0];

    const caja = this.emailLayout.cajaDestacada({
      titulo: 'Tu solicitud · pendiente de confirmación',
      variante: 'default',
      items: [
        { label: 'Fecha y hora', valor: this.formatearFecha(cita.fecha, cita.hora) },
        { label: 'Servicio', valor: servicio },
        { label: 'Estado', valor: 'Pendiente de confirmación' },
      ],
    });

    const mensajeBox = cita.motivo
      ? this.emailLayout.cajaMensaje('Tu mensaje', cita.motivo)
      : '';

    const contenido = `
      <p style="margin: 0 0 16px;">
        Hola <strong style="color: #0a4d7a;">${this.emailLayout.escape(nombre)}</strong>, hemos recibido tu solicitud de cita. Te contactaremos en menos de <strong>24 horas</strong> para confirmarla.
      </p>
      ${caja}
      ${mensajeBox}
      <p style="margin: 16px 0 0; color: #6b7a8c; font-size: 13px;">
        Si tienes alguna duda urgente, contáctanos por los medios de abajo.
      </p>`;

    return this.emailLayout.layout({
      eyebrow: 'Solicitud recibida',
      titulo: '¡Gracias por contactarnos!',
      subtitulo: 'Procesaremos tu solicitud en las próximas horas.',
      contenido,
      ctx,
    });
  }

  private htmlAvisoAdmin(cita: Cita, servicio: string, ctx: any): string {
    const caja = this.emailLayout.cajaDestacada({
      titulo: 'Datos de la cita',
      variante: 'warning',
      items: [
        { label: 'Cliente', valor: cita.nombre },
        { label: 'Correo', valor: cita.correo },
        { label: 'Teléfono', valor: cita.telefono },
        { label: 'Tipo', valor: cita.tipo === 'consulta' ? 'Consulta' : 'Proyecto' },
        { label: 'Servicio', valor: servicio },
        { label: 'Fecha y hora', valor: this.formatearFecha(cita.fecha, cita.hora) },
      ],
    });

    const mensajeBox = cita.motivo
      ? this.emailLayout.cajaMensaje('Mensaje del cliente', cita.motivo)
      : '';

    const contenido = `
      <p style="margin: 0 0 16px;">
        Tienes una <strong style="color: #b8863a;">nueva cita pendiente de confirmación</strong>. Revisa los detalles abajo y confírmala desde el panel de administración.
      </p>
      ${caja}
      ${mensajeBox}`;

    return this.emailLayout.layout({
      eyebrow: 'Aviso interno · admin',
      titulo: 'Nueva cita pendiente',
      subtitulo: 'Requiere tu confirmación.',
      contenido,
      ctx,
    });
  }

  private htmlConfirmacion(cita: Cita, ctx: any): string {
    const nombre = cita.nombre.split(' ')[0];

    const caja = this.emailLayout.cajaDestacada({
      titulo: 'Tu cita · confirmada',
      variante: 'success',
      items: [
        { label: 'Fecha y hora', valor: this.formatearFecha(cita.fecha, cita.hora) },
        { label: 'Servicio', valor: this.nombreServicio(cita) },
        { label: 'Lugar', valor: ctx.negocio.direccionCompleta },
      ],
    });

    const contenido = `
      <p style="margin: 0 0 16px;">
        Hola <strong style="color: #0a4d7a;">${this.emailLayout.escape(nombre)}</strong>, te confirmamos los detalles de tu cita.
      </p>
      ${caja}
      <p style="margin: 16px 0 0; color: #1a2e4a;">
        Te esperamos. Si por algún motivo no puedes asistir, por favor avísanos con anticipación.
      </p>`;

    return this.emailLayout.layout({
      eyebrow: 'Cita confirmada',
      titulo: '¡Cita confirmada!',
      subtitulo: 'Te esperamos en la fecha indicada.',
      contenido,
      ctx,
    });
  }

  private htmlCancelacion(cita: Cita, ctx: any): string {
    const nombre = cita.nombre.split(' ')[0];

    const caja = this.emailLayout.cajaDestacada({
      titulo: 'Cita cancelada',
      variante: 'danger',
      items: [
        { label: 'Fecha original', valor: this.formatearFecha(cita.fecha, cita.hora) },
        { label: 'Servicio', valor: this.nombreServicio(cita) },
      ],
    });

    const contenido = `
      <p style="margin: 0 0 16px;">
        Hola <strong style="color: #0a4d7a;">${this.emailLayout.escape(nombre)}</strong>, te informamos que tu cita ha sido cancelada.
      </p>
      ${caja}
      <p style="margin: 16px 0 0; color: #1a2e4a;">
        Si fue un error o quieres reagendar, contáctanos por los medios de abajo. Estaremos encantados de encontrar otra fecha que te funcione.
      </p>`;

    return this.emailLayout.layout({
      eyebrow: 'Cita cancelada',
      titulo: 'Tu cita ha sido cancelada',
      subtitulo: 'Puedes reagendar en cualquier momento.',
      contenido,
      ctx,
    });
  }

  private htmlNoAsistio(cita: Cita, ctx: any): string {
    const nombre = cita.nombre.split(' ')[0];

    const caja = this.emailLayout.cajaDestacada({
      titulo: 'Cita no asistida',
      variante: 'warning',
      items: [
        { label: 'Fecha programada', valor: this.formatearFecha(cita.fecha, cita.hora) },
        { label: 'Servicio', valor: this.nombreServicio(cita) },
      ],
    });

    const contenido = `
      <p style="margin: 0 0 16px;">
        Hola <strong style="color: #0a4d7a;">${this.emailLayout.escape(nombre)}</strong>, te esperábamos para tu cita pero no pudimos atenderte.
      </p>
      ${caja}
      <p style="margin: 16px 0 0; color: #1a2e4a;">
        Sabemos que pueden pasar imprevistos. Si quieres reagendar, contáctanos por los medios de abajo. Estaremos encantados de encontrar otra fecha que te funcione.
      </p>`;

    return this.emailLayout.layout({
      eyebrow: 'No te vimos',
      titulo: 'Lamentamos no haberte visto',
      subtitulo: 'Te ayudamos a reagendar cuando puedas.',
      contenido,
      ctx,
    });
  }

  // ============ HELPERS DE EMPALME Y HORARIOS (SIN CAMBIOS) ============

  private async hayEmpalme(
    fecha: string,
    hora: string,
    duracion: number,
    idIgnorar?: number,
  ): Promise<Cita | null> {
    const config = await this.configuracionService.obtener();
    const buffer: number = config.agenda?.tiempoEntreCitas ?? 0;

    const candidatas = await this.repo.find({
      where: { fecha },
      relations: ['servicio'],
    });

    const [hN, mN] = hora.split(':').map(Number);
    const inicioNueva = hN * 60 + mN;
    const finNueva = inicioNueva + duracion;

    for (const c of candidatas) {
      if (idIgnorar && c.id === idIgnorar) continue;
      if (c.estado === 'cancelada') continue;

      const [hC, mC] = c.hora.split(':').map(Number);
      const inicioExistente = hC * 60 + mC;
      const finExistente = inicioExistente + (c.duracion || 60);

      if (
        inicioNueva - buffer < finExistente &&
        finNueva + buffer > inicioExistente
      ) {
        return c;
      }
    }
    return null;
  }

  async getHorariosOcupados(
    fecha: string,
  ): Promise<{ todas: string[]; ocupadas: string[] }> {
    const config = await this.configuracionService.obtener();
    const agenda: any = config.agenda || {};

    // 👇 NUEVO: usar horario específico del día (con fallback al global)
    const { horaInicio, horaFin } = this.obtenerHorarioDelDia(fecha, agenda);

    const duracionCita: number = agenda.duracionCita || 60;
    const buffer: number = agenda.tiempoEntreCitas || 0;

    const citas = await this.repo.find({
      where: {
        fecha,
        estado: In(['pendiente', 'confirmada']),
      },
      select: ['hora', 'duracion'],
    });

    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFin.split(':').map(Number);
    const inicioMin = hI * 60 + mI;
    const finMin = hF * 60 + mF;
    const paso = duracionCita + buffer;

    const todas: string[] = [];
    const ocupadas: string[] = [];

    for (let m = inicioMin; m + duracionCita <= finMin; m += paso) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const slotHora = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      todas.push(slotHora);

      const inicioSlot = m;
      const finSlot = m + duracionCita;

      for (const c of citas) {
        const [hC, mC] = c.hora.split(':').map(Number);
        const inicioC = hC * 60 + mC;
        const finC = inicioC + (c.duracion || 60);

        if (inicioSlot - buffer < finC && finSlot + buffer > inicioC) {
          ocupadas.push(slotHora);
          break;
        }
      }
    }

    return { todas, ocupadas };
  }

  async responderConsulta(id: number, mensaje: string) {
    const consulta = await this.repo.findOne({
      where: { id },
      relations: ['servicio'],
    });
    if (!consulta) {
      throw new NotFoundException('Consulta no encontrada');
    }

    await this.mailService.enviarRespuestaConsulta({
      destinatario: consulta.correo,
      nombreCliente: consulta.nombre,
      mensajeOriginal: consulta.motivo || '',
      respuesta: mensaje,
      servicio: consulta.servicio?.titulo,
      consultaId: consulta.id,
    });

    let mensajeGuardado;
    try {
      mensajeGuardado = await this.mensajesService.crear(id, {
        autor: 'admin',
        texto: mensaje,
        metodo: 'email',
      });
    } catch (err: any) {
      this.logger.error(`Error guardando mensaje en BD: ${err.message}`);
    }

    return {
      success: true,
      mensaje: 'Respuesta enviada correctamente',
      mensajeGuardado,
    };
  }

  /**
   * Retorna el horario del día específico según el índice en agenda.diasSemana.
   * Si el día tiene horaInicio/horaFin propios, los usa. Si no, cae al global.
   * Orden en BD: 0=Lun, 1=Mar, 2=Mié, 3=Jue, 4=Vie, 5=Sáb, 6=Dom
   * JS Date.getDay(): 0=Dom, 1=Lun, ..., 6=Sáb
   */
  private obtenerHorarioDelDia(
    fecha: string,
    agenda: any,
  ): { horaInicio: string; horaFin: string } {
    const globalInicio = agenda.horaInicio || '09:00';
    const globalFin = agenda.horaFin || '18:00';

    const d = new Date(fecha + 'T00:00:00');
    const jsDay = d.getDay();
    const arrayIdx = (jsDay + 6) % 7;

    const diaConfig = (agenda.diasSemana || [])[arrayIdx];

    if (diaConfig?.horaInicio && diaConfig?.horaFin) {
      return {
        horaInicio: diaConfig.horaInicio,
        horaFin: diaConfig.horaFin,
      };
    }

    return { horaInicio: globalInicio, horaFin: globalFin };
  }
}