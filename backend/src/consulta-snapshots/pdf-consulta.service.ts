import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer-core';
import * as fs from 'fs';
import { ConsultaSnapshot } from './consulta-snapshot.entity';

@Injectable()
export class PdfConsultaService {
  private readonly logger = new Logger(PdfConsultaService.name);
  private browser: Browser | null = null;

  private resolveChromiumPath(): string {
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/lib/chromium/chromium',
    ].filter(Boolean) as string[];
    for (const p of candidates) if (fs.existsSync(p)) return p;
    throw new Error('Chromium binary not found.');
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) return this.browser;
    this.browser = await puppeteer.launch({
      executablePath: this.resolveChromiumPath(),
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    this.browser.on('disconnected', () => (this.browser = null));
    return this.browser;
  }

  async generarPdfDeSnapshot(snapshot: ConsultaSnapshot): Promise<Buffer> {
    const start = Date.now();
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      const html = this.construirHtml(snapshot);
      await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
      await page.evaluate(async () => await (document as any).fonts.ready);
      await new Promise((r) => setTimeout(r, 200));

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true,
      });

      this.logger.log(`PDF snapshot #${snapshot.id} generado en ${Date.now() - start}ms`);
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close().catch(() => {});
    }
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatearFecha(iso: string | Date): string {
    if (!iso) return '—';
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatearFechaCorta(iso: string | Date): string {
    if (!iso) return '—';
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    if (isNaN(d.getTime())) return String(iso);
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  }

  private motivoLabel(motivo: string): string {
    const map: Record<string, string> = {
      automatico_resuelto: 'Registrado al marcar como resuelta',
      automatico_archivado: 'Registrado al archivar la consulta',
      manual: 'Guardado manualmente por el arquitecto',
    };
    return map[motivo] || motivo;
  }

  private metodoLabel(metodo: string): string {
    const map: Record<string, string> = {
      email: 'Correo electrónico',
      whatsapp: 'WhatsApp',
      guardado: 'Nota interna',
      inbound: 'Respuesta del cliente',
    };
    return map[metodo] || 'Sin especificar';
  }

  private construirHtml(s: ConsultaSnapshot): string {
    const numeroSnapshot = `SNAP-${s.id.toString().padStart(6, '0')}`;
    const totalPaginas = Math.max(2, 1 + Math.ceil(s.mensajesSnapshot.length / 8));
    const fechaEmision = this.formatearFecha(s.createdAt);

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${numeroSnapshot}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300;9..144,400;9..144,500;9..144,700;144,400&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>${this.getCss()}</style>
</head>
<body>
${this.construirPortada(s, numeroSnapshot, fechaEmision, totalPaginas)}
${this.construirConversacion(s, numeroSnapshot, totalPaginas)}
</body>
</html>`;
  }

  private getCss(): string {
    return `
:root {
  --paper: #fbfaf7;
  --paper-grid: #e8eef4;
  --ink: #0a1f3d;
  --ink-soft: #1a2e4a;
  --blue: #0a4d7a;
  --blue-light: #4a7ca8;
  --amber: #b8863a;
  --success: #2d7a4f;
  --danger: #a83a2c;
  --line: #c8d1dc;
  --line-soft: #e3e8ee;
  --mute: #6b7a8c;
  --serif: 'Fraunces', Georgia, serif;
  --sans: 'Inter Tight', -apple-system, system-ui, sans-serif;
  --mono: 'JetBrains Mono', 'Courier New', monospace;
}
@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { background: var(--paper); color: var(--ink); font-family: var(--sans); }
.page {
  width: 210mm; height: 297mm; background: var(--paper);
  position: relative; overflow: hidden; page-break-after: always; break-after: page;
}
.page:last-child { page-break-after: auto; }
.brand-spine {
  position: absolute; left: 0; top: 0; bottom: 0; width: 28px;
  background: var(--ink); display: flex; align-items: center; justify-content: center;
}
.brand-spine span {
  transform: rotate(-90deg); white-space: nowrap;
  font-family: var(--mono); color: var(--paper);
  font-size: 8px; letter-spacing: 0.35em; text-transform: uppercase;
}
.tech-header {
  position: absolute; top: 0; left: 28px; right: 0; height: 40px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; border-bottom: 0.5px solid var(--line);
}
.tech-header .left, .tech-header .right {
  display: flex; gap: 16px;
  font-family: var(--mono); font-size: 8.5px; color: var(--mute);
  letter-spacing: 0.15em; text-transform: uppercase;
}
.tech-header .left .brand { color: var(--ink); font-weight: 700; }
.tech-header .dim { color: #b0bbc7; }
.tech-footer {
  position: absolute; bottom: 0; left: 28px; right: 0; height: 32px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; border-top: 0.5px solid var(--line);
  font-family: var(--mono); font-size: 8px; color: var(--mute);
  letter-spacing: 0.12em; text-transform: uppercase;
}
.tech-footer .pagination { color: var(--ink); font-weight: 500; }

/* ============ PORTADA ============ */
.cover { padding: 80px 60px 60px 88px; position: relative; }
.cover .eyebrow {
  font-family: var(--mono); font-size: 10px; color: var(--amber);
  letter-spacing: 0.4em; text-transform: uppercase; margin-bottom: 28px;
}
.cover .eyebrow::before {
  content: ''; display: inline-block; width: 24px; height: 1px;
  background: var(--amber); vertical-align: 4px; margin-right: 12px;
}
.cover .title {
  font-family: var(--serif); font-weight: 400; font-size: 52px;
  line-height: 0.95; letter-spacing: -0.02em; color: var(--ink);
  margin-bottom: 16px; max-width: 460px;
  font-variation-settings: 'opsz' 144, 'SOFT' 30;
}
.cover .title em {
  font-style: italic; font-weight: 300; color: var(--blue);
  font-variation-settings: 'opsz' 144, 'SOFT' 100;
}
.cover .subtitle {
  font-family: var(--serif); font-style: italic; font-weight: 300;
  font-size: 16px; color: var(--ink-soft); max-width: 380px;
  line-height: 1.5; margin-bottom: 40px;
}
.cover .client-block {
  margin-top: 50px; padding: 24px 28px;
  border-left: 3px solid var(--ink);
  background: rgba(232, 238, 244, 0.4);
}
.cover .client-block .label {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.3em;
  color: var(--mute); text-transform: uppercase; margin-bottom: 10px;
}
.cover .client-block .nombre {
  font-family: var(--serif); font-size: 32px; line-height: 1.1;
  font-weight: 400; color: var(--ink); letter-spacing: -0.02em; margin-bottom: 12px;
}
.cover .client-block .datos {
  display: flex; gap: 32px; font-family: var(--mono); font-size: 10px;
  color: var(--ink-soft); letter-spacing: 0.05em;
}
.cover .meta-strip {
  margin-top: 40px;
  display: grid; grid-template-columns: repeat(3, 1fr);
  border-top: 0.5px solid var(--line); border-bottom: 0.5px solid var(--line);
}
.cover .meta-strip .cell {
  padding: 16px 20px; border-right: 0.5px solid var(--line);
}
.cover .meta-strip .cell:last-child { border-right: none; }
.cover .meta-strip .lab {
  font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.3em;
  color: var(--mute); text-transform: uppercase; margin-bottom: 6px;
}
.cover .meta-strip .val {
  font-family: var(--serif); font-size: 22px; color: var(--ink);
  font-weight: 400; letter-spacing: -0.02em;
}
.cover .meta-strip .sub {
  font-family: var(--mono); font-size: 9px; color: var(--mute); margin-top: 2px;
}
.cover .disclaimer {
  margin-top: 50px; padding: 16px 20px;
  background: rgba(184, 134, 58, 0.08); border-left: 2px solid var(--amber);
  font-family: var(--serif); font-style: italic; font-size: 11px;
  color: var(--ink-soft); line-height: 1.5;
}

/* ============ CONVERSACIÓN ============ */
.page-content { padding: 60px 40px 60px 56px; position: relative; height: 100%; }
.section-marker {
  display: flex; align-items: baseline; gap: 14px; margin-bottom: 26px;
}
.section-marker .num {
  font-family: var(--mono); font-weight: 700; font-size: 32px;
  color: var(--ink); line-height: 1;
}
.section-marker .num::before {
  content: '/'; color: var(--amber); font-weight: 400; margin-right: 4px;
}
.section-marker .label {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.3em;
  text-transform: uppercase; color: var(--ink);
  border-bottom: 0.5px solid var(--line); padding-bottom: 4px; flex: 1;
}
.motivo-original {
  margin: 16px 0 24px; padding: 12px 16px;
  background: rgba(232, 238, 244, 0.5); border-radius: 2px;
  border-left: 2px solid var(--blue);
}
.motivo-original .lab {
  font-family: var(--mono); font-size: 8px; letter-spacing: 0.25em;
  color: var(--mute); text-transform: uppercase; margin-bottom: 6px;
}
.motivo-original .txt {
  font-family: var(--serif); font-style: italic; font-size: 12px;
  color: var(--ink-soft); line-height: 1.5;
}
.mensaje {
  margin: 14px 0; padding: 12px 16px 14px;
  background: var(--paper); border: 0.5px solid var(--line-soft);
  border-radius: 2px; page-break-inside: avoid;
}
.mensaje.admin { background: rgba(10, 77, 122, 0.04); border-color: rgba(10, 77, 122, 0.15); }
.mensaje .header {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 12px; margin-bottom: 8px;
  padding-bottom: 6px; border-bottom: 0.5px dotted var(--line-soft);
}
.mensaje .autor {
  font-family: var(--mono); font-size: 9px; font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink);
}
.mensaje.admin .autor { color: var(--blue); }
.mensaje .metodo {
  font-family: var(--mono); font-size: 8px; letter-spacing: 0.1em;
  color: var(--mute); font-style: italic;
}
.mensaje .fecha {
  font-family: var(--mono); font-size: 8.5px; color: var(--mute);
  letter-spacing: 0.05em;
}
.mensaje .texto {
  font-family: var(--sans); font-size: 11px; color: var(--ink-soft);
  line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;
}
.empty-msg {
  padding: 40px; text-align: center;
  font-family: var(--serif); font-style: italic;
  color: var(--mute); font-size: 13px;
}
`;
  }

  private construirPortada(
    s: ConsultaSnapshot,
    numeroSnapshot: string,
    fechaEmision: string,
    totalPaginas: number,
  ): string {
    return `
<div class="page">
  <div class="brand-spine"><span>Vortiz Arquitectos · Registro de Conversación · ${numeroSnapshot}</span></div>
  <div class="tech-header">
    <div class="left">
      <span class="brand">Vortiz</span>
      <span class="dim">/</span>
      <span>Arquitectos · Registro</span>
    </div>
    <div class="right">
      <span>${numeroSnapshot}</span>
      <span class="dim">/</span>
      <span>${this.formatearFechaCorta(s.createdAt)}</span>
    </div>
  </div>
  <div class="cover">
    <div class="eyebrow">Registro de Conversación · Inmutable</div>
    <h1 class="title">Historial de <em>consulta</em></h1>
    <p class="subtitle">Copia fiel del intercambio con el cliente para respaldo interno y trazabilidad de la relación comercial.</p>

    <div class="client-block">
      <div class="label">Datos del cliente</div>
      <div class="nombre">${this.escapeHtml(s.clienteSnapshot.nombre)}</div>
      <div class="datos">
        <span>✉ ${this.escapeHtml(s.clienteSnapshot.correo)}</span>
        <span>☎ ${this.escapeHtml(s.clienteSnapshot.telefono || '—')}</span>
      </div>
    </div>

    <div class="meta-strip">
      <div class="cell">
        <div class="lab">Servicio consultado</div>
        <div class="val">${this.escapeHtml(s.consultaSnapshot.servicio || 'General')}</div>
        <div class="sub">Categoría de la solicitud</div>
      </div>
      <div class="cell">
        <div class="lab">Mensajes registrados</div>
        <div class="val">${s.totalMensajes}</div>
        <div class="sub">Intercambios cliente-Vortiz</div>
      </div>
      <div class="cell">
        <div class="lab">Duración</div>
        <div class="val">${s.duracionDias || 0}</div>
        <div class="sub">Días desde la consulta original</div>
      </div>
    </div>

    <div class="disclaimer">
      <strong>Motivo del registro:</strong> ${this.motivoLabel(s.motivo)}. Este documento se generó el ${fechaEmision} y representa el estado exacto de la conversación en ese momento. Los mensajes no han sido alterados posteriormente.
    </div>
  </div>
  <div class="tech-footer">
    <span>Generado · ${fechaEmision}</span>
    <span class="pagination">Pág. 01 / ${String(totalPaginas).padStart(2, '0')}</span>
    <span>Esc. 1:1 · A4</span>
  </div>
</div>`;
  }

  private construirConversacion(
    s: ConsultaSnapshot,
    numeroSnapshot: string,
    totalPaginas: number,
  ): string {
    // Motivo original del cliente (mensaje inicial)
    const motivoHtml = s.consultaSnapshot.motivo
      ? `<div class="motivo-original">
          <div class="lab">Motivo original de la consulta</div>
          <div class="txt">${this.escapeHtml(s.consultaSnapshot.motivo)}</div>
        </div>`
      : '';

    // Mensajes
    let mensajesHtml = '';
    if (s.mensajesSnapshot.length === 0) {
      mensajesHtml = '<div class="empty-msg">Sin mensajes intercambiados en esta consulta.</div>';
    } else {
      mensajesHtml = s.mensajesSnapshot
        .map((m) => {
          const esAdmin = m.autor === 'admin';
          const nombreAutor = esAdmin ? 'Vortiz Arquitectos' : s.clienteSnapshot.nombre;
          const metodoHtml = esAdmin && m.metodo
            ? `<span class="metodo">vía ${this.escapeHtml(this.metodoLabel(m.metodo))}</span>`
            : '';
          return `
          <div class="mensaje ${esAdmin ? 'admin' : ''}">
            <div class="header">
              <div>
                <span class="autor">${this.escapeHtml(nombreAutor)}</span>
                ${metodoHtml}
              </div>
              <span class="fecha">${this.formatearFecha(m.createdAt)}</span>
            </div>
            <div class="texto">${this.escapeHtml(m.texto)}</div>
          </div>`;
        })
        .join('');
    }

    return `
<div class="page">
  <div class="brand-spine"><span>Vortiz Arquitectos · Registro de Conversación · ${numeroSnapshot}</span></div>
  <div class="tech-header">
    <div class="left">
      <span class="brand">Vortiz</span>
      <span class="dim">/</span>
      <span>${this.escapeHtml(s.clienteSnapshot.nombre)}</span>
    </div>
    <div class="right"><span>01 · Conversación</span></div>
  </div>
  <div class="page-content">
    <div class="section-marker">
      <span class="num">01</span>
      <span class="label">Conversación completa</span>
    </div>
    ${motivoHtml}
    ${mensajesHtml}
  </div>
  <div class="tech-footer">
    <span>Vortiz Arquitectos · Registro Inmutable</span>
    <span class="pagination">Pág. 02 / ${String(totalPaginas).padStart(2, '0')}</span>
    <span>${numeroSnapshot}</span>
  </div>
</div>`;
  }
}