import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer-core';
import * as fs from 'fs';

@Injectable()
export class PdfReportesService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfReportesService.name);
  private browser: Browser | null = null;
  private readonly LOGO_PATH = '/app/uploads/marca/logo.png';

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  // ============================================================
  // RESOLUCIÓN DE BROWSER (singleton reutilizable)
  // ============================================================

  private resolveChromiumPath(): string {
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/lib/chromium/chromium',
    ].filter(Boolean) as string[];

    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error(
      'Chromium binary not found. Verifica que apk install chromium se haya ejecutado en el Dockerfile.',
    );
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    this.logger.log('Iniciando instancia de Chromium...');
    this.browser = await puppeteer.launch({
      executablePath: this.resolveChromiumPath(),
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    this.browser.on('disconnected', () => {
      this.logger.warn('Browser disconnected, se reiniciará al próximo uso.');
      this.browser = null;
    });

    return this.browser;
  }

  // ============================================================
  // MÉTODO PRINCIPAL
  // ============================================================

  async generarReportePDF(
    detalle: any,
    titulo: string,
    descripcion: string,
  ): Promise<Buffer> {
    const start = Date.now();
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      const html = this.construirHtml(detalle, titulo, descripcion);

      await page.setContent(html, {
        waitUntil: 'load',
        timeout: 30000,
      });

      // Esperar a que las fuentes estén listas
      await page.evaluate(async () => {
        await (document as any).fonts.ready;
      });

      // Pequeña pausa para que SVG y rendering final estabilicen
      await new Promise((r) => setTimeout(r, 200));

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true,
      });

      const elapsed = Date.now() - start;
      this.logger.log(
        `PDF generado en ${elapsed}ms · ${(pdfBuffer.length / 1024).toFixed(0)}KB`,
      );

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close().catch(() => {});
    }
  }

  // ============================================================
  // CONSTRUCCIÓN DEL HTML
  // ============================================================

  private construirHtml(
    detalle: any,
    titulo: string,
    descripcion: string,
  ): string {
    const reporteNumero = this.generarNumeroReporte();
    const totalDias = this.calcularDias(
      detalle.rango.desde,
      detalle.rango.hasta,
    );
    const fechaGeneracion = this.formatearFechaCorta(new Date());
    const logoSrc = this.cargarLogoBase64();

    // Total páginas (4 fijas: portada + resumen + visualización + detalle)
    const totalPaginas = 4;

    const ctx = {
      detalle,
      titulo: this.escapeHtml(titulo),
      descripcion: this.escapeHtml(descripcion),
      reporteNumero,
      totalDias,
      totalPaginas,
      fechaGeneracion,
      logoSrc,
    };

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${ctx.titulo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300;9..144,400;9..144,500;9..144,700;144,400&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>${this.getCss()}</style>
</head>
<body>
${this.construirPortada(ctx)}
${this.construirResumen(ctx)}
${this.construirVisualizacion(ctx)}
${this.construirDetalle(ctx)}
</body>
</html>`;
  }

  // ============================================================
  // CSS
  // ============================================================

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
  --amber-soft: #d9a85f;
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
  width: 210mm;
  height: 297mm;
  background: var(--paper);
  position: relative;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.page:last-child { page-break-after: auto; }
.brand-spine {
  position: absolute; left: 0; top: 0; bottom: 0; width: 28px;
  background: var(--ink);
  display: flex; align-items: center; justify-content: center;
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
  font-family: var(--serif); font-weight: 400; font-size: 56px;
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
  line-height: 1.5; margin-bottom: 60px;
}
.cover .hero-data {
  position: relative; margin-top: 40px; margin-bottom: 50px; padding: 30px 0;
}
.cover .hero-data::before {
  content: ''; position: absolute; left: -20px; top: 0; bottom: 0;
  width: 1px; background: var(--ink);
}
.cover .hero-label {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.3em;
  color: var(--mute); text-transform: uppercase; margin-bottom: 6px;
}
.cover .hero-number {
  font-family: var(--serif); font-size: 132px; line-height: 1;
  font-weight: 300; color: var(--ink); letter-spacing: -0.04em;
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  font-variation-settings: 'opsz' 144;
}
.cover .hero-number .unit {
  font-family: var(--serif); font-style: italic; font-size: 22px;
  color: var(--blue); font-weight: 400; line-height: 1.2;
  margin-top: 4px; letter-spacing: -0.01em;
}
.cover .hero-meta {
  display: flex; gap: 32px; margin-top: 12px;
  font-family: var(--mono); font-size: 10px; color: var(--ink);
  letter-spacing: 0.05em;
}
.cover .hero-meta .chip { display: inline-flex; align-items: center; gap: 6px; }
.cover .hero-meta .dot { width: 6px; height: 6px; border-radius: 50%; }
.cover .hero-meta .dot.up { background: var(--success); }
.cover .hero-meta .dot.down { background: var(--danger); }
.cover .hero-meta .pos { color: var(--success); font-weight: 500; }
.cover .hero-meta .neg { color: var(--danger); font-weight: 500; }
.cover .periodo-cota { margin-top: 60px; position: relative; padding: 24px 0; }
.cover .periodo-cota .label {
  font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.3em;
  color: var(--mute); text-transform: uppercase; margin-bottom: 12px;
}
.cover .periodo-cota .cota {
  display: flex; align-items: center; gap: 14px;
  font-family: var(--serif); font-size: 16px; color: var(--ink);
}
.cover .periodo-cota .cota .line {
  flex: 1; height: 1px; background: var(--ink); position: relative;
}
.cover .periodo-cota .cota .line::before,
.cover .periodo-cota .cota .line::after {
  content: ''; position: absolute; top: -3px;
  width: 1px; height: 7px; background: var(--ink);
}
.cover .periodo-cota .cota .line::before { left: 0; }
.cover .periodo-cota .cota .line::after { right: 0; }
.cover .periodo-cota .cota .duration {
  font-family: var(--mono); font-size: 9px; background: var(--paper);
  padding: 0 6px; position: absolute; top: -8px; left: 50%;
  transform: translateX(-50%); color: var(--mute); letter-spacing: 0.1em;
}

/* ============ CONTENT PAGES ============ */
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
.section-marker .scale {
  font-family: var(--mono); font-size: 8.5px; color: var(--mute);
  letter-spacing: 0.15em;
}
.pullquote {
  margin: 20px 0 36px; padding: 8px 0 8px 20px;
  border-left: 1.5px solid var(--amber);
  font-family: var(--serif); font-style: italic; font-weight: 300;
  font-size: 22px; line-height: 1.3; color: var(--ink-soft);
  letter-spacing: -0.01em;
  font-variation-settings: 'opsz' 48, 'SOFT' 50;
}
.pullquote strong { font-style: normal; font-weight: 500; color: var(--blue); }
.pullquote .pos { font-style: normal; font-weight: 500; color: var(--success); }
.pullquote .neg { font-style: normal; font-weight: 500; color: var(--danger); }

/* KPI Grid */
.kpi-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  border-top: 0.5px solid var(--line);
  border-left: 0.5px solid var(--line);
}
.kpi {
  border-right: 0.5px solid var(--line);
  border-bottom: 0.5px solid var(--line);
  padding: 20px 18px 18px; position: relative; background: var(--paper);
}
.kpi .top-line { position: absolute; top: 0; left: 0; width: 32px; height: 2px; }
.kpi.kpi-1 .top-line { background: var(--blue); }
.kpi.kpi-2 .top-line { background: var(--blue-light); }
.kpi.kpi-3 .top-line { background: var(--success); }
.kpi.kpi-3.is-negative .top-line { background: var(--danger); }
.kpi.kpi-4 .top-line { background: var(--amber); }
.kpi .label {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.25em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 12px;
}
.kpi .number {
  font-family: var(--serif); font-weight: 400; font-size: 48px;
  line-height: 1; color: var(--ink); letter-spacing: -0.03em;
  margin-bottom: 6px;
  font-variation-settings: 'opsz' 96;
}
.kpi .number.small { font-size: 28px; line-height: 1.1; }
.kpi .number .pos { color: var(--success); }
.kpi .number .neg { color: var(--danger); }
.kpi .meta {
  font-family: var(--mono); font-size: 9.5px; color: var(--mute);
  letter-spacing: 0.05em;
}
.sparkline { width: 100%; height: 28px; margin-top: 10px; }
.sparkline svg { width: 100%; height: 100%; display: block; }
.kpi::before, .kpi::after {
  content: ''; position: absolute; width: 6px; height: 6px;
}
.kpi::before { top: 12px; right: 12px; border-right: 0.5px solid var(--line); border-top: 0.5px solid var(--line); }
.kpi::after { bottom: 12px; right: 12px; border-right: 0.5px solid var(--line); border-bottom: 0.5px solid var(--line); }

.closing-note {
  margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
}
.closing-note .nota {
  font-family: var(--sans); font-size: 10.5px; line-height: 1.6;
  color: var(--ink-soft);
}
.closing-note .nota .heading {
  font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 6px;
}

/* ============ CHART ============ */
.chart-wrap {
  margin-top: 24px; padding: 20px 12px 12px; position: relative;
  background:
    linear-gradient(to right, var(--paper-grid) 0.5px, transparent 0.5px) 0 0 / 60px 100%,
    linear-gradient(to bottom, var(--paper-grid) 0.5px, transparent 0.5px) 0 0 / 100% 32px,
    var(--paper);
  background-clip: padding-box;
  border: 0.5px solid var(--line);
}
.chart-meta {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
  font-family: var(--mono); font-size: 8.5px; color: var(--mute);
  letter-spacing: 0.1em; text-transform: uppercase;
}
.chart-meta .scale-label { color: var(--amber); font-weight: 500; }
.chart-svg { width: 100%; height: 280px; display: block; }
.chart-caption {
  margin-top: 14px;
  font-family: var(--serif); font-style: italic; font-weight: 300;
  font-size: 12.5px; line-height: 1.5; color: var(--ink-soft);
}
.chart-caption strong { font-style: normal; font-weight: 500; color: var(--blue); }
.period-comparison {
  margin-top: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
  border-top: 0.5px solid var(--line);
}
.period-comparison .cell {
  padding: 14px 16px; border-right: 0.5px solid var(--line);
}
.period-comparison .cell:last-child { border-right: none; }
.period-comparison .cell .lab {
  font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--mute); margin-bottom: 4px;
}
.period-comparison .cell .val {
  font-family: var(--serif); font-size: 22px; color: var(--ink);
  font-weight: 400; letter-spacing: -0.02em;
}
.period-comparison .cell .val.pos { color: var(--success); }
.period-comparison .cell .val.neg { color: var(--danger); }
.period-comparison .cell .sub {
  font-family: var(--mono); font-size: 9px; color: var(--mute); margin-top: 2px;
}

/* ============ DETAIL TABLE ============ */
.detail-intro {
  margin-bottom: 20px;
  font-family: var(--serif); font-style: italic; font-weight: 300;
  font-size: 14px; line-height: 1.5; color: var(--ink-soft);
  max-width: 460px;
}
table.detail {
  width: 100%; border-collapse: collapse; margin-top: 12px;
  table-layout: fixed;
}
table.detail col.col-month { width: 38%; }
table.detail col.col-value { width: 14%; }
table.detail col.col-bar { width: 30%; }
table.detail col.col-delta { width: 18%; }
table.detail thead th {
  font-family: var(--mono); font-size: 8px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--mute); text-align: left;
  padding: 10px 8px; border-bottom: 1px solid var(--ink); font-weight: 500;
}
table.detail thead th.r { text-align: right; }
table.detail tbody td {
  padding: 10px 8px; border-bottom: 0.5px solid var(--line-soft);
  vertical-align: middle; font-size: 11px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
table.detail tbody tr.zebra { background: rgba(232, 238, 244, 0.4); }
table.detail tbody td.month {
  font-family: var(--serif); font-size: 14px; color: var(--ink);
  font-weight: 400; letter-spacing: -0.01em;
}
table.detail tbody td.value {
  font-family: var(--mono); font-size: 11px; color: var(--ink);
  text-align: right; font-weight: 500;
}
table.detail tbody td.delta {
  font-family: var(--mono); font-size: 10px; text-align: right;
  font-weight: 500; letter-spacing: 0.02em;
}
table.detail tbody td.delta.up { color: var(--success); }
table.detail tbody td.delta.down { color: var(--danger); }
table.detail tbody td.delta.neutral { color: var(--mute); }
.mini-bar {
  display: flex; align-items: center; gap: 8px; justify-content: flex-end;
  width: 100%;
}
.mini-bar .bar-track {
  width: 100%; max-width: 110px; height: 6px;
  background: var(--line-soft); position: relative; flex-shrink: 0;
}
.mini-bar .bar-fill {
  position: absolute; top: 0; left: 0; height: 100%; background: var(--blue);
}
.mini-bar .bar-fill.amber { background: var(--amber); }
.mini-bar .bar-fill.dark { background: var(--ink); }
table.detail tbody tr.highlight td.month::before {
  content: '★'; color: var(--amber); font-size: 10px; margin-right: 6px;
}
table.detail tbody tr.highlight td.month {
  color: var(--ink); font-weight: 500;
}
table.detail tfoot td {
  padding: 14px 12px; border-top: 1px solid var(--ink);
  font-family: var(--mono); font-size: 10px; text-transform: uppercase;
  letter-spacing: 0.2em; color: var(--ink); font-weight: 500;
}
table.detail tfoot td.value {
  font-family: var(--serif); font-size: 18px; text-transform: none;
  letter-spacing: -0.02em; text-align: right; font-weight: 400;
}
table.detail tfoot td.value.pos { color: var(--success); }
table.detail tfoot td.value.neg { color: var(--danger); }
`;
  }

  // ============================================================
  // PORTADA
  // ============================================================

  private construirPortada(ctx: any): string {
    const { detalle, titulo, descripcion, totalDias, totalPaginas, reporteNumero } = ctx;
    const { insights, unidad } = detalle;

    const tituloHtml = this.aplicarEnfasisEnTitulo(titulo);
    const cambio = Number(insights.cambio || 0);
    const totalAnterior = insights.totalAnterior || 0;
    const promedio = insights.promedio || 0;
    const mesActual = new Date()
      .toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })
      .replace('.', '');

    const cambioCls = cambio >= 0 ? 'pos' : 'neg';
    const cambioDot = cambio >= 0 ? 'up' : 'down';
    const cambioSign = cambio >= 0 ? '+' : '';

    return `
<div class="page">
  <div class="brand-spine"><span>Vortiz Arquitectos · Reporte Ejecutivo · Nº ${reporteNumero}</span></div>
  <div class="tech-header">
    <div class="left">
      <span class="brand">Vortiz</span>
      <span class="dim">/</span>
      <span>Arquitectos · Consultoría</span>
    </div>
    <div class="right">
      <span>Reporte Nº ${reporteNumero}</span>
      <span class="dim">/</span>
      <span>${mesActual}</span>
    </div>
  </div>
  <div class="cover">
    <div class="eyebrow">Reporte Ejecutivo · Edición ${mesActual}</div>
    <h1 class="title">${tituloHtml}</h1>
    <p class="subtitle">${descripcion}</p>
    <div class="hero-data">
      <div class="hero-label">Total del periodo</div>
      <div class="hero-number">
        ${insights.total}
        <span class="unit">${this.escapeHtml(unidad)} ${this.unidadVerbo(unidad)}</span>
      </div>
      <div class="hero-meta">
        <span class="chip">
          <span class="dot ${cambioDot}"></span>
          <span class="${cambioCls}">${cambioSign}${cambio}%</span> vs periodo anterior (${totalAnterior})
        </span>
        <span class="chip">${promedio} ${unidad} / promedio</span>
      </div>
    </div>
    <div class="periodo-cota">
      <div class="label">Periodo analizado · Escala temporal</div>
      <div class="cota">
        <span>${this.formatearFechaCorta(detalle.rango.desde)}</span>
        <div class="line">
          <span class="duration">${totalDias} ${totalDias === 1 ? 'DÍA' : 'DÍAS'}</span>
        </div>
        <span>${this.formatearFechaCorta(detalle.rango.hasta)}</span>
      </div>
    </div>
  </div>
  <div class="tech-footer">
    <span>Generado · ${ctx.fechaGeneracion}</span>
    <span class="pagination">Pág. 01 / ${String(totalPaginas).padStart(2, '0')}</span>
    <span>Esc. 1:1 · A4</span>
  </div>
</div>`;
  }

  // ============================================================
  // PÁGINA 2: RESUMEN
  // ============================================================

  private construirResumen(ctx: any): string {
    const { detalle, titulo, totalPaginas, reporteNumero } = ctx;
    const { insights, unidad } = detalle;

    const cambio = Number(insights.cambio || 0);
    const cambioCls = cambio >= 0 ? 'pos' : 'neg';
    const cambioSign = cambio >= 0 ? '+' : '';
    const cambioTexto = cambio >= 0 ? 'crecimiento' : 'contracción';

    // Construir las 4 KPI cards
    const sparkSerie = (detalle.serie || []).map((s: any) => s.valor);
    const sparkActual = this.sparklineLinea(sparkSerie, '#0a4d7a');
    const sparkPromedio = this.sparklinePromedio(sparkSerie, '#4a7ca8');
    const sparkCambio = this.sparklineCambio(cambio);
    const sparkMejor = this.sparklineBarras(sparkSerie);

    const mejorLabel = insights.mejor?.label || '—';
    const mejorValor = insights.mejor?.valor || 0;

    const pullquote = this.construirPullquote(insights, unidad);

    const observaciones = this.construirObservaciones(detalle);

    return `
<div class="page">
  <div class="brand-spine"><span>Vortiz Arquitectos · Reporte Ejecutivo · Nº ${reporteNumero}</span></div>
  <div class="tech-header">
    <div class="left">
      <span class="brand">Vortiz</span>
      <span class="dim">/</span>
      <span>${titulo}</span>
    </div>
    <div class="right"><span>01 · Resumen</span></div>
  </div>
  <div class="page-content">
    <div class="section-marker">
      <span class="num">01</span>
      <span class="label">Resumen ejecutivo</span>
      <span class="scale">Esc. 1:50</span>
    </div>
    <div class="pullquote">${pullquote}</div>
    <div class="kpi-grid">
      <div class="kpi kpi-1">
        <span class="top-line"></span>
        <div class="label">Total</div>
        <div class="number">${insights.total}</div>
        <div class="meta">${this.escapeHtml(unidad)} ${this.unidadVerbo(unidad)}</div>
        <div class="sparkline">${sparkActual}</div>
      </div>
      <div class="kpi kpi-2">
        <span class="top-line"></span>
        <div class="label">Promedio</div>
        <div class="number">${insights.promedio}</div>
        <div class="meta">${this.escapeHtml(unidad)} por periodo</div>
        <div class="sparkline">${sparkPromedio}</div>
      </div>
      <div class="kpi kpi-3 ${cambio < 0 ? 'is-negative' : ''}">
        <span class="top-line"></span>
        <div class="label">Cambio</div>
        <div class="number"><span class="${cambioCls}">${cambioSign}${cambio}%</span></div>
        <div class="meta">vs. anterior (${insights.totalAnterior || 0})</div>
        <div class="sparkline">${sparkCambio}</div>
      </div>
      <div class="kpi kpi-4">
        <span class="top-line"></span>
        <div class="label">Mejor periodo</div>
        <div class="number small">${this.escapeHtml(this.acortarLabel(mejorLabel))}</div>
        <div class="meta">${mejorValor} ${unidad} — pico de ciclo</div>
        <div class="sparkline">${sparkMejor}</div>
      </div>
    </div>
    ${observaciones}
  </div>
  <div class="tech-footer">
    <span>Vortiz Arquitectos · Consultoría</span>
    <span class="pagination">Pág. 02 / ${String(totalPaginas).padStart(2, '0')}</span>
    <span>Esc. 1:50 · Sec. 01</span>
  </div>
</div>`;
  }

  // ============================================================
  // PÁGINA 3: VISUALIZACIÓN
  // ============================================================

  private construirVisualizacion(ctx: any): string {
    const { detalle, titulo, totalPaginas, reporteNumero } = ctx;
    const { insights, unidad } = detalle;

    const chart = this.construirChart(detalle);
    const totalAnterior = insights.totalAnterior || 0;
    const diferencia = (insights.total || 0) - totalAnterior;
    const diferenciaCls = diferencia >= 0 ? 'pos' : 'neg';
    const diferenciaSign = diferencia >= 0 ? '+' : '';
    const cambio = Number(insights.cambio || 0);
    const cambioSign = cambio >= 0 ? '+' : '';

    return `
<div class="page">
  <div class="brand-spine"><span>Vortiz Arquitectos · Reporte Ejecutivo · Nº ${reporteNumero}</span></div>
  <div class="tech-header">
    <div class="left">
      <span class="brand">Vortiz</span>
      <span class="dim">/</span>
      <span>${titulo}</span>
    </div>
    <div class="right"><span>02 · Visualización</span></div>
  </div>
  <div class="page-content">
    <div class="section-marker">
      <span class="num">02</span>
      <span class="label">Visualización · serie temporal</span>
      <span class="scale">Esc. 1:100</span>
    </div>
    ${chart}
    <p class="chart-caption">
      La serie muestra el comportamiento del periodo analizado.
      ${insights.mejor?.label ? `El pico se registró en <strong>${this.escapeHtml(insights.mejor.label)}</strong> con <strong>${insights.mejor.valor} ${unidad}</strong>.` : ''}
      ${insights.peor?.label && insights.peor.label !== insights.mejor?.label ? `El valor más bajo fue <strong>${insights.peor.valor} ${unidad}</strong> en ${this.escapeHtml(insights.peor.label)}.` : ''}
    </p>
    <div class="period-comparison">
      <div class="cell">
        <div class="lab">Periodo actual</div>
        <div class="val">${insights.total || 0}</div>
        <div class="sub">${this.formatearFechaCorta(detalle.rango.desde)} — ${this.formatearFechaCorta(detalle.rango.hasta)}</div>
      </div>
      <div class="cell">
        <div class="lab">Periodo anterior</div>
        <div class="val">${totalAnterior}</div>
        <div class="sub">Ciclo previo equivalente</div>
      </div>
      <div class="cell">
        <div class="lab">Diferencial</div>
        <div class="val ${diferenciaCls}">${diferenciaSign}${diferencia}</div>
        <div class="sub">${cambioSign}${cambio}% interanual</div>
      </div>
    </div>
  </div>
  <div class="tech-footer">
    <span>Vortiz Arquitectos · Consultoría</span>
    <span class="pagination">Pág. 03 / ${String(totalPaginas).padStart(2, '0')}</span>
    <span>Esc. 1:100 · Sec. 02</span>
  </div>
</div>`;
  }

  // ============================================================
  // PÁGINA 4: DETALLE / TABLA
  // ============================================================

  private construirDetalle(ctx: any): string {
    const { detalle, titulo, totalPaginas, reporteNumero } = ctx;
    const { tabla, insights, unidad } = detalle;

    if (!tabla || !tabla.filas || tabla.filas.length === 0) {
      return this.construirDetalleVacio(ctx);
    }

    // Determinar el valor máximo para escalar las mini-bars
    const valores = tabla.filas.map((f: any[]) => Number(f[1]) || 0);
    const maxValor = Math.max(...valores, 1);

    // Encontrar el índice de la fila con valor máximo (para highlight)
    const idxMax = valores.indexOf(maxValor);

    const filasHtml = tabla.filas
      .map((fila: any[], idx: number) => {
        const valor = Number(fila[1]) || 0;
        const cambio = String(fila[2] || '—');
        const pct = maxValor > 0 ? (valor / maxValor) * 100 : 0;
        const esZebra = idx % 2 === 1;
        const esMax = idx === idxMax;

        let barFillClass = '';
        if (esMax) barFillClass = 'dark';
        else if (pct >= 85) barFillClass = 'amber';

        let deltaCls = 'neutral';
        if (cambio.startsWith('+')) deltaCls = 'up';
        else if (cambio.startsWith('-') || cambio.startsWith('−')) deltaCls = 'down';

        return `
        <tr class="${esZebra ? 'zebra' : ''} ${esMax ? 'highlight' : ''}">
          <td class="month">${this.escapeHtml(String(fila[0]))}</td>
          <td class="value">${valor}</td>
          <td>
            <div class="mini-bar">
              <span class="bar-track">
                <span class="bar-fill ${barFillClass}" style="width: ${pct.toFixed(0)}%"></span>
              </span>
            </div>
          </td>
          <td class="delta ${deltaCls}">${this.escapeHtml(cambio)}</td>
        </tr>`;
      })
      .join('');

    const total = insights.total || valores.reduce((a: number, b: number) => a + b, 0);
    const cambio = Number(insights.cambio || 0);
    const cambioCls = cambio >= 0 ? 'pos' : 'neg';
    const cambioSign = cambio >= 0 ? '+' : '';

    return `
<div class="page">
  <div class="brand-spine"><span>Vortiz Arquitectos · Reporte Ejecutivo · Nº ${reporteNumero}</span></div>
  <div class="tech-header">
    <div class="left">
      <span class="brand">Vortiz</span>
      <span class="dim">/</span>
      <span>${titulo}</span>
    </div>
    <div class="right"><span>03 · Detalle</span></div>
  </div>
  <div class="page-content">
    <div class="section-marker">
      <span class="num">03</span>
      <span class="label">Detalle por periodo</span>
      <span class="scale">Esc. 1:1</span>
    </div>
    <p class="detail-intro">
      Tabla completa del periodo analizado. La columna <em>vs. anterior</em> compara cada fila contra la inmediatamente previa de la serie.
    </p>
    <table class="detail">
      <colgroup>
        <col class="col-month">
        <col class="col-value">
        <col class="col-bar">
        <col class="col-delta">
      </colgroup>
      <thead>
        <tr>
          <th>${this.escapeHtml(tabla.columnas[0] || 'Periodo')}</th>
          <th class="r">${this.escapeHtml(tabla.columnas[1] || 'Valor')}</th>
          <th class="r">Distribución</th>
          <th class="r">${this.escapeHtml(tabla.columnas[2] || 'vs. Anterior')}</th>
        </tr>
      </thead>
      <tbody>${filasHtml}</tbody>
      <tfoot>
        <tr>
          <td>Total acumulado</td>
          <td class="value">${total}</td>
          <td></td>
          <td class="value ${cambioCls}">${cambioSign}${cambio}%</td>
        </tr>
      </tfoot>
    </table>
  </div>
  <div class="tech-footer">
    <span>Vortiz Arquitectos · Consultoría</span>
    <span class="pagination">Pág. 04 / ${String(ctx.totalPaginas).padStart(2, '0')}</span>
    <span>Esc. 1:1 · Sec. 03</span>
  </div>
</div>`;
  }

  private construirDetalleVacio(ctx: any): string {
    const { titulo, totalPaginas, reporteNumero } = ctx;
    return `
<div class="page">
  <div class="brand-spine"><span>Vortiz Arquitectos · Reporte Ejecutivo · Nº ${reporteNumero}</span></div>
  <div class="tech-header">
    <div class="left">
      <span class="brand">Vortiz</span>
      <span class="dim">/</span>
      <span>${titulo}</span>
    </div>
    <div class="right"><span>03 · Detalle</span></div>
  </div>
  <div class="page-content">
    <div class="section-marker">
      <span class="num">03</span>
      <span class="label">Detalle por periodo</span>
      <span class="scale">Esc. 1:1</span>
    </div>
    <p class="detail-intro" style="text-align: center; margin-top: 80px;">
      Sin datos disponibles para este periodo.
    </p>
  </div>
  <div class="tech-footer">
    <span>Vortiz Arquitectos · Consultoría</span>
    <span class="pagination">Pág. 04 / ${String(totalPaginas).padStart(2, '0')}</span>
    <span>Esc. 1:1 · Sec. 03</span>
  </div>
</div>`;
  }

  // ============================================================
  // CHART SVG
  // ============================================================

  private construirChart(detalle: any): string {
    const serie = detalle.serie || [];
    if (serie.length === 0) {
      return '<div class="chart-wrap" style="height: 280px; display: flex; align-items: center; justify-content: center; font-family: var(--serif); font-style: italic; color: var(--mute);">Sin datos para visualizar.</div>';
    }

    const tipo = detalle.tipoGrafica;
    if (tipo === 'donut') return this.chartDonut(detalle);
    if (tipo === 'bar') return this.chartBar(detalle);
    // 'area' o 'line'
    return this.chartLinea(detalle, tipo === 'area');
  }

  private chartLinea(detalle: any, esArea: boolean): string {
    const serie = detalle.serie || [];
    const valores = serie.map((s: any) => Number(s.valor) || 0);
    const maxV = Math.max(...valores, 1);
    const escalaMax = Math.ceil(maxV * 1.1 / 10) * 10 || 10;

    // Dimensiones SVG
    const W = 600;
    const H = 280;
    const PAD_L = 40;
    const PAD_R = 20;
    const PAD_T = 30;
    const PAD_B = 50;
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;

    // Puntos
    const n = serie.length;
    const stepX = n > 1 ? innerW / (n - 1) : innerW;
    const points = serie.map((s: any, i: number) => {
      const x = PAD_L + (n > 1 ? i * stepX : innerW / 2);
      const y = PAD_T + innerH - ((Number(s.valor) || 0) / escalaMax) * innerH;
      return { x, y, valor: s.valor, label: s.label };
    });

    // Línea path
    const linePath = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} L ${points[0].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`;

    // Encontrar pico
    const idxMax = valores.indexOf(Math.max(...valores));
    const peak = points[idxMax];

    // Y-axis labels (4 steps)
    const yLabels = [escalaMax, Math.round(escalaMax * 0.75), Math.round(escalaMax * 0.5), Math.round(escalaMax * 0.25), 0];
    const yLabelsHtml = yLabels
      .map((v, i) => {
        const y = PAD_T + (innerH * i) / 4;
        return `<text x="${PAD_L - 8}" y="${y + 3}" font-family="JetBrains Mono" font-size="8" fill="#6b7a8c" text-anchor="end">${v}</text>`;
      })
      .join('');

    // X-axis labels — máximo 12 etiquetas para no saturar
    const maxLabels = 12;
    const step = Math.max(1, Math.ceil(n / maxLabels));
    const xLabelsHtml = points
      .filter((_: any, i: number) => i % step === 0 || i === n - 1)
      .map((p: any) => {
        const isPeak = points.indexOf(p) === idxMax;
        return `<text x="${p.x.toFixed(1)}" y="${(PAD_T + innerH + 16).toFixed(1)}" font-family="JetBrains Mono" font-size="8" fill="${isPeak ? '#b8863a' : '#6b7a8c'}" font-weight="${isPeak ? '700' : '400'}" text-anchor="middle">${this.escapeHtml(this.acortarLabel(p.label))}</text>`;
      })
      .join('');

    // Puntos visibles
    const pointsHtml = points
      .map((p: any, i: number) => {
        if (i === idxMax) {
          return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#b8863a"/>`;
        }
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#fff" stroke="#0a4d7a" stroke-width="1.5"/>`;
      })
      .join('');

    // Anotación del pico
    const anotacionX = peak.x > W * 0.7 ? peak.x - 100 : peak.x + 80;
    const anotacionY = Math.max(20, peak.y - 30);
    const anchor = peak.x > W * 0.7 ? 'end' : 'start';

    const areaFill = esArea
      ? `<path d="${areaPath}" fill="#0a4d7a" fill-opacity="0.08"/>`
      : '';

    return `
<div class="chart-wrap">
  <div class="chart-meta">
    <span>Eje Y · ${this.escapeHtml(detalle.unidad)}</span>
    <span class="scale-label">Pico · ${peak.valor} ${detalle.unidad}</span>
    <span>Eje X · ${this.escapeHtml(this.formatearFechaCorta(detalle.rango.desde))} → ${this.escapeHtml(this.formatearFechaCorta(detalle.rango.hasta))}</span>
  </div>
  <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <pattern id="bp-grid-chart" width="40" height="32" patternUnits="userSpaceOnUse">
        <circle cx="0" cy="0" r="0.6" fill="#c8d1dc"/>
      </pattern>
      <marker id="arr-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="#b8863a"/>
      </marker>
    </defs>
    <rect x="${PAD_L}" y="${PAD_T}" width="${innerW}" height="${innerH}" fill="url(#bp-grid-chart)"/>
    ${yLabelsHtml}
    ${areaFill}
    <path d="${linePath}" fill="none" stroke="#0a4d7a" stroke-width="2"/>
    ${pointsHtml}
    <line x1="${peak.x.toFixed(1)}" y1="${peak.y.toFixed(1)}" x2="${anotacionX.toFixed(1)}" y2="${anotacionY.toFixed(1)}" stroke="#b8863a" stroke-width="1" marker-end="url(#arr-amber)"/>
    <text x="${anotacionX.toFixed(1)}" y="${(anotacionY - 4).toFixed(1)}" font-family="JetBrains Mono" font-size="9" fill="#b8863a" font-weight="500" text-anchor="${anchor}">PICO · ${peak.valor} ${this.escapeHtml(detalle.unidad).toUpperCase()}</text>
    <text x="${anotacionX.toFixed(1)}" y="${(anotacionY + 8).toFixed(1)}" font-family="JetBrains Mono" font-size="8" fill="#6b7a8c" text-anchor="${anchor}">${this.escapeHtml(peak.label)}</text>
    <line x1="${PAD_L}" y1="${(PAD_T + innerH).toFixed(1)}" x2="${(W - PAD_R).toFixed(1)}" y2="${(PAD_T + innerH).toFixed(1)}" stroke="#0a1f3d" stroke-width="0.5"/>
    ${xLabelsHtml}
  </svg>
</div>`;
  }

  private chartBar(detalle: any): string {
    const serie = detalle.serie || [];
    const valores = serie.map((s: any) => Number(s.valor) || 0);
    const maxV = Math.max(...valores, 1);
    const escalaMax = Math.ceil(maxV * 1.1 / 10) * 10 || 10;

    const W = 600;
    const H = 280;
    const PAD_L = 40, PAD_R = 20, PAD_T = 30, PAD_B = 50;
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;

    const n = serie.length;
    const barGap = 4;
    const barW = (innerW / n) - barGap;

    const idxMax = valores.indexOf(Math.max(...valores));

    const yLabels = [escalaMax, Math.round(escalaMax * 0.75), Math.round(escalaMax * 0.5), Math.round(escalaMax * 0.25), 0];
    const yLabelsHtml = yLabels.map((v, i) => {
      const y = PAD_T + (innerH * i) / 4;
      return `<text x="${PAD_L - 8}" y="${y + 3}" font-family="JetBrains Mono" font-size="8" fill="#6b7a8c" text-anchor="end">${v}</text>`;
    }).join('');

    const barsHtml = serie.map((s: any, i: number) => {
      const valor = Number(s.valor) || 0;
      const barH = (valor / escalaMax) * innerH;
      const x = PAD_L + i * (innerW / n) + barGap / 2;
      const y = PAD_T + innerH - barH;
      const fill = i === idxMax ? '#b8863a' : '#0a4d7a';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${fill}" fill-opacity="0.85"/>`;
    }).join('');

    const maxLabels = 12;
    const step = Math.max(1, Math.ceil(n / maxLabels));
    const xLabelsHtml = serie.map((s: any, i: number) => {
      if (i % step !== 0 && i !== n - 1) return '';
      const x = PAD_L + i * (innerW / n) + (innerW / n) / 2;
      const isPeak = i === idxMax;
      return `<text x="${x.toFixed(1)}" y="${(PAD_T + innerH + 16).toFixed(1)}" font-family="JetBrains Mono" font-size="8" fill="${isPeak ? '#b8863a' : '#6b7a8c'}" font-weight="${isPeak ? '700' : '400'}" text-anchor="middle">${this.escapeHtml(this.acortarLabel(s.label))}</text>`;
    }).join('');

    const peak = serie[idxMax];

    return `
<div class="chart-wrap">
  <div class="chart-meta">
    <span>Eje Y · ${this.escapeHtml(detalle.unidad)}</span>
    <span class="scale-label">Pico · ${peak.valor} ${detalle.unidad}</span>
    <span>Eje X · Periodos</span>
  </div>
  <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <pattern id="bp-grid-bar" width="40" height="32" patternUnits="userSpaceOnUse">
        <circle cx="0" cy="0" r="0.6" fill="#c8d1dc"/>
      </pattern>
    </defs>
    <rect x="${PAD_L}" y="${PAD_T}" width="${innerW}" height="${innerH}" fill="url(#bp-grid-bar)"/>
    ${yLabelsHtml}
    ${barsHtml}
    <line x1="${PAD_L}" y1="${(PAD_T + innerH).toFixed(1)}" x2="${(W - PAD_R).toFixed(1)}" y2="${(PAD_T + innerH).toFixed(1)}" stroke="#0a1f3d" stroke-width="0.5"/>
    ${xLabelsHtml}
  </svg>
</div>`;
  }

  private chartDonut(detalle: any): string {
    const serie = detalle.serie || [];
    const total = serie.reduce((sum: number, s: any) => sum + (Number(s.valor) || 0), 0);
    if (total === 0) return '<div class="chart-wrap" style="height: 280px;"></div>';

    const W = 600, H = 280;
    const cx = 180, cy = H / 2;
    const r = 90;
    const rInner = 55;

    const colores = ['#0a4d7a', '#b8863a', '#2d7a4f', '#4a7ca8', '#a83a2c', '#1a2e4a'];

    let acumAngulo = -Math.PI / 2;
    const arcsHtml = serie.map((s: any, i: number) => {
      const valor = Number(s.valor) || 0;
      const pct = valor / total;
      const angulo = pct * 2 * Math.PI;
      const x1 = cx + r * Math.cos(acumAngulo);
      const y1 = cy + r * Math.sin(acumAngulo);
      const x2 = cx + r * Math.cos(acumAngulo + angulo);
      const y2 = cy + r * Math.sin(acumAngulo + angulo);
      const x3 = cx + rInner * Math.cos(acumAngulo + angulo);
      const y3 = cy + rInner * Math.sin(acumAngulo + angulo);
      const x4 = cx + rInner * Math.cos(acumAngulo);
      const y4 = cy + rInner * Math.sin(acumAngulo);
      const largeArc = angulo > Math.PI ? 1 : 0;
      const path = `M ${x1.toFixed(1)},${y1.toFixed(1)} A ${r},${r} 0 ${largeArc} 1 ${x2.toFixed(1)},${y2.toFixed(1)} L ${x3.toFixed(1)},${y3.toFixed(1)} A ${rInner},${rInner} 0 ${largeArc} 0 ${x4.toFixed(1)},${y4.toFixed(1)} Z`;
      acumAngulo += angulo;
      return `<path d="${path}" fill="${colores[i % colores.length]}" fill-opacity="0.9"/>`;
    }).join('');

    // Leyenda
    const legendX = 320;
    const legendHtml = serie.map((s: any, i: number) => {
      const valor = Number(s.valor) || 0;
      const pct = ((valor / total) * 100).toFixed(1);
      const y = 80 + i * 28;
      return `
        <rect x="${legendX}" y="${y}" width="14" height="14" fill="${colores[i % colores.length]}"/>
        <text x="${legendX + 24}" y="${y + 11}" font-family="Inter Tight" font-size="11" fill="#0a1f3d" font-weight="500">${this.escapeHtml(s.label)}</text>
        <text x="${legendX + 24}" y="${y + 24}" font-family="JetBrains Mono" font-size="9" fill="#6b7a8c">${valor} · ${pct}%</text>`;
    }).join('');

    return `
<div class="chart-wrap">
  <div class="chart-meta">
    <span>Total · ${total} ${this.escapeHtml(detalle.unidad)}</span>
    <span class="scale-label">${serie.length} categorías</span>
    <span>Distribución porcentual</span>
  </div>
  <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    ${arcsHtml}
    <text x="${cx}" y="${cy - 4}" font-family="Fraunces" font-size="28" fill="#0a1f3d" text-anchor="middle" font-weight="400">${total}</text>
    <text x="${cx}" y="${cy + 14}" font-family="JetBrains Mono" font-size="8" fill="#6b7a8c" text-anchor="middle" letter-spacing="0.15em">TOTAL</text>
    ${legendHtml}
  </svg>
</div>`;
  }

  // ============================================================
  // SPARKLINES (mini-graficas en KPIs)
  // ============================================================

  private sparklineLinea(valores: number[], color: string): string {
    if (valores.length === 0) return '<svg viewBox="0 0 200 30"></svg>';
    const max = Math.max(...valores, 1);
    const min = Math.min(...valores, 0);
    const range = max - min || 1;
    const n = valores.length;
    const stepX = n > 1 ? 200 / (n - 1) : 0;
    const points = valores
      .map((v, i) => `${(i * stepX).toFixed(1)},${(28 - ((v - min) / range) * 24).toFixed(1)}`)
      .join(' ');
    const lastX = ((n - 1) * stepX).toFixed(1);
    const lastY = (28 - ((valores[n - 1] - min) / range) * 24).toFixed(1);
    return `<svg viewBox="0 0 200 30" preserveAspectRatio="none">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.2"/>
      <circle cx="${lastX}" cy="${lastY}" r="2" fill="${color}"/>
    </svg>`;
  }

  private sparklinePromedio(valores: number[], color: string): string {
    if (valores.length === 0) return '<svg viewBox="0 0 200 30"></svg>';
    const avg = valores.reduce((a, b) => a + b, 0) / valores.length;
    const max = Math.max(...valores, 1);
    const n = valores.length;
    const stepX = n > 1 ? 200 / (n - 1) : 0;
    const points = valores
      .map((v, i) => `${(i * stepX).toFixed(1)},${(28 - (v / max) * 24).toFixed(1)}`)
      .join(' ');
    const avgY = (28 - (avg / max) * 24).toFixed(1);
    return `<svg viewBox="0 0 200 30" preserveAspectRatio="none">
      <line x1="0" y1="${avgY}" x2="200" y2="${avgY}" stroke="${color}" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.5"/>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.2"/>
    </svg>`;
  }

  private sparklineCambio(cambio: number): string {
    if (cambio >= 0) {
      return `<svg viewBox="0 0 200 30" preserveAspectRatio="none">
        <line x1="0" y1="22" x2="200" y2="6" stroke="#2d7a4f" stroke-width="1.2" stroke-dasharray="2,2"/>
        <circle cx="0" cy="22" r="2" fill="#a83a2c"/>
        <circle cx="200" cy="6" r="2.5" fill="#2d7a4f"/>
      </svg>`;
    } else {
      return `<svg viewBox="0 0 200 30" preserveAspectRatio="none">
        <line x1="0" y1="6" x2="200" y2="22" stroke="#a83a2c" stroke-width="1.2" stroke-dasharray="2,2"/>
        <circle cx="0" cy="6" r="2" fill="#2d7a4f"/>
        <circle cx="200" cy="22" r="2.5" fill="#a83a2c"/>
      </svg>`;
    }
  }

  private sparklineBarras(valores: number[]): string {
    if (valores.length === 0) return '<svg viewBox="0 0 200 30"></svg>';
    const max = Math.max(...valores, 1);
    const n = valores.length;
    const idxMax = valores.indexOf(max);
    const barW = Math.max(2, (200 / n) - 2);
    const stepX = 200 / n;
    const bars = valores
      .map((v, i) => {
        const h = (v / max) * 24;
        const x = i * stepX + 1;
        const y = 28 - h;
        const fill = i === idxMax ? '#b8863a' : '#d9a85f';
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"/>`;
      })
      .join('');
    return `<svg viewBox="0 0 200 30" preserveAspectRatio="none">${bars}</svg>`;
  }

  // ============================================================
  // CONSTRUCTORES DE TEXTO
  // ============================================================

  private construirPullquote(insights: any, unidad: string): string {
    const cambio = Number(insights.cambio || 0);
    const total = insights.total || 0;

    if (cambio >= 10) {
      return `El periodo cerró con <strong>${total} ${this.escapeHtml(unidad)}</strong>, un crecimiento sostenido de <span class="pos">+${cambio}%</span> frente al ciclo anterior — un resultado claramente por encima de la media histórica.`;
    } else if (cambio >= 0) {
      return `El periodo registró <strong>${total} ${this.escapeHtml(unidad)}</strong>, con un crecimiento moderado de <span class="pos">+${cambio}%</span> respecto al periodo previo.`;
    } else if (cambio >= -10) {
      return `El periodo cerró con <strong>${total} ${this.escapeHtml(unidad)}</strong>, una variación de <span class="neg">${cambio}%</span> frente al ciclo anterior — dentro de los rangos esperados.`;
    } else {
      return `El periodo registró <strong>${total} ${this.escapeHtml(unidad)}</strong>, con una contracción de <span class="neg">${cambio}%</span> respecto al periodo previo — conviene revisar las causas.`;
    }
  }

  private construirObservaciones(detalle: any): string {
    const serie = detalle.serie || [];
    if (serie.length < 3) return '';

    const valores = serie.map((s: any) => Number(s.valor) || 0);
    const sumTotal = valores.reduce((a: number, b: number) => a + b, 0);
    const sumSegundaMitad = valores.slice(Math.floor(valores.length / 2)).reduce((a: number, b: number) => a + b, 0);
    const pctSegundaMitad = sumTotal > 0 ? Math.round((sumSegundaMitad / sumTotal) * 100) : 0;

    const max = Math.max(...valores);
    const min = Math.min(...valores);
    const variabilidad = max > 0 ? Math.round(((max - min) / max) * 100) : 0;

    return `
    <div class="closing-note">
      <div class="nota">
        <div class="heading">Observación 01 · Distribución</div>
        La segunda mitad del periodo concentró el <strong>${pctSegundaMitad}%</strong> del volumen total, lo cual sugiere una tendencia ${pctSegundaMitad > 60 ? 'al alza hacia el cierre' : 'relativamente estable a lo largo del ciclo'}.
      </div>
      <div class="nota">
        <div class="heading">Observación 02 · Variabilidad</div>
        El rango entre el valor más alto (<strong>${max}</strong>) y el más bajo (<strong>${min}</strong>) representa un <strong>${variabilidad}%</strong> de variación, indicando ${variabilidad > 50 ? 'un comportamiento muy heterogéneo' : 'un comportamiento consistente'} en el periodo.
      </div>
    </div>`;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private escapeHtml(text: string): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Aplica énfasis al título: la última palabra significativa va en itálica azul */
  private aplicarEnfasisEnTitulo(titulo: string): string {
    // Buscar palabras clave para resaltar (la más significativa)
    const palabrasClave = ['citas', 'clientes', 'servicios', 'visitas', 'actividad', 'categorías', 'reporte'];
    const palabras = titulo.split(' ');
    for (const palabra of palabras) {
      const limpia = palabra.toLowerCase().replace(/[.,;:]/g, '');
      if (palabrasClave.includes(limpia)) {
        return titulo.replace(palabra, `<em>${palabra}</em>`);
      }
    }
    // Fallback: enfatizar la última palabra >3 chars
    const ultimaImportante = palabras.filter((p) => p.length > 3).pop();
    if (ultimaImportante) {
      const lastIndex = titulo.lastIndexOf(ultimaImportante);
      return titulo.slice(0, lastIndex) + `<em>${ultimaImportante}</em>` + titulo.slice(lastIndex + ultimaImportante.length);
    }
    return titulo;
  }

  private formatearFechaCorta(fecha: string | Date): string {
    if (!fecha) return '—';
    let d: Date;
    if (typeof fecha === 'string') {
      // Si es YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [y, m, day] = fecha.split('-');
        d = new Date(Number(y), Number(m) - 1, Number(day));
      } else {
        d = new Date(fecha);
      }
    } else {
      d = fecha;
    }
    if (isNaN(d.getTime())) return String(fecha);

    const dia = d.getDate();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dia} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  }

  private calcularDias(desde: string, hasta: string): number {
    if (!desde || !hasta) return 0;
    const d1 = new Date(desde);
    const d2 = new Date(hasta);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }

  private generarNumeroReporte(): string {
    // Número correlativo basado en fecha (puedes cambiar a guardar en BD si quieres uno real)
    const ahora = new Date();
    const yy = ahora.getFullYear() % 100;
    const dayOfYear = Math.floor(
      (ahora.getTime() - new Date(ahora.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24),
    );
    return `${String(yy).padStart(2, '0')}${String(dayOfYear).padStart(3, '0')}`;
  }

  private cargarLogoBase64(): string {
    try {
      if (fs.existsSync(this.LOGO_PATH)) {
        const buffer = fs.readFileSync(this.LOGO_PATH);
        const ext = this.LOGO_PATH.split('.').pop()?.toLowerCase() || 'png';
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
        return `data:${mime};base64,${buffer.toString('base64')}`;
      }
    } catch (err) {
      this.logger.warn(`No se pudo cargar el logo: ${err}`);
    }
    return '';
  }

  private unidadVerbo(unidad: string): string {
    const map: Record<string, string> = {
      citas: 'agendadas',
      visitas: 'registradas',
      clientes: 'nuevos',
    };
    return map[unidad?.toLowerCase()] || 'registradas';
  }

  private acortarLabel(label: string, max = 12): string {
    if (!label) return '';
    return label.length > max ? label.substring(0, max - 1) + '…' : label;
  }
}