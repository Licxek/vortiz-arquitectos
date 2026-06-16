import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cita } from './cita.entity';
import { MailService } from '../mail/mail.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class RecordatoriosService {
  private readonly logger = new Logger('RecordatoriosService');

  constructor(
    @InjectRepository(Cita) private repo: Repository<Cita>,
    private mailService: MailService,
    private configuracionService: ConfiguracionService,
    private whatsappService: WhatsAppService,
  ) {}

  /** Cada hora en el minuto 0 — recordatorio 24h antes */
  @Cron(CronExpression.EVERY_HOUR)
  async enviarRecordatorios24h() {
    const config = await this.configuracionService.obtener();
    if (!config.notificaciones?.recordatorio24h) {
      return; // toggle desactivado
    }

    const canal = config.notificaciones?.canalRecordatorio || 'email';
    const target = new Date(Date.now() + 24 * 60 * 60 * 1000); // ahora + 24h
    const fechaStr = this.fechaLocal(target);

    const citas = await this.repo.find({
      where: {
        fecha: fechaStr,
        estado: 'confirmada',
        recordatorio24hEnviado: false,
      },
      relations: ['servicio'],
    });

    const horaTarget = target.getHours() * 60 + target.getMinutes();
    let enviados = 0;

    for (const cita of citas) {
      const [h, m] = cita.hora.split(':').map(Number);
      const horaCita = h * 60 + m;
      const diff = Math.abs(horaCita - horaTarget);

      // Si está dentro de ±30 min de "24h antes" → enviar
      if (diff <= 30) {
        await this.enviarRecordatorio(cita, canal, '24h');
        cita.recordatorio24hEnviado = true;
        await this.repo.save(cita);
        enviados++;
      }
    }

    if (enviados > 0) {
      this.logger.log(`📧 Enviados ${enviados} recordatorios 24h`);
    }
  }

  /** Cada 15 min — recordatorio 1h antes */
  @Cron('*/15 * * * *')
  async enviarRecordatorios1h() {
    const config = await this.configuracionService.obtener();
    if (!config.notificaciones?.recordatorio1h) {
      return;
    }

    const canal = config.notificaciones?.canalRecordatorio || 'email';
    const target = new Date(Date.now() + 60 * 60 * 1000); // ahora + 1h
    const fechaStr = this.fechaLocal(target);

    const citas = await this.repo.find({
      where: {
        fecha: fechaStr,
        estado: 'confirmada',
        recordatorio1hEnviado: false,
      },
      relations: ['servicio'],
    });

    const horaTarget = target.getHours() * 60 + target.getMinutes();
    let enviados = 0;

    for (const cita of citas) {
      const [h, m] = cita.hora.split(':').map(Number);
      const horaCita = h * 60 + m;
      const diff = Math.abs(horaCita - horaTarget);

      // Si está dentro de ±7 min → enviar
      if (diff <= 7) {
        await this.enviarRecordatorio(cita, canal, '1h');
        cita.recordatorio1hEnviado = true;
        await this.repo.save(cita);
        enviados++;
      }
    }

    if (enviados > 0) {
      this.logger.log(`📧 Enviados ${enviados} recordatorios 1h`);
    }
  }

  private async enviarRecordatorio(cita: Cita, canal: string, tipo: '24h' | '1h') {
    const usarEmail = canal === 'email' || canal === 'ambos';
    const usarWhatsapp = canal === 'whatsapp' || canal === 'ambos';

    if (usarEmail) {
      const html = tipo === '24h' ? this.htmlRecordatorio24h(cita) : this.htmlRecordatorio1h(cita);
      const asunto = tipo === '24h'
        ? '⏰ Tu cita es mañana — Vortiz Arquitectos'
        : '🔔 Tu cita es en 1 hora — Vortiz Arquitectos';

      await this.mailService.enviar(cita.correo, asunto, html).catch((err) =>
        this.logger.error(`Error enviando recordatorio ${tipo} a ${cita.correo}: ${err.message}`),
      );
    }

    if (usarWhatsapp && this.whatsappService.habilitado) {
      const template = tipo === '24h' ? 'recordatorio_cita_24h' : 'recordatorio_cita_1h';
      const params = [
        cita.nombre.split(' ')[0],
        this.formatearFecha(cita.fecha, cita.hora),
      ];
      await this.whatsappService.enviarTemplate(cita.telefono, template, params);
    }
  }

  // === Helpers ===

  private fechaLocal(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatearFecha(fechaISO: string, hora: string): string {
    const d = new Date(fechaISO + 'T00:00:00');
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} · ${hora}`;
  }

  private nombreServicio(cita: Cita): string {
    return (
      cita.servicio?.titulo ||
      (cita.tipo === 'consulta' ? 'Consulta inicial' : 'Proyecto')
    );
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

  private htmlRecordatorio24h(cita: Cita): string {
    return this.layout(
      '⏰ Tu cita es mañana',
      `
      <h2 style="color: #0a4d7a; margin-top: 0;">¡Te esperamos mañana, ${cita.nombre.split(' ')[0]}!</h2>
      <p>Este es un recordatorio amistoso de tu cita confirmada:</p>
      <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
        <p style="margin: 4px 0;"><strong>📅 Fecha:</strong> ${this.formatearFecha(cita.fecha, cita.hora)}</p>
        <p style="margin: 4px 0;"><strong>💼 Servicio:</strong> ${this.nombreServicio(cita)}</p>
        <p style="margin: 4px 0;"><strong>📍 Lugar:</strong> Milpillas 101, La Forestal, Durango</p>
      </div>
      <p>Si necesitas reagendar o cancelar, contáctanos lo antes posible:</p>
      <ul style="font-size: 14px;">
        <li>WhatsApp: <strong>+52 618 000 0000</strong></li>
      </ul>
      `,
    );
  }

  private htmlRecordatorio1h(cita: Cita): string {
    return this.layout(
      '🔔 Tu cita es en 1 hora',
      `
      <h2 style="color: #d97706; margin-top: 0;">¡Tu cita es muy pronto!</h2>
      <p>Hola ${cita.nombre.split(' ')[0]}, recuerda que tienes una cita en 1 hora:</p>
      <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
        <p style="margin: 4px 0;"><strong>🕐 Hora:</strong> ${cita.hora}</p>
        <p style="margin: 4px 0;"><strong>📍 Lugar:</strong> Milpillas 101, La Forestal, Durango</p>
      </div>
      <p>¡Te esperamos!</p>
      `,
    );
  }
}