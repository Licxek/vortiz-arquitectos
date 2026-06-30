import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cita } from './cita.entity';
import { MailService } from '../mail/mail.service';
import { EmailLayoutService } from '../mail/email-layout.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class RecordatoriosService {
  private readonly logger = new Logger('RecordatoriosService');

  constructor(
    @InjectRepository(Cita) private repo: Repository<Cita>,
    private mailService: MailService,
    private emailLayout: EmailLayoutService,
    private configuracionService: ConfiguracionService,
    private whatsappService: WhatsAppService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async enviarRecordatorios24h() {
    const config = await this.configuracionService.obtener();
    if (!config.notificaciones?.recordatorio24h) {
      return;
    }

    const canal = config.notificaciones?.canalRecordatorio || 'email';
    const target = new Date(Date.now() + 24 * 60 * 60 * 1000);
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

  @Cron('*/15 * * * *')
  async enviarRecordatorios1h() {
    const config = await this.configuracionService.obtener();
    if (!config.notificaciones?.recordatorio1h) {
      return;
    }

    const canal = config.notificaciones?.canalRecordatorio || 'email';
    const target = new Date(Date.now() + 60 * 60 * 1000);
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

  private async enviarRecordatorio(
    cita: Cita,
    canal: string,
    tipo: '24h' | '1h',
  ) {
    const usarEmail = canal === 'email' || canal === 'ambos';
    const usarWhatsapp = canal === 'whatsapp' || canal === 'ambos';

    if (usarEmail) {
      const ctx = await this.emailLayout.obtenerContexto();
      const html =
        tipo === '24h'
          ? this.htmlRecordatorio24h(cita, ctx)
          : this.htmlRecordatorio1h(cita, ctx);
      const asunto =
        tipo === '24h'
          ? `⏰ Tu cita es mañana — ${ctx.negocio.nombre}`
          : `🔔 Tu cita es en 1 hora — ${ctx.negocio.nombre}`;

      await this.mailService
        .enviar(cita.correo, asunto, html)
        .catch((err) =>
          this.logger.error(
            `Error enviando recordatorio ${tipo} a ${cita.correo}: ${err.message}`,
          ),
        );
    }

    if (usarWhatsapp && this.whatsappService.habilitado) {
      const template =
        tipo === '24h' ? 'recordatorio_cita_24h' : 'recordatorio_cita_1h';
      const params = [
        cita.nombre.split(' ')[0],
        this.formatearFecha(cita.fecha, cita.hora),
      ];
      await this.whatsappService.enviarTemplate(
        cita.telefono,
        template,
        params,
      );
    }
  }

  // ============ PLANTILLAS DE CORREO ============

  private htmlRecordatorio24h(cita: Cita, ctx: any): string {
    const nombre = cita.nombre.split(' ')[0];

    const caja = this.emailLayout.cajaDestacada({
      titulo: 'Tu cita · mañana',
      variante: 'success',
      items: [
        { label: 'Fecha y hora', valor: this.formatearFecha(cita.fecha, cita.hora) },
        { label: 'Servicio', valor: this.nombreServicio(cita) },
        { label: 'Lugar', valor: ctx.negocio.direccionCompleta },
      ],
    });

    const contenido = `
      <p style="margin: 0 0 16px;">
        Hola <strong style="color: #0a4d7a;">${this.emailLayout.escape(nombre)}</strong>, te recordamos que <strong>mañana</strong> tienes tu cita confirmada.
      </p>
      ${caja}
      <p style="margin: 16px 0 0; color: #1a2e4a;">
        Si necesitas reagendar o cancelar, contáctanos lo antes posible por los medios de abajo.
      </p>`;

    return this.emailLayout.layout({
      eyebrow: 'Recordatorio · 24h antes',
      titulo: '¡Tu cita es mañana!',
      subtitulo: 'Te esperamos puntual.',
      contenido,
      ctx,
    });
  }

  private htmlRecordatorio1h(cita: Cita, ctx: any): string {
    const nombre = cita.nombre.split(' ')[0];

    const caja = this.emailLayout.cajaDestacada({
      titulo: 'Tu cita · en 1 hora',
      variante: 'warning',
      items: [
        { label: 'Hora', valor: cita.hora },
        { label: 'Servicio', valor: this.nombreServicio(cita) },
        { label: 'Lugar', valor: ctx.negocio.direccionCompleta },
      ],
    });

    const contenido = `
      <p style="margin: 0 0 16px;">
        Hola <strong style="color: #0a4d7a;">${this.emailLayout.escape(nombre)}</strong>, te recordamos que tu cita es en <strong style="color: #b8863a;">1 hora</strong>.
      </p>
      ${caja}
      <p style="margin: 16px 0 0; color: #1a2e4a;">
        ¡Te esperamos!
      </p>`;

    return this.emailLayout.layout({
      eyebrow: 'Recordatorio · 1h antes',
      titulo: '¡Tu cita es muy pronto!',
      subtitulo: 'Nos vemos en una hora.',
      contenido,
      ctx,
    });
  }

  // ============ HELPERS ============

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
}
