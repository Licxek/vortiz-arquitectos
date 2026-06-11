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
}
