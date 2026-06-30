import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import * as nodemailer from 'nodemailer';
import { EmailLayoutService } from './email-layout.service';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger('MailService');
  private transporter: nodemailer.Transporter | null = null;
  private from = '';

  constructor(
    private config: ConfigService,
    @InjectRepository(Usuario) private usuariosRepo: Repository<Usuario>,
    private emailLayout: EmailLayoutService,
  ) {}

  onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST') || '';
    const port = this.config.get<number>('SMTP_PORT') || 587;
    const user = this.config.get<string>('SMTP_USER') || '';
    const pass = this.config.get<string>('SMTP_PASS') || '';
    this.from =
      this.config.get<string>('SMTP_FROM') ||
      'Vortiz Arquitectos <admin@vortizarquitectos.com.mx>';

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP no configurado (SMTP_HOST/USER/PASS vacíos). Los correos se mostrarán solo en logs.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    this.logger.log(`MailService listo (host: ${host}, port: ${port})`);
  }

  async enviar(to: string, subject: string, html: string): Promise<void> {
    if (!to) {
      this.logger.warn(`Destinatario vacío; no se envió "${subject}"`);
      return;
    }
    if (!this.transporter) {
      this.logger.log(`[SMTP no configurado] Correo a ${to}: "${subject}"`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Correo enviado a ${to} — ${subject}`);
    } catch (err: any) {
      this.logger.error(`Error enviando correo a ${to}: ${err.message}`);
    }
  }

  async getAdminEmails(): Promise<string[]> {
    const admins = await this.usuariosRepo.find({
      where: { rol: 'admin' },
    });
    return admins.map((a) => a.correo).filter((c): c is string => !!c);
  }

  async enviarAAdmins(subject: string, html: string): Promise<void> {
    const emails = await this.getAdminEmails();
    if (emails.length === 0) {
      this.logger.warn('No hay administradores con correo registrado en la BD');
      return;
    }
    for (const email of emails) {
      await this.enviar(email, subject, html);
    }
  }

  estaConfigurado(): boolean {
    return this.transporter !== null;
  }

  // ============================================================
  // PLANTILLA: RECUPERACIÓN DE CONTRASEÑA
  // ============================================================

  async enviarRecuperacion(correo: string, codigo: string) {
    const ctx = await this.emailLayout.obtenerContexto();
    const subject = `Tu código de recuperación — ${ctx.negocio.nombre}`;

    const cajaCodigo = this.emailLayout.cajaCodigo({
      codigo,
      label: 'Código de recuperación',
    });

    const contenido = `
      <p style="margin: 0 0 16px;">
        Recibimos una solicitud para <strong style="color: #0a4d7a;">restablecer tu contraseña</strong>. Usa el siguiente código para continuar el proceso.
      </p>
      ${cajaCodigo}
      <p style="margin: 16px 0 12px; color: #1a2e4a; font-size: 13px;">
        Este código expira en <strong>15 minutos</strong>. Si no fuiste tú quien solicitó este cambio, puedes ignorar este correo — tu cuenta sigue segura.
      </p>
      <p style="margin: 0; color: #6b7a8c; font-size: 12px; font-style: italic;">
        Por seguridad, nunca compartas este código con nadie.
      </p>`;

    const html = this.emailLayout.layout({
      eyebrow: 'Recuperación de acceso',
      titulo: 'Tu código de recuperación',
      subtitulo: 'Úsalo para restablecer tu contraseña.',
      contenido,
      ctx,
    });

    if (!this.transporter) {
      this.logger.log(`Código de recuperación para ${correo}: ${codigo}`);
      return;
    }
    await this.enviar(correo, subject, html);
  }

  // ============================================================
  // PLANTILLA: RESPUESTA A CONSULTA
  // ============================================================

  async enviarRespuestaConsulta(opciones: {
    destinatario: string;
    nombreCliente: string;
    mensajeOriginal: string;
    respuesta: string;
    servicio?: string;
    consultaId?: number;
  }) {
    const {
      destinatario,
      nombreCliente,
      mensajeOriginal,
      respuesta,
      servicio,
      consultaId,
    } = opciones;

    const ctx = await this.emailLayout.obtenerContexto();
    const nombre = nombreCliente.split(' ')[0];

    // Caja con la respuesta del admin (lo más importante, destacado)
    const cajaRespuesta = this.emailLayout.cajaDestacada({
      titulo: servicio
        ? `Sobre tu consulta de ${servicio}`
        : 'Nuestra respuesta',
      variante: 'default',
      items: [{ label: 'Respuesta', valor: respuesta }],
    });

    // Caja con el mensaje original del cliente (referencia subordinada)
    const cajaOriginal = this.emailLayout.cajaMensaje(
      'Tu mensaje original',
      mensajeOriginal,
    );

    const contenido = `
      <p style="margin: 0 0 16px;">
        Hola <strong style="color: #0a4d7a;">${this.emailLayout.escape(nombre)}</strong>, gracias por contactarnos. Aquí tienes la respuesta a tu consulta.
      </p>
      ${cajaRespuesta}
      ${mensajeOriginal ? cajaOriginal : ''}
      <p style="margin: 20px 0 0; padding-top: 16px; border-top: 0.5px solid #c8d1dc; color: #6b7a8c; font-size: 13px; font-style: italic;">
        💬 Puedes responder directamente a este correo para continuar la conversación.
      </p>`;

    const html = this.emailLayout.layout({
      eyebrow: consultaId
        ? `Respuesta · Consulta #${consultaId}`
        : 'Respuesta a tu consulta',
      titulo: 'Tenemos una respuesta para ti',
      subtitulo: servicio
        ? `Sobre tu interés en ${servicio}.`
        : 'Gracias por escribirnos.',
      contenido,
      ctx,
    });

    const subject = consultaId
      ? `[Vortiz #${consultaId}] Respuesta a tu consulta`
      : `Respuesta de ${ctx.negocio.nombre}`;

    if (!this.transporter) {
      this.logger.log(
        `[SMTP no configurado] Correo a ${destinatario}: "${subject}" (consultaId: ${consultaId})`,
      );
      return;
    }

    // X-Header para identificación programática (lo conservas para tracking)
    const headers: Record<string, string> = {};
    if (consultaId) {
      headers['X-Vortiz-Consulta-Id'] = consultaId.toString();
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: destinatario,
        subject,
        html,
        headers,
      });
      this.logger.log(
        `Respuesta enviada a ${destinatario} — consultaId: ${consultaId}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Error enviando respuesta a ${destinatario}: ${err.message}`,
      );
      throw err;
    }
  }
}