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

const ESTADOS_VALIDOS: EstadoCita[] = [
  'pendiente',
  'confirmada',
  'cancelada',
  'completada',
];

@Injectable()
export class CitasService {
  private readonly logger = new Logger('CitasService');

  constructor(
    @InjectRepository(Cita) private repo: Repository<Cita>,
    private mailService: MailService,
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
      estado: 'pendiente',
    });

    const guardada = await this.repo.save(cita);
    const completa = await this.findOne(guardada.id);

    // 📧 Notificaciones (fire-and-forget, no bloquean la respuesta)
    if (completa) {
      this.notificarNuevaCita(completa).catch((err) =>
        this.logger.error(`Error notificando nueva cita: ${err.message}`),
      );
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

    // 1) Cliente: acuse de recibo
    await this.mailService.enviar(
      cita.correo,
      'Recibimos tu solicitud de cita — Vortiz Arquitectos',
      this.htmlAcuseCliente(cita, servicio),
    );

    // 2) Admin(s): aviso de nueva cita pendiente
    await this.mailService.enviarAAdmins(
      `Nueva cita pendiente — ${cita.nombre}`,
      this.htmlAvisoAdmin(cita, servicio),
    );
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
      'domingo', 'lunes', 'martes', 'miércoles',
      'jueves', 'viernes', 'sábado',
    ];
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
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
}