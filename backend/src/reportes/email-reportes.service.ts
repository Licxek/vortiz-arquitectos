import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailLayoutService } from '../mail/email-layout.service';

@Injectable()
export class EmailReportesService {
  private readonly logger = new Logger(EmailReportesService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private configService: ConfigService,
    private emailLayout: EmailLayoutService,
  ) {}

  private async obtenerTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    // Usa la misma config que tu sistema de citas (Ethereal en dev)
    const host = this.configService.get<string>('SMTP_HOST');
    const port = parseInt(
      this.configService.get<string>('SMTP_PORT') || '587',
      10,
    );
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
    const ctx = await this.emailLayout.obtenerContexto();

    const fromEmail =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER') ||
      'admin@vortizarquitectos.com.mx';
    const fromName =
      this.configService.get<string>('SMTP_FROM_NAME') || ctx.negocio.nombre;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: opciones.destinatarios.join(', '),
      subject: `📊 Reporte ${ctx.negocio.nombre}: ${opciones.titulo}`,
      html: this.plantillaHTML(opciones, ctx),
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

  private plantillaHTML(
    opciones: { titulo: string; descripcion: string; rangoTexto: string },
    ctx: any,
  ): string {
    const caja = this.emailLayout.cotaPeriodo({
      label: 'Periodo analizado',
      valor: opciones.rangoTexto,
    });

    const adjunto = this.emailLayout.cajaDestacada({
      titulo: '📎 Archivo adjunto',
      variante: 'default',
      items: [{ label: 'Tipo', valor: 'Reporte ejecutivo · PDF' }],
    });

    const contenido = `
    <p style="margin: 0 0 16px;">
      Encuentras adjunto el <strong style="color: #0a4d7a;">reporte ejecutivo completo</strong> en formato PDF con todas las gráficas, métricas e insights del periodo analizado.
    </p>
    ${caja}
    ${adjunto}
    <p style="margin: 16px 0 0; color: #6b7a8c; font-size: 13px;">
      Cualquier comentario o requerimiento adicional, no dudes en responder a este correo directamente.
    </p>`;

    return this.emailLayout.layout({
      eyebrow: 'Reporte Ejecutivo',
      titulo: opciones.titulo,
      subtitulo: opciones.descripcion,
      contenido,
      ctx,
    });
  }
}
