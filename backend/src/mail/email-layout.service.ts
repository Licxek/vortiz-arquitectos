import { Injectable, Logger } from '@nestjs/common';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import * as fs from 'fs';

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
  apariencia: {
    colorPrimario: string;
    colorSecundario: string;
    logoBase64: string;
    logoFooterBase64: string;
  };
}

@Injectable()
export class EmailLayoutService {
  private readonly logger = new Logger(EmailLayoutService.name);

  constructor(private configuracionService: ConfiguracionService) {}

  /**
   * Obtiene el contexto dinámico para los correos:
   * negocio + contacto + apariencia (colores y logo base64).
   */
  async obtenerContexto(): Promise<EmailContext> {
    try {
      const config = await this.configuracionService.obtener();
      const negocio = config.negocio || {};
      const contacto = config.contacto || {};
      const apariencia = config.apariencia || {};

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
        apariencia: {
          colorPrimario: apariencia.colorPrimario || '#0a4d7a',
          colorSecundario: apariencia.colorSecundario || '#0a1f3d',
          logoBase64: this.cargarLogoBase64(apariencia.logoUrl),
          logoFooterBase64: this.cargarLogoBase64(apariencia.logoFooterUrl),
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
        apariencia: {
          colorPrimario: '#0a4d7a',
          colorSecundario: '#0a1f3d',
          logoBase64: '',
          logoFooterBase64: '',
        },
      };
    }
  }

  /**
   * Carga un logo desde /uploads/ como base64 data URI.
   * Si el URL apunta a /assets/ (frontend) o no existe, retorna ''.
   */
  private cargarLogoBase64(logoUrl?: string): string {
    if (!logoUrl) return '';
    if (!logoUrl.startsWith('/uploads/')) return '';

    const path = `/app${logoUrl}`;
    try {
      if (fs.existsSync(path)) {
        const buffer = fs.readFileSync(path);
        const ext = path.split('.').pop()?.toLowerCase() || 'png';
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
        return `data:${mime};base64,${buffer.toString('base64')}`;
      }
    } catch (err) {
      this.logger.warn(`No se pudo cargar logo de ${path}: ${err}`);
    }
    return '';
  }

