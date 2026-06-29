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
    const fechaActual = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${opciones.titulo}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #fbfaf7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fbfaf7; padding: 40px 16px;">
          <tr>
            <td align="center">

              <!-- Container -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width: 560px; width: 100%; background: #ffffff; border: 1px solid #e3e8ee;">

                <!-- Top tech bar -->
                <tr>
                  <td style="background: #0a1f3d; padding: 12px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="color: #fbfaf7; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                          Vortiz · Arquitectos
                        </td>
                        <td align="right" style="color: #b8863a; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                          Reporte Ejecutivo
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Hero -->
                <tr>
                  <td style="padding: 48px 32px 32px;">
                    <p style="margin: 0 0 16px; color: #b8863a; font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                      ━━━ Nuevo reporte
                    </p>
                    <h1 style="margin: 0 0 12px; font-family: Georgia, 'Times New Roman', serif; font-weight: 400; font-size: 32px; line-height: 1.1; color: #0a1f3d; letter-spacing: -0.02em;">
                      ${opciones.titulo}
                    </h1>
                    <p style="margin: 0; font-family: Georgia, serif; font-style: italic; font-size: 15px; line-height: 1.5; color: #1a2e4a;">
                      ${opciones.descripcion}
                    </p>
                  </td>
                </tr>

                <!-- Cota: período -->
                <tr>
                  <td style="padding: 0 32px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 0.5px solid #c8d1dc; border-bottom: 0.5px solid #c8d1dc; padding: 16px 0;">
                      <tr>
                        <td style="padding: 16px 0;">
                          <p style="margin: 0 0 6px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                            Periodo analizado
                          </p>
                          <p style="margin: 0; font-family: Georgia, serif; font-size: 16px; color: #0a1f3d;">
                            ${opciones.rangoTexto}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Cuerpo -->
                <tr>
                  <td style="padding: 0 32px 32px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a2e4a;">
                    <p style="margin: 0 0 16px;">
                      Encuentras adjunto el <strong style="color: #0a4d7a;">reporte ejecutivo completo</strong> en formato PDF con todas las gráficas, métricas e insights del periodo analizado.
                    </p>
                    <p style="margin: 0; color: #6b7a8c; font-size: 13px;">
                      Cualquier comentario o requerimiento adicional, no dudes en responder a este correo directamente.
                    </p>
                  </td>
                </tr>

                <!-- Caja del adjunto -->
                <tr>
                  <td style="padding: 0 32px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fbfaf7; border-left: 3px solid #b8863a; padding: 16px 20px;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                            📎 Archivo adjunto
                          </p>
                          <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 12px; color: #0a1f3d; font-weight: 500;">
                            Reporte ejecutivo · PDF
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: #fbfaf7; border-top: 0.5px solid #c8d1dc; padding: 20px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="color: #0a4d7a; font-size: 11px; font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 0.2em;">
                          VORTIZ
                        </td>
                        <td align="right" style="color: #6b7a8c; font-size: 9px; font-family: 'Courier New', monospace; letter-spacing: 0.15em; text-transform: uppercase;">
                          Generado · ${fechaActual}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>

              <!-- Disclaimer fuera del card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width: 560px; width: 100%; padding: 16px 0 0;">
                <tr>
                  <td align="center" style="color: #8d96a3; font-size: 11px; line-height: 1.5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    Correo generado automáticamente por el sistema Vortiz. <br>
                    Si no esperabas este reporte, puedes ignorarlo o responder al remitente.
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
    `;
  }
}