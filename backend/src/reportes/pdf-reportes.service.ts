import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfReportesService {
  private readonly C = {
    primary: '#0a4d7a',
    primaryDark: '#0a1f3d',
    primaryLight: '#1e6ba8',
    accent: '#f97316',
    success: '#10b981',
    danger: '#ef4444',
    text: '#111827',
    textMuted: '#6b7280',
    textLight: '#9ca3af',
    bg: '#ffffff',
    bgLight: '#f9fafb',
    bgMedium: '#f3f4f6',
    border: '#e5e7eb',
  };

  private readonly P = {
    width: 595,
    height: 842,
    margin: 50,
    contentWidth: 495,
  };
  private readonly LOGO_PATH = '/app/uploads/marca/logo.png';
  private chartCanvas = new ChartJSNodeCanvas({
    width: 900,
    height: 450,
    backgroundColour: '#ffffff',
    chartCallback: (ChartJS) => {
      // Forzar fuente disponible en Alpine
      ChartJS.defaults.font.family = 'DejaVu Sans, sans-serif';
      ChartJS.defaults.font.size = 12;
      ChartJS.defaults.color = '#374151';
    },
  });

  async generarReportePDF(
    detalle: any,
    titulo: string,
    descripcion: string,
  ): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: this.P.margin,
      bufferPages: true,
      info: {
        Title: titulo,
        Author: 'Vortiz Arquitectos',
        Subject: descripcion,
        Creator: 'Sistema Vortiz',
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // PORTADA
        this.dibujarPortada(doc, titulo, descripcion, detalle);

        // PÁGINA 2: contenido
        doc.addPage();
        this.dibujarHeaderInterno(doc, titulo);
        this.dibujarInsights(doc, detalle.insights, detalle.unidad);

        // GRÁFICA
        if (detalle.serie?.length > 0) {
          try {
            const graficaBuffer = await this.generarGraficaPNG(detalle);
            if (doc.y > this.P.height - 320) {
              doc.addPage();
              this.dibujarHeaderInterno(doc, titulo);
            }
            this.dibujarSeccion(doc, 'Visualización');
            doc.image(graficaBuffer, this.P.margin, doc.y, {
              fit: [this.P.contentWidth, 260],
              align: 'center',
            });
            doc.y += 270;
          } catch (err) {
            console.error('Error generando gráfica:', err);
          }
        }

        // TABLA
        if (doc.y > this.P.height - 200) {
          doc.addPage();
          this.dibujarHeaderInterno(doc, titulo);
        }
        this.dibujarSeccion(doc, 'Detalle por período');
        this.dibujarTabla(doc, detalle.tabla);

        // FOOTER en TODAS las páginas (excepto portada)
        this.dibujarFooterEnTodasPaginas(doc);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ============ PORTADA ============

  private dibujarPortada(
    doc: any,
    titulo: string,
    descripcion: string,
    detalle: any,
  ) {
    doc.rect(0, 0, this.P.width, 280).fillColor(this.C.primary).fill();
    doc.rect(0, 250, this.P.width, 30).fillColor(this.C.primaryDark).fill();

    // Círculos decorativos
    doc
      .circle(this.P.width - 80, 80, 60)
      .fillColor('#ffffff')
      .opacity(0.06)
      .fill()
      .opacity(1);
    doc
      .circle(this.P.width - 30, 150, 80)
      .fillColor('#ffffff')
      .opacity(0.05)
      .fill()
      .opacity(1);
    doc
      .circle(this.P.width - 120, 200, 40)
      .fillColor('#ffffff')
      .opacity(0.04)
      .fill()
      .opacity(1);

    // Logo (si existe) + Texto
    const tieneLogo = fs.existsSync(this.LOGO_PATH);
    if (tieneLogo) {
      try {
        doc.image(this.LOGO_PATH, this.P.margin, 65, {
          fit: [75, 75],
          align: 'left',
        });
        // Texto al lado del logo
        doc
          .fillColor('#ffffff')
          .fontSize(36)
          .font('Helvetica-Bold')
          .text('VORTIZ', this.P.margin + 90, 80, { lineBreak: false });
        doc
          .fillColor('#bfdbfe')
          .fontSize(10)
          .font('Helvetica')
          .text('ARQUITECTOS - CONSULTORIA', this.P.margin + 90, 128, {
            characterSpacing: 2,
            lineBreak: false,
          });
      } catch (err) {
        console.warn('No se pudo cargar el logo, usando texto:', err);
        this.dibujarLogoTexto(doc);
      }
    } else {
      this.dibujarLogoTexto(doc);
    }

    // Tag
    doc
      .roundedRect(this.P.margin, 175, 95, 26, 13)
      .fillColor('#ffffff')
      .opacity(0.18)
      .fill()
      .opacity(1);
    doc
      .fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('REPORTE EJECUTIVO', this.P.margin + 8, 183, {
        characterSpacing: 0.8,
        lineBreak: false,
      });

    // Título grande
    doc
      .fillColor('#ffffff')
      .fontSize(26)
      .font('Helvetica-Bold')
      .text(titulo, this.P.margin, 218, { width: this.P.contentWidth - 130 });

    // Contenido bajo banner
    doc.y = 320;
    doc
      .fillColor(this.C.text)
      .fontSize(13)
      .font('Helvetica')
      .text(descripcion, this.P.margin, doc.y, { width: this.P.contentWidth });

    doc.y += 30;

    // Box de período
    const boxY = doc.y;
    doc
      .roundedRect(this.P.margin, boxY, this.P.contentWidth, 100, 12)
      .fillColor(this.C.bgLight)
      .fill();
    doc
      .roundedRect(this.P.margin, boxY, this.P.contentWidth, 100, 12)
      .strokeColor(this.C.border)
      .lineWidth(1)
      .stroke();
    doc.rect(this.P.margin, boxY, 5, 100).fillColor(this.C.accent).fill();

    doc
      .fillColor(this.C.textMuted)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('PERIODO ANALIZADO', this.P.margin + 22, boxY + 18, {
        characterSpacing: 1,
        lineBreak: false,
      });
    doc
      .fillColor(this.C.text)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(
        `${this.formatearFecha(detalle.rango.desde)} - ${this.formatearFecha(detalle.rango.hasta)}`,
        this.P.margin + 22,
        boxY + 40,
        { width: this.P.contentWidth - 40 },
      );
    doc
      .fillColor(this.C.textMuted)
      .fontSize(10)
      .font('Helvetica')
      .text(
        `${this.calcularDias(detalle.rango.desde, detalle.rango.hasta)} dias de informacion analizada`,
        this.P.margin + 22,
        boxY + 70,
        { lineBreak: false },
      );

    // Footer portada
    const footerY = this.P.height - 110;
    doc
      .moveTo(this.P.margin, footerY)
      .lineTo(this.P.width - this.P.margin, footerY)
      .strokeColor(this.C.border)
      .lineWidth(1)
      .stroke();

    doc
      .fillColor(this.C.textMuted)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('GENERADO EL', this.P.margin, footerY + 18, {
        characterSpacing: 1,
        lineBreak: false,
      });
    doc
      .fillColor(this.C.text)
      .fontSize(11)
      .font('Helvetica')
      .text(
        new Date().toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        this.P.margin,
        footerY + 35,
        { lineBreak: false },
      );

    doc
      .fillColor(this.C.textMuted)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('SISTEMA', this.P.width - this.P.margin - 120, footerY + 18, {
        width: 120,
        align: 'right',
        characterSpacing: 1,
        lineBreak: false,
      });
    doc
      .fillColor(this.C.primary)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Vortiz', this.P.width - this.P.margin - 120, footerY + 33, {
        width: 120,
        align: 'right',
        lineBreak: false,
      });
  }

  // ============ HEADER INTERNO ============

  private dibujarHeaderInterno(doc: any, titulo: string) {
    doc.rect(0, 0, this.P.width, 6).fillColor(this.C.primary).fill();
    doc
      .fillColor(this.C.primary)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('VORTIZ', this.P.margin, 26, { lineBreak: false });
    doc
      .fillColor(this.C.textMuted)
      .fontSize(9)
      .font('Helvetica')
      .text(titulo, this.P.margin + 75, 30, {
        width: this.P.contentWidth - 75,
        lineBreak: false,
        ellipsis: true,
      });
    doc
      .moveTo(this.P.margin, 60)
      .lineTo(this.P.width - this.P.margin, 60)
      .strokeColor(this.C.border)
      .lineWidth(0.5)
      .stroke();
    doc.y = 85;
  }

  // ============ INSIGHTS ============

  private dibujarInsights(doc: any, insights: any, unidad: string) {
    this.dibujarSeccion(doc, 'Resumen ejecutivo');

    const cards = [
      {
        label: 'TOTAL',
        valor: `${insights.total}`,
        sub: unidad,
        color: this.C.primary,
      },
      {
        label: 'PROMEDIO',
        valor: `${insights.promedio}`,
        sub: `${unidad} por periodo`,
        color: this.C.primaryLight,
      },
      {
        label: 'CAMBIO',
        valor: `${insights.cambio >= 0 ? '+' : ''}${insights.cambio}%`,
        sub: `Anterior: ${insights.totalAnterior}`,
        color: insights.cambio >= 0 ? this.C.success : this.C.danger,
      },
      {
        label: 'MEJOR PERIODO',
        valor: insights.mejor.label,
        sub: `${insights.mejor.valor} ${unidad}`,
        color: this.C.accent,
      },
    ];

    const cardW = (this.P.contentWidth - 12) / 2;
    const cardH = 90;
    const yStart = doc.y;

    cards.forEach((card, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = this.P.margin + col * (cardW + 12);
      const y = yStart + row * (cardH + 12);

      // Sombra
      doc
        .roundedRect(x + 2, y + 2, cardW, cardH, 12)
        .fillColor('#000000')
        .opacity(0.04)
        .fill()
        .opacity(1);
      // Card
      doc.roundedRect(x, y, cardW, cardH, 12).fillColor(this.C.bg).fill();
      doc
        .roundedRect(x, y, cardW, cardH, 12)
        .strokeColor(this.C.border)
        .lineWidth(0.5)
        .stroke();
      // Barra lateral
      doc.rect(x, y, 5, cardH).fillColor(card.color).fill();

      // Label
      doc
        .fillColor(this.C.textMuted)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(card.label, x + 20, y + 18, {
          characterSpacing: 1.2,
          lineBreak: false,
        });

      // Valor
      doc
        .fillColor(this.C.text)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(card.valor, x + 20, y + 38, {
          width: cardW - 40,
          ellipsis: true,
          lineBreak: false,
        });

      // Sub
      doc
        .fillColor(this.C.textMuted)
        .fontSize(9)
        .font('Helvetica')
        .text(card.sub, x + 20, y + 70, {
          width: cardW - 40,
          ellipsis: true,
          lineBreak: false,
        });
    });

    doc.y = yStart + 2 * (cardH + 12) + 14;
  }

  // ============ SECCIÓN ============

  private dibujarSeccion(doc: any, titulo: string) {
    doc
      .rect(this.P.margin, doc.y + 5, 4, 18)
      .fillColor(this.C.primary)
      .fill();
    doc
      .fillColor(this.C.text)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(titulo, this.P.margin + 14, doc.y, { lineBreak: false });
    doc.y += 32;
  }

  // ============ TABLA ============

  private dibujarTabla(doc: any, tabla: any) {
    if (!tabla?.filas?.length) {
      doc
        .fillColor(this.C.textMuted)
        .fontSize(11)
        .font('Helvetica-Oblique')
        .text('Sin datos en este periodo', { lineBreak: false });
      return;
    }

    const startX = this.P.margin;
    let y = doc.y;
    const colW = this.P.contentWidth / tabla.columnas.length;
    const rowH = 28;
    const headerH = 34;

    // Header
    doc
      .roundedRect(startX, y, this.P.contentWidth, headerH, 8)
      .fillColor(this.C.primary)
      .fill();
    tabla.columnas.forEach((col: string, i: number) => {
      doc
        .fillColor('#ffffff')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(col, startX + i * colW + 14, y + 12, {
          width: colW - 28,
          align: i === 0 ? 'left' : 'right',
          characterSpacing: 0.5,
          lineBreak: false,
        });
    });
    y += headerH;

    tabla.filas.forEach((fila: any[], rowIdx: number) => {
      if (y + rowH > this.P.height - 80) {
        doc.addPage();
        this.dibujarHeaderInterno(doc, 'Continuacion');
        y = doc.y;

        doc
          .roundedRect(startX, y, this.P.contentWidth, headerH, 8)
          .fillColor(this.C.primary)
          .fill();
        tabla.columnas.forEach((col: string, i: number) => {
          doc
            .fillColor('#ffffff')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(col, startX + i * colW + 14, y + 12, {
              width: colW - 28,
              align: i === 0 ? 'left' : 'right',
              lineBreak: false,
            });
        });
        y += headerH;
      }

      if (rowIdx % 2 === 0) {
        doc
          .rect(startX, y, this.P.contentWidth, rowH)
          .fillColor(this.C.bgLight)
          .fill();
      }

      fila.forEach((celda, i) => {
        const celdaStr = String(celda);
        let color = this.C.text;
        if (i === fila.length - 1 && celdaStr !== '-' && celdaStr !== 'NULL') {
          if (celdaStr.startsWith('+')) color = this.C.success;
          else if (celdaStr.startsWith('-') && celdaStr.length > 1)
            color = this.C.danger;
        }

        doc
          .fillColor(color)
          .fontSize(10)
          .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
          .text(celdaStr, startX + i * colW + 14, y + 10, {
            width: colW - 28,
            align: i === 0 ? 'left' : 'right',
            lineBreak: false,
          });
      });
      y += rowH;
    });

    doc
      .moveTo(startX, y)
      .lineTo(startX + this.P.contentWidth, y)
      .strokeColor(this.C.border)
      .lineWidth(0.5)
      .stroke();
    doc.y = y + 16;
  }

  // ============ FOOTER ============

  private dibujarFooterEnTodasPaginas(doc: any) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      if (i === range.start) continue; // skip portada

      // 🔑 CLAVE: forzar márgenes a 0 para que NO cree páginas nuevas
      const originalMargins = doc.page.margins;
      doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

      const footerY = this.P.height - 35;

      // Línea divisoria
      doc
        .moveTo(this.P.margin, footerY)
        .lineTo(this.P.width - this.P.margin, footerY)
        .strokeColor(this.C.border)
        .lineWidth(0.5)
        .stroke();

      // Izquierda: marca
      doc
        .fillColor(this.C.primary)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('VORTIZ', this.P.margin, footerY + 10, { lineBreak: false });
      doc
        .fillColor(this.C.textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text('Arquitectos - Consultoria', this.P.margin + 52, footerY + 11, {
          lineBreak: false,
        });

      // Centro: fecha
      doc
        .fillColor(this.C.textLight)
        .fontSize(7)
        .font('Helvetica')
        .text(
          `Generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}`,
          this.P.margin + 180,
          footerY + 12,
          { width: 150, align: 'center', lineBreak: false },
        );

      // Derecha: paginación
      doc
        .fillColor(this.C.textMuted)
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Pag. ${i - range.start + 1} de ${range.count}`,
          this.P.width - this.P.margin - 80,
          footerY + 11,
          { width: 80, align: 'right', lineBreak: false },
        );

      // 🔑 RESTAURAR márgenes para no afectar otros stages
      doc.page.margins = originalMargins;
    }
  }

  // ============ GRÁFICA ============

  private async generarGraficaPNG(detalle: any): Promise<Buffer> {
    return this.chartCanvas.renderToBuffer(
      this.buildChartConfig(detalle) as any,
    );
  }

  private buildChartConfig(detalle: any) {
    const labels = detalle.serie.map((s: any) => s.label);
    const valores = detalle.serie.map((s: any) => s.valor);
    const tipoMapeo: { [key: string]: string } = {
      area: 'line',
      donut: 'doughnut',
      line: 'line',
      bar: 'bar',
    };
    const chartType = tipoMapeo[detalle.tipoGrafica] || 'bar';
    const baseColor = this.C.primary;
    const coloresMultiples = [
      '#0a4d7a',
      '#f97316',
      '#10b981',
      '#a855f7',
      '#3b82f6',
      '#ef4444',
    ];

    return {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label: 'Valor',
            data: valores,
            backgroundColor:
              chartType === 'doughnut'
                ? coloresMultiples
                : chartType === 'line'
                  ? 'rgba(10, 77, 122, 0.12)'
                  : baseColor,
            borderColor: baseColor,
            borderWidth: chartType === 'line' ? 3 : 0,
            pointBackgroundColor: baseColor,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: chartType === 'line' ? 5 : 0,
            fill: detalle.tipoGrafica === 'area',
            tension: 0.4,
            borderRadius: chartType === 'bar' ? 8 : 0,
          },
        ],
      },
      options: {
        responsive: false,
        layout: { padding: 24 },
        plugins: {
          legend: {
            display: chartType === 'doughnut',
            position: 'right',
            labels: {
              font: { size: 13, family: 'DejaVu Sans' },
              padding: 14,
              color: this.C.text,
            },
          },
        },
        scales:
          chartType === 'doughnut'
            ? {}
            : {
                y: {
                  beginAtZero: true,
                  grid: { color: '#f3f4f6', drawBorder: false },
                  ticks: {
                    font: { size: 12, family: 'DejaVu Sans' },
                    color: this.C.textMuted,
                    padding: 8,
                  },
                },
                x: {
                  grid: { display: false },
                  ticks: {
                    font: { size: 12, family: 'DejaVu Sans' },
                    color: this.C.textMuted,
                    padding: 8,
                  },
                },
              },
      },
    };
  }

  // ============ HELPERS ============

  private formatearFecha(fechaIso: string): string {
    if (!fechaIso) return '-';
    const [year, month, day] = fechaIso.split('-');
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return `${parseInt(day, 10)} de ${meses[parseInt(month, 10) - 1]} de ${year}`;
  }

  private calcularDias(desde: string, hasta: string): number {
    if (!desde || !hasta) return 0;
    return (
      Math.ceil(
        (new Date(hasta).getTime() - new Date(desde).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1
    );
  }

  private dibujarLogoTexto(doc: any) {
    doc
      .fillColor('#ffffff')
      .fontSize(42)
      .font('Helvetica-Bold')
      .text('VORTIZ', this.P.margin, 80, { lineBreak: false });
    doc
      .fillColor('#bfdbfe')
      .fontSize(11)
      .font('Helvetica')
      .text('ARQUITECTOS - CONSULTORIA', this.P.margin, 132, {
        characterSpacing: 2,
        lineBreak: false,
      });
  }
}