  /**
   * Layout editorial unificado con colores dinámicos + logo + dark mode.
   */
  layout(opciones: {
    eyebrow: string;
    titulo: string;
    subtitulo?: string;
    contenido: string;
    ctx: EmailContext;
  }): string {
    const { eyebrow, titulo, subtitulo, contenido, ctx } = opciones;
    const fechaActual = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const cPrimary = ctx.apariencia.colorPrimario;
    const cSecondary = ctx.apariencia.colorSecundario;

    // Logo para hero (light bg): usa logoUrl regular
    // Logo para tech bar (dark bg): usa logoFooterUrl (versión clara)
    const logoHero = ctx.apariencia.logoBase64;
    const logoTechBar = ctx.apariencia.logoFooterBase64 || ctx.apariencia.logoBase64;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${this.escape(titulo)}</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      .vortiz-body { background-color: #0a1f3d !important; }
      .vortiz-card { background-color: #1a2e4a !important; border-color: #2a4060 !important; }
      .vortiz-text { color: #fbfaf7 !important; }
      .vortiz-text-muted { color: #c8d1dc !important; }
      .vortiz-paper-bg { background-color: #1f3554 !important; }
      .vortiz-line { border-color: #2a4060 !important; }
      .vortiz-title { color: #fbfaf7 !important; }
      .vortiz-disclaimer { color: #8d96a3 !important; }
      .vortiz-footer-bg { background-color: #1f3554 !important; }
    }
    /* Outlook.com dark mode */
    [data-ogsc] .vortiz-body { background-color: #0a1f3d !important; }
    [data-ogsc] .vortiz-card { background-color: #1a2e4a !important; }
    [data-ogsc] .vortiz-text { color: #fbfaf7 !important; }
    [data-ogsc] .vortiz-text-muted { color: #c8d1dc !important; }
    [data-ogsc] .vortiz-paper-bg { background-color: #1f3554 !important; }
    [data-ogsc] .vortiz-title { color: #fbfaf7 !important; }
  </style>
</head>
<body class="vortiz-body" style="margin: 0; padding: 0; background: #fbfaf7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

<table class="vortiz-body" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fbfaf7; padding: 40px 16px;">
  <tr>
    <td align="center">

      <!-- Container principal -->
      <table class="vortiz-card" role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width: 560px; width: 100%; background: #ffffff; border: 1px solid #e3e8ee;">

        <!-- Tech bar superior oscura -->
        <tr>
          <td style="background: ${cSecondary}; padding: 12px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="color: #fbfaf7; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                  ${
                    logoTechBar
                      ? `<img src="${logoTechBar}" alt="${this.escape(ctx.negocio.nombre)}" height="20" style="display: inline-block; height: 20px; vertical-align: middle;" />`
                      : this.escape(ctx.negocio.nombre)
                  }
                </td>
                <td align="right" style="color: #b8863a; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                  ${this.escape(eyebrow)}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${
          logoHero
            ? `
        <!-- Logo en hero (light bg) -->
        <tr>
          <td style="padding: 32px 32px 0;">
            <img src="${logoHero}" alt="${this.escape(ctx.negocio.nombre)}" height="44" style="display: block; height: 44px; max-width: 180px;" />
          </td>
        </tr>`
            : ''
        }

        <!-- Hero -->
        <tr>
          <td style="padding: ${logoHero ? '20px' : '48px'} 32px 32px;">
            <p style="margin: 0 0 16px; color: #b8863a; font-size: 11px; letter-spacing: 0.35em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ━━━ ${this.escape(eyebrow)}
            </p>
            <h1 class="vortiz-title" style="margin: 0 0 12px; font-family: Georgia, 'Times New Roman', serif; font-weight: 400; font-size: 30px; line-height: 1.1; color: ${cSecondary}; letter-spacing: -0.02em;">
              ${this.escape(titulo)}
            </h1>
            ${
              subtitulo
                ? `<p class="vortiz-text" style="margin: 0; font-family: Georgia, serif; font-style: italic; font-size: 15px; line-height: 1.5; color: #1a2e4a;">${this.escape(subtitulo)}</p>`
                : ''
            }
          </td>
        </tr>

        <!-- Contenido del correo -->
        <tr>
          <td class="vortiz-text" style="padding: 0 32px 32px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a2e4a;">
            ${contenido}
          </td>
        </tr>

        <!-- Bloque de contacto dinámico -->
        <tr>
          <td style="padding: 0 32px 32px;">
            <table class="vortiz-line" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 0.5px solid #c8d1dc; padding-top: 20px;">
              <tr>
                <td>
                  <p class="vortiz-text-muted" style="margin: 0 0 12px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Courier New', monospace;">
                    Para cualquier duda
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td class="vortiz-text" style="padding: 4px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a2e4a;">
                        <strong style="color: ${cPrimary};">WhatsApp:</strong>
                        ${
                          ctx.contacto.whatsappUrl
                            ? `<a href="${ctx.contacto.whatsappUrl}" class="vortiz-text" style="color: #1a2e4a; text-decoration: none;">${this.escape(ctx.contacto.whatsapp)}</a>`
                            : this.escape(ctx.contacto.whatsapp)
                        }
                      </td>
                    </tr>
                    <tr>
                      <td class="vortiz-text" style="padding: 4px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a2e4a;">
                        <strong style="color: ${cPrimary};">Teléfono:</strong> ${this.escape(ctx.contacto.telefono)}
                      </td>
                    </tr>
                    <tr>
                      <td class="vortiz-text" style="padding: 4px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a2e4a;">
                        <strong style="color: ${cPrimary};">Correo:</strong>
                        <a href="mailto:${this.escape(ctx.contacto.correoPublico)}" class="vortiz-text" style="color: #1a2e4a; text-decoration: none;">${this.escape(ctx.contacto.correoPublico)}</a>
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
          <td class="vortiz-footer-bg vortiz-line" style="background: #fbfaf7; border-top: 0.5px solid #c8d1dc; padding: 20px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="color: ${cPrimary}; font-size: 11px; font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 0.2em;">
                  ${this.escape(ctx.negocio.nombre.split(' ')[0].toUpperCase())}
                </td>
                <td align="right" class="vortiz-text-muted" style="color: #6b7a8c; font-size: 9px; font-family: 'Courier New', monospace; letter-spacing: 0.15em; text-transform: uppercase;">
                  ${this.escape(fechaActual)}
                </td>
              </tr>
              <tr>
                <td colspan="2" class="vortiz-text-muted" style="padding-top: 8px; color: #6b7a8c; font-size: 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.5;">
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
          <td align="center" class="vortiz-disclaimer" style="color: #8d96a3; font-size: 11px; line-height: 1.5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
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
   * Caja destacada con borde lateral semántico.
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
          <td class="vortiz-text" style="padding: 6px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a2e4a; vertical-align: top; width: 130px;">
            <strong style="color: ${c.titulo};">${this.escape(item.label)}</strong>
          </td>
          <td class="vortiz-text" style="padding: 6px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1a2e4a;">
            ${this.escape(item.valor)}
          </td>
        </tr>`,
      )
      .join('');

    return `
      <table class="vortiz-paper-bg" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fbfaf7; border-left: 3px solid ${c.borde}; padding: 18px 22px; margin: 20px 0;">
        <tr>
          <td>
            <p class="vortiz-text-muted" style="margin: 0 0 10px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
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
   * Caja gris suave para mensajes del cliente (referencia subordinada).
   */
  cajaMensaje(label: string, mensaje: string): string {
    return `
      <table class="vortiz-paper-bg" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f3f4f6; border-radius: 6px; padding: 14px 18px; margin: 16px 0;">
        <tr>
          <td>
            <p class="vortiz-text-muted" style="margin: 0 0 6px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ${this.escape(label)}
            </p>
            <p class="vortiz-text" style="margin: 0; font-family: Georgia, serif; font-style: italic; font-size: 13px; line-height: 1.5; color: #1a2e4a;">
              ${this.escape(mensaje)}
            </p>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Cota de período arquitectónica para fechas/horas.
   */
  cotaPeriodo(opciones: { label: string; valor: string }): string {
    return `
      <table class="vortiz-line" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 0.5px solid #c8d1dc; border-bottom: 0.5px solid #c8d1dc; padding: 18px 0; margin: 18px 0;">
        <tr>
          <td>
            <p class="vortiz-text-muted" style="margin: 0 0 6px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ${this.escape(opciones.label)}
            </p>
            <p class="vortiz-text" style="margin: 0; font-family: Georgia, serif; font-size: 16px; color: #0a1f3d;">
              ${this.escape(opciones.valor)}
            </p>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Caja especial para códigos de verificación.
   */
  cajaCodigo(opciones: { codigo: string; label?: string }): string {
    const label = opciones.label || 'Tu código';
    return `
      <table class="vortiz-paper-bg" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fbfaf7; border-left: 3px solid #b8863a; padding: 22px 24px; margin: 24px 0;">
        <tr>
          <td align="center">
            <p class="vortiz-text-muted" style="margin: 0 0 14px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ${this.escape(label)}
            </p>
            <p class="vortiz-text" style="margin: 0; font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.4em; color: #0a1f3d; line-height: 1.1;">
              ${this.escape(opciones.codigo)}
            </p>
          </td>
        </tr>
      </table>`;
  }

  /**
   * Botón CTA editorial. Acepta apariencia opcional para usar colorPrimario dinámico.
   */
  botonCta(opciones: {
    url: string;
    texto: string;
    variante?: 'primary' | 'amber' | 'danger';
    apariencia?: { colorPrimario?: string };
  }): string {
    const variante = opciones.variante || 'primary';
    const primaryDinamico = opciones.apariencia?.colorPrimario || '#0a4d7a';
    const colores = {
      primary: { bg: primaryDinamico, text: '#ffffff' },
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
   * Caja de alerta para situaciones de seguridad.
   */
  alertaSeguridad(opciones: {
    titulo: string;
    items: { label: string; valor: string }[];
  }): string {
    const filas = opciones.items
      .map(
        (item) => `
        <tr>
          <td class="vortiz-text-muted vortiz-line" style="padding: 8px 0; border-bottom: 0.5px solid #e3e8ee; font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: #6b7a8c; vertical-align: top; width: 110px;">
            ${this.escape(item.label)}
          </td>
          <td class="vortiz-text vortiz-line" style="padding: 8px 0 8px 12px; border-bottom: 0.5px solid #e3e8ee; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #0a1f3d; font-weight: 500;">
            ${this.escape(item.valor)}
          </td>
        </tr>`,
      )
      .join('');

    return `
      <table class="vortiz-paper-bg vortiz-line" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fbfaf7; border: 0.5px solid #c8d1dc; padding: 20px 22px; margin: 22px 0;">
        <tr>
          <td>
            <p class="vortiz-text-muted" style="margin: 0 0 14px; color: #6b7a8c; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Courier New', monospace;">
              ${this.escape(opciones.titulo)}
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${filas}
            </table>
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
}