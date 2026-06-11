import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailReportesService {
  private readonly logger = new Logger(EmailReportesService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {}

  private async obtenerTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    // Usa la misma config que tu sistema de citas (Ethereal en dev)
    const host = this.configService.get<string>('SMTP_HOST');
    const port = parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      // Fallback a Ethereal para dev
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      this.logger.log(
        `Using Ethereal test account: ${testAccount.user} / ${testAccount.pass}`,
      );
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }

    return this.transporter;
  }

  async enviarReporte(opciones: {
    destinatarios: string[];
    titulo: string;
    descripcion: string;
    rangoTexto: string;
    pdfBuffer: Buffer;
    filename: string;
  }): Promise<{ enviados: number; previewUrl?: string }> {
    const transporter = await this.obtenerTransporter();

    const info = await transporter.sendMail({
      from: '"Vortiz Arquitectos" <reportes@vortizarquitectos.com>',
      to: opciones.destinatarios.join(', '),
      subject: `📊 Reporte Vortiz: ${opciones.titulo}`,
      html: this.plantillaHTML(opciones),
      attachments: [
        {
          filename: opciones.filename,
          content: opciones.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      this.logger.log(`📧 Email preview: ${previewUrl}`);
    }

    return {
      enviados: opciones.destinatarios.length,
      previewUrl: previewUrl || undefined,
    };
  }

  private plantillaHTML(opciones: {
    titulo: string;
    descripcion: string;
    rangoTexto: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; padding: 40px 20px; margin: 0;">
        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #0a4d7a, #0a1f3d); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #fff; font-size: 28px; letter-spacing: 2px;">VORTIZ</h1>
              <p style="margin: 8px 0 0; color: #bfdbfe; font-size: 12px;">Arquitectos &amp; Consultoría</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 8px; color: #111; font-size: 22px;">${opciones.titulo}</h2>
              <p style="margin: 0 0 24px; color: #666; font-size: 14px;">${opciones.descripcion}</p>
              <div style="background: #f9fafb; border-left: 3px solid #0a4d7a; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>Período:</strong> ${opciones.rangoTexto}
                </p>
              </div>
              <p style="margin: 0 0 16px; color: #374151; font-size: 14px; line-height: 1.6;">
                Adjunto encontrarás el reporte completo en formato PDF con todos los detalles, gráficas e insights del período seleccionado.
              </p>
              <p style="margin: 0; color: #666; font-size: 13px;">
                Cualquier duda o requerimiento adicional, no dudes en responder a este correo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #999; font-size: 11px;">
                Generado automáticamente por el sistema Vortiz<br>
                ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}