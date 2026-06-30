import { Injectable, Logger } from '@nestjs/common';
import { ConfiguracionService } from '../configuracion/configuracion.service';

export interface EmailContext {
  negocio: {
    nombre: string;
    eslogan: string;
    direccionCompleta: string;
  };
  contacto: {
    telefono: string;
    whatsapp: string;
    whatsappUrl: string;
    correoPublico: string;
  };
}

@Injectable()
export class EmailLayoutService {
  private readonly logger = new Logger(EmailLayoutService.name);

  constructor(private configuracionService: ConfiguracionService) {}

  /**
   * Obtiene el contexto dinámico de configuración para los correos.
   * Si algún campo falta, usa fallbacks razonables.
   */
  async obtenerContexto(): Promise<EmailContext> {
    try {
      const config = await this.configuracionService.obtener();
      const negocio = config.negocio || {};
      const contacto = config.contacto || {};

      const direccionPartes = [
        negocio.direccion,
        negocio.ciudad,
        negocio.estado,
        negocio.codigoPostal,
      ].filter((p) => p && String(p).trim().length > 0);

      const whatsappRaw = (contacto.whatsapp || '').replace(/\D/g, '');
      const whatsappUrl = whatsappRaw ? `https://wa.me/${whatsappRaw}` : '';

      return {
        negocio: {
          nombre: negocio.nombre || 'Vortiz Arquitectos',
          eslogan: negocio.eslogan || 'Diseñamos espacios, construimos confianza',
          direccionCompleta:
            direccionPartes.length > 0
              ? direccionPartes.join(', ')
              : 'Milpillas 101, La Forestal, Durango',
        },
        contacto: {
          telefono: contacto.telefono || '+52 618 000 0000',
          whatsapp: contacto.whatsapp || '618 000 0000',
          whatsappUrl,
          correoPublico: contacto.correoPublico || 'contacto@vortizarquitectos.com.mx',
        },
      };
    } catch (err: any) {
      this.logger.warn(`No se pudo cargar config, usando fallbacks: ${err.message}`);
      return {
        negocio: {
          nombre: 'Vortiz Arquitectos',
          eslogan: 'Diseñamos espacios, construimos confianza',
          direccionCompleta: 'Milpillas 101, La Forestal, Durango',
        },
        contacto: {
          telefono: '+52 618 000 0000',
          whatsapp: '618 000 0000',
          whatsappUrl: '',
          correoPublico: 'contacto@vortizarquitectos.com.mx',
        },
      };
    }
  }

