import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cita, EstadoCita } from './cita.entity';
import { MailService } from '../mail/mail.service'; // ⚠️ ajusta la ruta
import { CrearCitaDto } from './dto/crear-cita.dto';
import { ConfiguracionService } from '../configuracion/configuracion.service'; // 👈 NUEVO
import { In } from 'typeorm';

const ESTADOS_VALIDOS: EstadoCita[] = [
  'pendiente',
  'confirmada',
  'cancelada',
  'completada',
  'no_asistio', // 👈 NUEVO
];

@Injectable()
export class CitasService {
  private readonly logger = new Logger('CitasService');

  constructor(
    @InjectRepository(Cita) private repo: Repository<Cita>,
    private mailService: MailService,
    private configuracionService: ConfiguracionService,
  ) {}

  findAll() {
    return this.repo.find({
      relations: ['servicio'],
      order: { fecha: 'ASC', hora: 'ASC' },
    });
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

    // 🔒 No permitir citas en fechas pasadas
    const fechaCita = new Date(data.fecha + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaCita.getTime() < hoy.getTime()) {
      throw new BadRequestException(
        'No se pueden agendar citas en fechas pasadas.',
      );
    }

    // Validar que no haya empalme con otra cita activa
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

    // 📧 Notificaciones según el estado inicial
    if (completa) {
      if (completa.estado === 'confirmada') {
        // Admin la creó ya confirmada: solo correo de confirmación al cliente
        this.mailService
          .enviar(
            completa.correo,
            'Tu cita ha sido confirmada — Vortiz Arquitectos',
            this.htmlConfirmacion(completa),
          )
          .catch((err) =>
            this.logger.error(`Error enviando confirmación: ${err.message}`),
          );
      } else {
        // Cliente la solicitó (pendiente): acuse + aviso a admin
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

    // 📧 Notifica al cliente según el nuevo estado
    if (actualizada && estado === 'confirmada') {
      this.mailService
        .enviar(
          actualizada.correo,
          'Tu cita ha sido confirmada — Vortiz Arquitectos',
          this.htmlConfirmacion(actualizada),
        )
        .catch((err) =>
          this.logger.error(`Error enviando confirmación: ${err.message}`),
        );
    } else if (actualizada && estado === 'cancelada') {
      this.mailService
        .enviar(
          actualizada.correo,
          'Tu cita ha sido cancelada — Vortiz Arquitectos',
          this.htmlCancelacion(actualizada),
        )
        .catch((err) =>
          this.logger.error(`Error enviando cancelación: ${err.message}`),
        );
    } else if (actualizada && estado === 'no_asistio') {
      this.mailService
        .enviar(
          actualizada.correo,
          'Lamentamos no haberte visto — Vortiz Arquitectos',
          this.htmlNoAsistio(actualizada),
        )
        .catch((err) =>
          this.logger.error(
            `Error enviando aviso de no asistencia: ${err.message}`,
          ),
        );
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

    // 1) Cliente: SIEMPRE recibe acuse (no se desactiva)
    await this.mailService.enviar(
      cita.correo,
      'Recibimos tu solicitud de cita — Vortiz Arquitectos',
      this.htmlAcuseCliente(cita, servicio),
    );

    // 2) Admin: solo si el toggle está activo
    const config = await this.configuracionService.obtener();
    const notifActiva = config.notificaciones?.nuevaCita !== false;

    if (notifActiva) {
      const correoAdmin = config.contacto?.correoNotificaciones?.trim();

      if (correoAdmin) {
        // Usar el correo configurado en admin
        await this.mailService.enviar(
          correoAdmin,
          `Nueva cita pendiente — ${cita.nombre}`,
          this.htmlAvisoAdmin(cita, servicio),
        );
      } else {
        // Fallback: enviar a todos los admins de BD
        await this.mailService.enviarAAdmins(
          `Nueva cita pendiente — ${cita.nombre}`,
          this.htmlAvisoAdmin(cita, servicio),
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
    const dias = [
      'domingo',
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
    ];
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()} · ${hora}`;
  }

  private layout(titulo: string, contenido: string): string {
    return `
<div style="font-family: Arial, sans-serif; background: #f3f4f6; padding: 24px;">
  <div style="max-width: 560px; margin: auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #0a1f3d, #0a4d7a); color: white; padding: 24px;">
      <h1 style="margin: 0; font-size: 22px;">Vortiz Arquitectos</h1>
      <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">${titulo}</p>
    </div>
    <div style="padding: 28px; color: #0a1f3d;">
      ${contenido}
    </div>
    <div style="background: #f9fafb; padding: 16px 28px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
      Vortiz Arquitectos · Milpillas 101, La Forestal, Durango
    </div>
  </div>
</div>`;
  }

  private htmlAcuseCliente(cita: Cita, servicio: string): string {
    return this.layout(
      'Recibimos tu solicitud',
      `
      <h2 style="color: #0a4d7a; margin-top: 0;">¡Gracias por contactarnos, ${cita.nombre.split(' ')[0]}!</h2>
      <p>Hemos recibido tu solicitud de cita y te contactaremos en menos de 24 horas para confirmarla.</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0a4d7a;">
        <p style="margin: 4px 0;"><strong>Fecha y hora:</strong> ${this.formatearFecha(cita.fecha, cita.hora)}</p>
        <p style="margin: 4px 0;"><strong>Servicio:</strong> ${servicio}</p>
        <p style="margin: 4px 0;"><strong>Estado:</strong> Pendiente de confirmación</p>
      </div>
      ${cita.motivo ? `<p style="font-size: 14px; color: #6b7280;"><strong>Tu mensaje:</strong> ${cita.motivo}</p>` : ''}
      <p>Si necesitas algo urgente, puedes escribirnos al WhatsApp <strong>+52 618 000 0000</strong>.</p>
      `,
    );
  }

  private htmlAvisoAdmin(cita: Cita, servicio: string): string {
    return this.layout(
      'Nueva cita pendiente de confirmación',
      `
      <h2 style="color: #0a4d7a; margin-top: 0;">Tienes una nueva cita pendiente</h2>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Cliente:</strong> ${cita.nombre}</p>
        <p style="margin: 4px 0;"><strong>Correo:</strong> ${cita.correo}</p>
        <p style="margin: 4px 0;"><strong>Teléfono:</strong> ${cita.telefono}</p>
        <p style="margin: 4px 0;"><strong>Tipo:</strong> ${cita.tipo === 'consulta' ? 'Consulta' : 'Proyecto'}</p>
        <p style="margin: 4px 0;"><strong>Servicio:</strong> ${servicio}</p>
        <p style="margin: 4px 0;"><strong>Fecha y hora:</strong> ${this.formatearFecha(cita.fecha, cita.hora)}</p>
      </div>
      ${cita.motivo ? `<p><strong>Mensaje del cliente:</strong></p><p style="background: #fef3c7; padding: 12px; border-radius: 6px; font-size: 14px;">${cita.motivo}</p>` : ''}
      <p style="font-size: 13px; color: #6b7280;">Entra al panel de administración para confirmar o cancelar.</p>
      `,
    );
  }

  private htmlConfirmacion(cita: Cita): string {
    return this.layout(
      'Tu cita ha sido confirmada',
      `
      <h2 style="color: #16a34a; margin-top: 0;">¡Cita confirmada! ✓</h2>
      <p>Hola ${cita.nombre.split(' ')[0]}, te confirmamos los detalles de tu cita:</p>
      <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
        <p style="margin: 4px 0;"><strong>Fecha y hora:</strong> ${this.formatearFecha(cita.fecha, cita.hora)}</p>
        <p style="margin: 4px 0;"><strong>Servicio:</strong> ${this.nombreServicio(cita)}</p>
        <p style="margin: 4px 0;"><strong>Lugar:</strong> Milpillas 101, La Forestal, Durango</p>
      </div>
      <p>Te esperamos. Si por algún motivo no puedes asistir, por favor avísanos con anticipación.</p>
      `,
    );
  }

  private htmlCancelacion(cita: Cita): string {
    return this.layout(
      'Tu cita ha sido cancelada',
      `
      <h2 style="color: #dc2626; margin-top: 0;">Cita cancelada</h2>
      <p>Hola ${cita.nombre.split(' ')[0]}, te informamos que la cita programada para el <strong>${this.formatearFecha(cita.fecha, cita.hora)}</strong> ha sido cancelada.</p>
      <p>Si fue un error o quieres reagendar, contáctanos:</p>
      <ul style="font-size: 14px;">
        <li>WhatsApp: <strong>+52 618 000 0000</strong></li>
        <li>Correo: <strong>info@vortizarquitectos.com</strong></li>
      </ul>
      `,
    );
  }

  /**
   * Verifica si una cita propuesta choca con otra existente.
   * Considera duración completa (inicio + duracion minutos).
   * Las canceladas se ignoran (su horario queda libre).
   */
  private async hayEmpalme(
    fecha: string,
    hora: string,
    duracion: number,
    idIgnorar?: number,
  ): Promise<Cita | null> {
    // Buffer entre citas desde config
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

      // Solape considerando buffer (debe haber AL MENOS `buffer` min entre citas)
      if (
        inicioNueva - buffer < finExistente &&
        finNueva + buffer > inicioExistente
      ) {
        return c;
      }
    }
    return null;
  }

  private calcularHoraFin(horaInicio: string, duracion: number): string {
    const [h, m] = horaInicio.split(':').map(Number);
    const total = h * 60 + m + duracion;
    const hF = Math.floor(total / 60);
    const mF = total % 60;
    return `${String(hF).padStart(2, '0')}:${String(mF).padStart(2, '0')}`;
  }
  private htmlNoAsistio(cita: Cita): string {
    return this.layout(
      'No te vimos en tu cita',
      `
    <h2 style="color: #d97706; margin-top: 0;">Hola ${cita.nombre.split(' ')[0]}</h2>
    <p>Te esperábamos para tu cita del <strong>${this.formatearFecha(cita.fecha, cita.hora)}</strong>, pero no pudimos atenderte.</p>
    <p>Sabemos que pueden pasar imprevistos. Si quieres reagendar, contáctanos:</p>
    <ul style="font-size: 14px;">
      <li>WhatsApp: <strong>+52 618 000 0000</strong></li>
      <li>Correo: <strong>info@vortizarquitectos.com</strong></li>
    </ul>
    <p>Estaremos encantados de encontrar otra fecha que te funcione.</p>
    `,
    );
  }

  // Dentro de la clase CitasService
  async getHorariosOcupados(fecha: string): Promise<string[]> {
    const citas = await this.repo.find({
      where: {
        fecha,
        estado: In(['pendiente', 'confirmada']),
      },
      select: ['hora'],
    });
    return citas.map((c) => c.hora);
  }
}
