import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity'; // ⚠️ ajusta a tu ruta
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger('MailService');
  private transporter: nodemailer.Transporter | null = null;
  private from = '';

  constructor(
    private config: ConfigService,
    @InjectRepository(Usuario) private usuariosRepo: Repository<Usuario>,
  ) {}

  onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST') || '';
    const port = this.config.get<number>('SMTP_PORT') || 587;
    const user = this.config.get<string>('SMTP_USER') || '';
    const pass = this.config.get<string>('SMTP_PASS') || '';
    this.from =
      this.config.get<string>('SMTP_FROM') ||
      'Vortiz Arquitectos <Admin@vortizarquitectos.com.mx>';

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

  // Obtiene los correos de los usuarios con rol admin desde la BD
  async getAdminEmails(): Promise<string[]> {
    const admins = await this.usuariosRepo.find({
      where: { rol: 'admin' }, // ⚠️ ajusta si tu columna se llama distinto
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

  async enviarRecuperacion(correo: string, codigo: string) {
    const subject = 'Tu código de recuperación — Vortiz Arquitectos';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; color: #0a1f3d;">
        <h2 style="color: #0a4d7a; margin-bottom: 12px;">Recuperación de contraseña</h2>
        <p>Hola,</p>
        <p>Usa este código para restablecer tu contraseña:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; background: #f3f4f6; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
          ${codigo}
        </p>
        <p style="color: #6b7280; font-size: 13px;">Si tú no solicitaste este código, ignora este correo.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.log(`Código de recuperación para ${correo}: ${codigo}`);
      return;
    }
    await this.enviar(correo, subject, html);
  }

  estaConfigurado(): boolean {
    return this.transporter !== null;
  }

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

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
      <div style="background: linear-gradient(135deg, #0a4d7a 0%, #0a1f3d 100%); color: white; padding: 30px 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Vortiz Arquitectos</h1>
        <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.85;">Respuesta a tu consulta</p>
      </div>
      <div style="background: white; padding: 30px 25px;">
        <p style="font-size: 16px; color: #111827; margin: 0 0 12px;">Hola ${nombreCliente},</p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
          Gracias por contactarnos. Aquí tienes nuestra respuesta a tu consulta:
        </p>
        ${
          servicio
            ? `<p style="font-size: 13px; color: #6b7280; margin: 0 0 16px;"><strong style="color: #0a4d7a;">Servicio:</strong> ${servicio}</p>`
            : ''
        }
        <div style="background: #f0f7fc; border-left: 4px solid #0a4d7a; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
          <p style="font-size: 14px; color: #1f2937; line-height: 1.7; margin: 0; white-space: pre-line;">${respuesta}</p>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 4px;"><strong>Tu consulta original:</strong></p>
        <p style="font-size: 12px; color: #9ca3af; font-style: italic; line-height: 1.5; margin: 0; padding: 10px; background: #f9fafb; border-radius: 4px;">
          ${mensajeOriginal}
        </p>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 20px; padding-top: 12px; border-top: 1px solid #f3f4f6;">
          💬 Puedes responder directamente a este correo para continuar la conversación.
        </p>
      </div>
      <div style="background: #0a1f3d; color: white; padding: 18px 20px; text-align: center; font-size: 11px;">
        <p style="margin: 0 0 4px; opacity: 0.9;">Vortiz Arquitectos · Diseñamos espacios que viven contigo</p>
        <p style="margin: 0; opacity: 0.7;">Si tienes más preguntas, responde a este correo.</p>
      </div>
    </div>
  `;

    // Subject con identificador visible
    const subject = consultaId
      ? `[Vortiz #${consultaId}] Respuesta a tu consulta`
      : 'Respuesta de Vortiz Arquitectos';

    if (!this.transporter) {
      this.logger.log(
        `[SMTP no configurado] Correo a ${destinatario}: "${subject}" (consultaId: ${consultaId})`,
      );
      return;
    }

    // Reply-To con subaddressing (consultas+ID@dominio)
    const replyTo = consultaId
      ? `consultas+${consultaId}@vortizarquitectos.com.mx`
      : undefined;

    // X-Header personalizado para identificación programática (la opción más robusta)
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
        replyTo,
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