  /**
   * Layout editorial + arquitectura compartido para todos los correos
   * de Vortiz. Usa los mismos colores y tipografía que el PDF.
   */
  layout(opciones: {
    eyebrow: string; // texto pequeño arriba en mono ámbar
    titulo: string; // título grande serif
    subtitulo?: string; // subtítulo italic serif
    contenido: string; // HTML del cuerpo
    ctx: EmailContext;
  }): string {
    const { eyebrow, titulo, subtitulo, contenido, ctx } = opciones;
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
  <title>${this.escape(titulo)}</title>
</head>
<body style="margin: 0; padding: 0; background: #fbfaf7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fbfaf7; padding: 40px 16px;">
  <tr>
    <td align="center">

      <!-- Container principal -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width: 560px; width: 100%; background: #ffffff; border: 1px solid #e3e8ee;">

        <!-- Tech bar superior oscura -->
        <tr>
          <td style="background: #0a1f3d; padding: 12px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="color: #fbfaf7; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                  ${this.escape(ctx.negocio.nombre)}
                </td>
                <td align="right" style="color: #b8863a; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                  ${this.escape(eyebrow)}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding: 48px 32px 32px;">
            <p style="margin: 0 0 16px; color: #b8863a; font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ━━━ ${this.escape(eyebrow)}
            </p>
            <h1 style="margin: 0 0 12px; font-family: Georgia, 'Times New Roman', serif; font-weight: 400; font-size: 30px; line-height: 1.1; color: #0a1f3d; letter-spacing: -0.02em;">
              ${this.escape(titulo)}
            </h1>
            ${
              subtitulo
                ? `<p style="margin: 0; font-family: Georgia, serif; font-style: italic; font-size: 15px; line-height: 1.5; color: #1a2e4a;">${this.escape(subtitulo)}</p>`
                : ''
            }
          </td>
        </tr>

        <!-- Contenido del correo -->
        <tr>
          <td style="padding: 0 32px 32px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a2e4a;">
            ${contenido}
          </td>
        </tr>

        <!-- Bloque de contacto dinámico (siempre presente) -->
        <tr>
          <td style="padding: 0 32px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 0.5px solid #c8d1dc; padding-top: 20px;">
              <tr>
                <td>
                  <p style="margin: 0 0 12px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                    Para cualquier duda
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding: 4px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a2e4a;">
                        <strong style="color: #0a4d7a;">WhatsApp:</strong>
                        ${
                          ctx.contacto.whatsappUrl
                            ? `<a href="${ctx.contacto.whatsappUrl}" style="color: #1a2e4a; text-decoration: none;">${this.escape(ctx.contacto.whatsapp)}</a>`
                            : this.escape(ctx.contacto.whatsapp)
                        }
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a2e4a;">
                        <strong style="color: #0a4d7a;">Teléfono:</strong> ${this.escape(ctx.contacto.telefono)}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a2e4a;">
                        <strong style="color: #0a4d7a;">Correo:</strong>
                        <a href="mailto:${this.escape(ctx.contacto.correoPublico)}" style="color: #1a2e4a; text-decoration: none;">${this.escape(ctx.contacto.correoPublico)}</a>
                      </td>
                    </tr>
                  </table>
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
                  ${this.escape(fechaActual)}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top: 8px; color: #6b7a8c; font-size: 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.5;">
                  ${this.escape(ctx.negocio.direccionCompleta)}
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
            Correo enviado por ${this.escape(ctx.negocio.nombre)} · <br>
            Si no esperabas este mensaje, responde y avísanos.
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>

</body>
</html>`;
  }

  /**
   * Caja destacada con borde lateral ámbar — para datos importantes
   * tipo "esto es lo que tu cita registrada"
   */
  cajaDestacada(opciones: {
    titulo: string;
    items: { label: string; valor: string }[];
    variante?: 'default' | 'success' | 'warning' | 'danger';
  }): string {
    const variante = opciones.variante || 'default';
    const colores = {
      default: { borde: '#b8863a', titulo: '#0a4d7a' },
      success: { borde: '#2d7a4f', titulo: '#2d7a4f' },
      warning: { borde: '#d9a85f', titulo: '#b8863a' },
      danger: { borde: '#a83a2c', titulo: '#a83a2c' },
    };
    const c = colores[variante];

    const filas = opciones.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 6px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a2e4a; vertical-align: top; width: 130px;">
            <strong style="color: ${c.titulo};">${this.escape(item.label)}</strong>
          </td>
          <td style="padding: 6px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a2e4a;">
            ${this.escape(item.valor)}
          </td>
        </tr>`,
      )
      .join('');

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fbfaf7; border-left: 3px solid ${c.borde}; padding: 18px 22px; margin: 20px 0;">
        <tr>
          <td>
            <p style="margin: 0 0 10px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ${this.escape(opciones.titulo)}
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${filas}
            </table>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Caja gris suave para mostrar el mensaje del cliente
   */
  cajaMensaje(label: string, mensaje: string): string {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f3f4f6; border-radius: 6px; padding: 14px 18px; margin: 16px 0;">
        <tr>
          <td>
            <p style="margin: 0 0 6px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ${this.escape(label)}
            </p>
            <p style="margin: 0; font-family: Georgia, serif; font-style: italic; font-size: 13px; line-height: 1.5; color: #1a2e4a;">
              ${this.escape(mensaje)}
            </p>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Cota de período arquitectónica para fechas/horas
   */
  cotaPeriodo(opciones: {
    label: string;
    valor: string;
  }): string {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 0.5px solid #c8d1dc; border-bottom: 0.5px solid #c8d1dc; padding: 18px 0; margin: 18px 0;">
        <tr>
          <td>
            <p style="margin: 0 0 6px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ${this.escape(opciones.label)}
            </p>
            <p style="margin: 0; font-family: Georgia, serif; font-size: 16px; color: #0a1f3d;">
              ${this.escape(opciones.valor)}
            </p>
          </td>
        </tr>
      </table>`;
  }

  escape(text: string): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Caja especial para códigos de verificación / recuperación.
   * Renderiza el código grande en monospace con letter-spacing amplio.
   */
  cajaCodigo(opciones: { codigo: string; label?: string }): string {
    const label = opciones.label || 'Tu código';
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fbfaf7; border-left: 3px solid #b8863a; padding: 22px 24px; margin: 24px 0;">
        <tr>
          <td align="center">
            <p style="margin: 0 0 14px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ${this.escape(label)}
            </p>
            <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.4em; color: #0a1f3d; line-height: 1.1;">
              ${this.escape(opciones.codigo)}
            </p>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Botón CTA editorial — para acciones primarias como "Revisar mi cuenta"
   */
  botonCta(opciones: {
    url: string;
    texto: string;
    variante?: 'primary' | 'amber' | 'danger';
  }): string {
    const variante = opciones.variante || 'primary';
    const colores = {
      primary: { bg: '#0a4d7a', text: '#ffffff' },
      amber: { bg: '#b8863a', text: '#ffffff' },
      danger: { bg: '#a83a2c', text: '#ffffff' },
    };
    const c = colores[variante];

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
        <tr>
          <td align="center">
            <a href="${this.escape(opciones.url)}" target="_blank" style="display: inline-block; padding: 14px 36px; background: ${c.bg}; color: ${c.text}; text-decoration: none; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">
              ${this.escape(opciones.texto)}
            </a>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Caja de alerta para situaciones de seguridad / dispositivos nuevos.
   * Estilo más serio que cajaDestacada — con icono y mensaje doble (¿fuiste tú? / ¿no?)
   */
  alertaSeguridad(opciones: {
    titulo: string;
    items: { label: string; valor: string }[];
  }): string {
    const filas = opciones.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 0.5px solid #e3e8ee; font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: #6b7a8c; vertical-align: top; width: 110px;">
            ${this.escape(item.label)}
          </td>
          <td style="padding: 8px 0 8px 12px; border-bottom: 0.5px solid #e3e8ee; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #0a1f3d; font-weight: 500;">
            ${this.escape(item.valor)}
          </td>
        </tr>`,
      )
      .join('');

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fbfaf7; border: 0.5px solid #c8d1dc; padding: 20px 22px; margin: 22px 0;">
        <tr>
          <td>
            <p style="margin: 0 0 14px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ${this.escape(opciones.titulo)}
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${filas}
            </table>
          </td>
        </tr>
      </table>`;
  }
}