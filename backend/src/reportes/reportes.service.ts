import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cita } from '../citas/cita.entity';
import { Servicio } from '../servicios/servicio.entity';
import { Proyecto } from '../proyectos/proyecto.entity';

export interface SparklinePoint {
  fecha: string; // YYYY-MM-DD
  valor: number;
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Cita) private readonly citasRepo: Repository<Cita>,
    @InjectRepository(Servicio)
    private readonly serviciosRepo: Repository<Servicio>,
    @InjectRepository(Proyecto)
    private readonly proyectosRepo: Repository<Proyecto>,
  ) {}

  /**
   * Devuelve los 4 KPIs del dashboard para el rango dado.
   * Si no se especifica rango, usa últimos 30 días.
   */
  async obtenerKpis(desde?: string, hasta?: string) {
    const { fechaDesde, fechaHasta } = this.normalizarRango(desde, hasta);
    const { anteriorDesde, anteriorHasta } = this.calcularPeriodoAnterior(
      fechaDesde,
      fechaHasta,
    );

    // === CITAS EN PERIODO + Cambio % ===
    const citasActual = await this.contarCitasEnRango(fechaDesde, fechaHasta);
    const citasAnterior = await this.contarCitasEnRango(
      anteriorDesde,
      anteriorHasta,
    );
    const cambioCitas = this.calcularCambioPorcentual(
      citasActual,
      citasAnterior,
    );
    const sparklineCitas = await this.sparklineCitas(fechaDesde, fechaHasta);

    // === TASA DE CONFIRMACIÓN ===
    const confirmadasActual = await this.contarCitasEnRango(
      fechaDesde,
      fechaHasta,
      ['confirmada', 'completada'],
    );
    const confirmadasAnterior = await this.contarCitasEnRango(
      anteriorDesde,
      anteriorHasta,
      ['confirmada', 'completada'],
    );
    const tasaActual =
      citasActual > 0 ? (confirmadasActual / citasActual) * 100 : 0;
    const tasaAnterior =
      citasAnterior > 0 ? (confirmadasAnterior / citasAnterior) * 100 : 0;
    const cambioTasa = this.calcularCambioPorcentual(tasaActual, tasaAnterior);

    // === TOTALES ESTÁTICOS (no dependen del rango) ===
    const totalServicios = await this.serviciosRepo.count();
    const totalProyectos = await this.proyectosRepo.count();

    return {
      rango: {
        desde: this.toIsoDate(fechaDesde),
        hasta: this.toIsoDate(fechaHasta),
      },
      citas: {
        valor: citasActual,
        cambio: Number(cambioCitas.toFixed(1)),
        anterior: citasAnterior,
        sparkline: sparklineCitas,
      },
      tasaConfirmacion: {
        valor: Number(tasaActual.toFixed(1)),
        cambio: Number(cambioTasa.toFixed(1)),
        confirmadas: confirmadasActual,
        total: citasActual,
      },
      servicios: { valor: totalServicios },
      proyectos: { valor: totalProyectos },
    };
  }

  // ============ GRÁFICAS PARA DASHBOARD ============

  /**
   * Citas por mes (últimos 12 meses).
   * Para gráfica área/línea.
   */
  async obtenerCitasPorMes() {
    const hoy = new Date();
    const haceUnAnio = new Date(hoy.getFullYear() - 1, hoy.getMonth() + 1, 1);
    const desdeStr = this.toIsoDate(haceUnAnio);

    const rows = await this.citasRepo
      .createQueryBuilder('cita')
      .select(`TO_CHAR(cita.fecha, 'YYYY-MM')`, 'mes')
      .addSelect('COUNT(*)', 'valor')
      .where('cita.fecha >= :desde', { desde: desdeStr })
      .groupBy(`TO_CHAR(cita.fecha, 'YYYY-MM')`)
      .orderBy('mes', 'ASC')
      .getRawMany();

    // Rellenar meses sin datos con 0
    const meses: { mes: string; label: string; valor: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = rows.find((r: any) => r.mes === mesKey);
      meses.push({
        mes: mesKey,
        label: this.mesLabelCorto(d),
        valor: row ? Number(row.valor) : 0,
      });
    }

    return meses;
  }

  /**
   * Distribución por categoría de servicio.
   * Para gráfica donut/pie.
   */
  async obtenerCategoriasServicios() {
    const rows = await this.citasRepo
      .createQueryBuilder('cita')
      .leftJoin('cita.servicio', 'servicio')
      .select(`COALESCE(servicio.categoria, 'sin_categoria')`, 'categoria')
      .addSelect('COUNT(*)', 'valor')
      .groupBy('servicio.categoria')
      .orderBy('valor', 'DESC')
      .getRawMany();

    return rows.map((r: any) => ({
      categoria: r.categoria,
      label: this.categoriaLabel(r.categoria),
      valor: Number(r.valor),
    }));
  }

  /**
   * Actividad de citas en los últimos 7 días.
   * Para gráfica línea/área pequeña.
   */
  async obtenerActividadSemanal() {
    // Últimos 30 días (más robusto que 7 o 14)
    const hoy = new Date();
    const dias = 30;
    const desde = new Date(hoy.getTime() - (dias - 1) * 24 * 60 * 60 * 1000);
    const desdeStr = this.toIsoDate(desde);
    const hastaStr = this.toIsoDate(hoy);

    const rows = await this.citasRepo
      .createQueryBuilder('cita')
      .select('cita.fecha', 'fecha')
      .addSelect('COUNT(*)', 'valor')
      .where('cita.fecha >= :desde AND cita.fecha <= :hasta', {
        desde: desdeStr,
        hasta: hastaStr,
      })
      .groupBy('cita.fecha')
      .orderBy('cita.fecha', 'ASC')
      .getRawMany();

    // Rellenar TODOS los días del rango (con 0 si no hay citas)
    const resultado: { fecha: string; label: string; valor: number }[] = [];
    for (let i = 0; i < dias; i++) {
      const d = new Date(desde.getTime() + i * 24 * 60 * 60 * 1000);
      const fechaStr = this.toIsoDate(d);
      const row = rows.find((r: any) => {
        // r.fecha puede venir como Date o string, normalizamos
        const rFecha =
          typeof r.fecha === 'string'
            ? r.fecha
            : this.toIsoDate(new Date(r.fecha));
        return rFecha === fechaStr;
      });
      resultado.push({
        fecha: fechaStr,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        valor: row ? Number(row.valor) : 0,
      });
    }

    // Log para debug
    const totalCitas = resultado.reduce((sum, d) => sum + d.valor, 0);
    console.log(
      `📊 Actividad: ${totalCitas} citas en últimos ${dias} días (${desdeStr} a ${hastaStr})`,
    );

    return resultado;
  }

  /**
   * Clientes nuevos por mes (correo único, primera vez que aparece).
   * Para gráfica barras.
   */
  async obtenerClientesNuevos() {
    const result = await this.citasRepo.manager.query(`
    SELECT
      TO_CHAR(primera_fecha, 'YYYY-MM') AS mes,
      COUNT(*) AS valor
    FROM (
      SELECT correo, MIN(fecha) AS primera_fecha
      FROM citas
      GROUP BY correo
    ) AS primera_aparicion
    WHERE primera_fecha >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY mes
    ORDER BY mes ASC
  `);

    // Rellenar meses sin clientes nuevos
    const hoy = new Date();
    const meses: { mes: string; label: string; valor: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = result.find((r: any) => r.mes === mesKey);
      meses.push({
        mes: mesKey,
        label: this.mesLabelCorto(d),
        valor: row ? Number(row.valor) : 0,
      });
    }

    return meses;
  }

  // ============ HELPERS DE FORMATEO ============

  private mesLabelCorto(d: Date): string {
    const meses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return meses[d.getMonth()];
  }

  private diaSemanaLabel(d: Date): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[d.getDay()];
  }

  private categoriaLabel(categoria: string): string {
    const map: Record<string, string> = {
      tramites: 'Trámites',
      gerencia: 'Gerencia',
      diseno: 'Diseño',
      construccion: 'Construcción',
      especiales: 'Especiales',
      sin_categoria: 'Sin categoría',
    };
    return map[categoria] || categoria;
  }

  // ============ HELPERS PRIVADOS ============

  private normalizarRango(desde?: string, hasta?: string) {
    const fechaHasta = hasta ? new Date(hasta + 'T23:59:59') : new Date();
    const fechaDesde = desde
      ? new Date(desde + 'T00:00:00')
      : new Date(fechaHasta.getTime() - 29 * 24 * 60 * 60 * 1000); // últimos 30 días
    return { fechaDesde, fechaHasta };
  }

  private calcularPeriodoAnterior(desde: Date, hasta: Date) {
    const diasRango = Math.ceil(
      (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24),
    );
    const anteriorHasta = new Date(desde.getTime() - 1);
    const anteriorDesde = new Date(
      anteriorHasta.getTime() - diasRango * 24 * 60 * 60 * 1000,
    );
    return { anteriorDesde, anteriorHasta };
  }

  private calcularCambioPorcentual(actual: number, anterior: number): number {
    if (anterior === 0) return actual > 0 ? 100 : 0;
    return ((actual - anterior) / anterior) * 100;
  }

  private toIsoDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private async contarCitasEnRango(
    desde: Date,
    hasta: Date,
    estados?: string | string[],
  ): Promise<number> {
    const desdeStr = this.toIsoDate(desde);
    const hastaStr = this.toIsoDate(hasta);

    const qb = this.citasRepo
      .createQueryBuilder('cita')
      .where('cita.fecha >= :desde AND cita.fecha <= :hasta', {
        desde: desdeStr,
        hasta: hastaStr,
      });

    if (estados) {
      const estadosArray = Array.isArray(estados) ? estados : [estados];
      qb.andWhere('cita.estado IN (:...estados)', { estados: estadosArray });
    }

    return qb.getCount();
  }

  private async sparklineCitas(
    desde: Date,
    hasta: Date,
  ): Promise<SparklinePoint[]> {
    const desdeStr = this.toIsoDate(desde);
    const hastaStr = this.toIsoDate(hasta);

    const rows = await this.citasRepo
      .createQueryBuilder('cita')
      .select('cita.fecha', 'fecha')
      .addSelect('COUNT(*)', 'valor')
      .where('cita.fecha >= :desde AND cita.fecha <= :hasta', {
        desde: desdeStr,
        hasta: hastaStr,
      })
      .groupBy('cita.fecha')
      .orderBy('cita.fecha', 'ASC')
      .getRawMany();

    return rows.map((r: any) => ({
      fecha: r.fecha,
      valor: Number(r.valor),
    }));
  }

  // ============ DETALLE UNIFICADO (Fase 3) ============

  /**
   * Devuelve el payload completo para la página de detalle:
   * serie de datos + tipo de gráfica + insights + tabla.
   */
  async obtenerDetalle(tipo: string, desde?: string, hasta?: string) {
    const tiposValidos = [
      'citas-por-mes',
      'categorias-servicios',
      'actividad-semanal',
      'clientes-nuevos',
    ];
    if (!tiposValidos.includes(tipo)) {
      throw new Error(`Tipo de reporte no válido: ${tipo}`);
    }

    const { fechaDesde, fechaHasta } = this.normalizarRango(desde, hasta);
    const { anteriorDesde, anteriorHasta } = this.calcularPeriodoAnterior(
      fechaDesde,
      fechaHasta,
    );

    // Configuración por tipo
    const configs: {
      [key: string]: {
        tipoGrafica: string;
        unidad: string;
        columnaLabel: string;
      };
    } = {
      'citas-por-mes': {
        tipoGrafica: 'area',
        unidad: 'citas',
        columnaLabel: 'Mes',
      },
      'categorias-servicios': {
        tipoGrafica: 'donut',
        unidad: 'citas',
        columnaLabel: 'Categoría',
      },
      'actividad-semanal': {
        tipoGrafica: 'line',
        unidad: 'citas',
        columnaLabel: 'Día',
      },
      'clientes-nuevos': {
        tipoGrafica: 'bar',
        unidad: 'clientes',
        columnaLabel: 'Mes',
      },
    };

    const { tipoGrafica, unidad, columnaLabel } = configs[tipo];

    // Series del período actual y anterior
    const serie = await this.obtenerSerieDetalle(tipo, fechaDesde, fechaHasta);
    const serieAnterior = await this.obtenerSerieDetalle(
      tipo,
      anteriorDesde,
      anteriorHasta,
    );

    // Insights
    const total = serie.reduce((sum, p) => sum + p.valor, 0);
    const promedio = serie.length > 0 ? total / serie.length : 0;
    const sorted = [...serie]
      .filter((p) => p.valor > 0)
      .sort((a, b) => b.valor - a.valor);
    const mejor = sorted[0] || { label: '—', valor: 0 };
    const peor = sorted[sorted.length - 1] || { label: '—', valor: 0 };
    const totalAnterior = serieAnterior.reduce((sum, p) => sum + p.valor, 0);
    const cambio = this.calcularCambioPorcentual(total, totalAnterior);

    // Tabla con cambio vs período anterior fila por fila
    const tabla = {
      columnas: [
        columnaLabel,
        unidad === 'citas' ? 'Citas' : 'Clientes',
        'vs Anterior',
      ],
      filas: serie.map((p, i) => {
        const prev = i > 0 ? serie[i - 1].valor : null;
        const cambioP =
          prev !== null && prev > 0 ? ((p.valor - prev) / prev) * 100 : null;
        return [
          p.label,
          String(p.valor),
          cambioP !== null
            ? `${cambioP >= 0 ? '+' : ''}${cambioP.toFixed(0)}%`
            : '—',
        ];
      }),
    };

    return {
      tipo,
      rango: {
        desde: this.toIsoDate(fechaDesde),
        hasta: this.toIsoDate(fechaHasta),
      },
      serie,
      tipoGrafica,
      unidad,
      insights: {
        total,
        promedio: Number(promedio.toFixed(1)),
        mejor,
        peor,
        cambio: Number(cambio.toFixed(1)),
        totalAnterior,
      },
      tabla,
    };
  }

  private async obtenerSerieDetalle(
    tipo: string,
    desde: Date,
    hasta: Date,
  ): Promise<{ label: string; valor: number }[]> {
    switch (tipo) {
      case 'citas-por-mes':
        return this.serieCitasPorMes(desde, hasta);
      case 'categorias-servicios':
        return this.serieCategoriasServicios(desde, hasta);
      case 'actividad-semanal':
        return this.serieActividadSemanal(desde, hasta);
      case 'clientes-nuevos':
        return this.serieClientesNuevos(desde, hasta);
      default:
        return [];
    }
  }

  private async serieCitasPorMes(
    desde: Date,
    hasta: Date,
  ): Promise<{ label: string; valor: number }[]> {
    const desdeStr = this.toIsoDate(desde);
    const hastaStr = this.toIsoDate(hasta);

    const rows = await this.citasRepo
      .createQueryBuilder('cita')
      .select(`TO_CHAR(cita.fecha, 'YYYY-MM')`, 'mes')
      .addSelect('COUNT(*)', 'valor')
      .where('cita.fecha >= :desde AND cita.fecha <= :hasta', {
        desde: desdeStr,
        hasta: hastaStr,
      })
      .groupBy(`TO_CHAR(cita.fecha, 'YYYY-MM')`)
      .orderBy('mes', 'ASC')
      .getRawMany();

    const meses: { label: string; valor: number }[] = [];
    const actual = new Date(desde.getFullYear(), desde.getMonth(), 1);
    const fin = new Date(hasta.getFullYear(), hasta.getMonth(), 1);

    while (actual <= fin) {
      const mesKey = `${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, '0')}`;
      const row = rows.find((r: any) => r.mes === mesKey);
      meses.push({
        label: `${this.mesLabelCorto(actual)} ${actual.getFullYear()}`,
        valor: row ? Number(row.valor) : 0,
      });
      actual.setMonth(actual.getMonth() + 1);
    }

    return meses;
  }

  private async serieCategoriasServicios(
    desde: Date,
    hasta: Date,
  ): Promise<{ label: string; valor: number }[]> {
    const desdeStr = this.toIsoDate(desde);
    const hastaStr = this.toIsoDate(hasta);

    const rows = await this.citasRepo
      .createQueryBuilder('cita')
      .leftJoin('cita.servicio', 'servicio')
      .select(`COALESCE(servicio.categoria, 'sin_categoria')`, 'categoria')
      .addSelect('COUNT(*)', 'valor')
      .where('cita.fecha >= :desde AND cita.fecha <= :hasta', {
        desde: desdeStr,
        hasta: hastaStr,
      })
      .groupBy('servicio.categoria')
      .orderBy('valor', 'DESC')
      .getRawMany();

    return rows.map((r: any) => ({
      label: this.categoriaLabel(r.categoria),
      valor: Number(r.valor),
    }));
  }

  private async serieActividadSemanal(
    desde: Date,
    hasta: Date,
  ): Promise<{ label: string; valor: number }[]> {
    const desdeStr = this.toIsoDate(desde);
    const hastaStr = this.toIsoDate(hasta);

    const rows = await this.citasRepo
      .createQueryBuilder('cita')
      .select('cita.fecha', 'fecha')
      .addSelect('COUNT(*)', 'valor')
      .where('cita.fecha >= :desde AND cita.fecha <= :hasta', {
        desde: desdeStr,
        hasta: hastaStr,
      })
      .groupBy('cita.fecha')
      .orderBy('cita.fecha', 'ASC')
      .getRawMany();

    const dias: { label: string; valor: number }[] = [];
    const diasRango =
      Math.ceil((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) +
      1;

    for (let i = 0; i < diasRango; i++) {
      const d = new Date(desde.getTime() + i * 24 * 60 * 60 * 1000);
      const fechaStr = this.toIsoDate(d);
      const row = rows.find((r: any) => {
        const rFecha =
          typeof r.fecha === 'string'
            ? r.fecha
            : this.toIsoDate(new Date(r.fecha));
        return rFecha === fechaStr;
      });

      const label =
        diasRango <= 31
          ? `${this.diaSemanaLabel(d)} ${d.getDate()}`
          : `${d.getDate()}/${d.getMonth() + 1}`;

      dias.push({
        label,
        valor: row ? Number(row.valor) : 0,
      });
    }

    return dias;
  }

  private async serieClientesNuevos(
    desde: Date,
    hasta: Date,
  ): Promise<{ label: string; valor: number }[]> {
    const desdeStr = this.toIsoDate(desde);
    const hastaStr = this.toIsoDate(hasta);

    const result = await this.citasRepo.manager.query(
      `
    SELECT
      TO_CHAR(primera_fecha, 'YYYY-MM') AS mes,
      COUNT(*) AS valor
    FROM (
      SELECT correo, MIN(fecha) AS primera_fecha
      FROM citas
      GROUP BY correo
    ) AS primera_aparicion
    WHERE primera_fecha >= $1 AND primera_fecha <= $2
    GROUP BY mes
    ORDER BY mes ASC
  `,
      [desdeStr, hastaStr],
    );

    const meses: { label: string; valor: number }[] = [];
    const actual = new Date(desde.getFullYear(), desde.getMonth(), 1);
    const fin = new Date(hasta.getFullYear(), hasta.getMonth(), 1);

    while (actual <= fin) {
      const mesKey = `${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, '0')}`;
      const row = result.find((r: any) => r.mes === mesKey);
      meses.push({
        label: `${this.mesLabelCorto(actual)} ${actual.getFullYear()}`,
        valor: row ? Number(row.valor) : 0,
      });
      actual.setMonth(actual.getMonth() + 1);
    }

    return meses;
  }
  // ============ HEATMAP DE HORARIOS (Fase 4) ============

  /**
   * Devuelve la matriz de citas por (día de semana × hora).
   * Formato listo para ApexCharts heatmap.
   */
  async obtenerHeatmapHorarios(desde?: string, hasta?: string) {
    const { fechaDesde, fechaHasta } = this.normalizarRango(desde, hasta);
    const desdeStr = this.toIsoDate(fechaDesde);
    const hastaStr = this.toIsoDate(fechaHasta);

    const rows = await this.citasRepo.manager.query(
      `
    SELECT
      EXTRACT(DOW FROM fecha)::int AS dia_num,
      hora,
      COUNT(*)::int AS valor
    FROM citas
    WHERE fecha >= $1 AND fecha <= $2
    GROUP BY EXTRACT(DOW FROM fecha), hora
    ORDER BY dia_num, hora
  `,
      [desdeStr, hastaStr],
    );

    // Orden Lun → Dom (más natural visual)
    const diasOrden = [1, 2, 3, 4, 5, 6, 0];
    const diasLabels: { [key: number]: string } = {
      0: 'Dom',
      1: 'Lun',
      2: 'Mar',
      3: 'Mié',
      4: 'Jue',
      5: 'Vie',
      6: 'Sáb',
    };

    // Horas relevantes: las que aparecen + horas típicas de trabajo
    const horasSet = new Set<string>();
    rows.forEach((r: any) => horasSet.add(r.hora));
    for (let h = 9; h <= 18; h++) {
      horasSet.add(String(h).padStart(2, '0') + ':00');
      horasSet.add(String(h).padStart(2, '0') + ':30');
    }
    const horas = Array.from(horasSet).sort();

    // Series para ApexCharts (una por día)
    const series = diasOrden.map((dia) => ({
      name: diasLabels[dia],
      data: horas.map((hora) => {
        const row = rows.find(
          (r: any) => Number(r.dia_num) === dia && r.hora === hora,
        );
        return { x: hora, y: row ? Number(row.valor) : 0 };
      }),
    }));

    // Insights: mejor día, mejor hora, mejor combo
    const valoresPorDia: { [key: string]: number } = {};
    const valoresPorHora: { [key: string]: number } = {};
    let mejorCombo = { dia: '—', hora: '—', valor: 0 };

    series.forEach((serie) => {
      serie.data.forEach((punto: { x: string; y: number }) => {
        valoresPorDia[serie.name] = (valoresPorDia[serie.name] || 0) + punto.y;
        valoresPorHora[punto.x] = (valoresPorHora[punto.x] || 0) + punto.y;
        if (punto.y > mejorCombo.valor) {
          mejorCombo = { dia: serie.name, hora: punto.x, valor: punto.y };
        }
      });
    });

    const mejorDia = Object.entries(valoresPorDia).reduce(
      (acc, [dia, valor]) => (valor > acc.valor ? { dia, valor } : acc),
      { dia: '—', valor: 0 },
    );
    const mejorHora = Object.entries(valoresPorHora).reduce(
      (acc, [hora, valor]) => (valor > acc.valor ? { hora, valor } : acc),
      { hora: '—', valor: 0 },
    );

    return {
      series,
      horas,
      insights: {
        mejorDia,
        mejorHora,
        mejorCombo,
        totalCitas: Object.values(valoresPorDia).reduce((a, b) => a + b, 0),
      },
    };
  }
  // ============ FUNNEL DE CONVERSIÓN (Fase 4) ============

  /**
   * Devuelve el funnel de conversión: agendadas → confirmadas → completadas.
   * Más métricas de cancelación.
   */
  async obtenerFunnelConversion(desde?: string, hasta?: string) {
    const { fechaDesde, fechaHasta } = this.normalizarRango(desde, hasta);
    const desdeStr = this.toIsoDate(fechaDesde);
    const hastaStr = this.toIsoDate(fechaHasta);

    // Conteos por estado
    const rows = await this.citasRepo
      .createQueryBuilder('cita')
      .select('cita.estado', 'estado')
      .addSelect('COUNT(*)', 'valor')
      .where('cita.fecha >= :desde AND cita.fecha <= :hasta', {
        desde: desdeStr,
        hasta: hastaStr,
      })
      .groupBy('cita.estado')
      .getRawMany();

    const conteos: { [key: string]: number } = {
      pendiente: 0,
      confirmada: 0,
      completada: 0,
      cancelada: 0,
    };
    rows.forEach((r: any) => {
      conteos[r.estado] = Number(r.valor);
    });

    const total =
      conteos.pendiente +
      conteos.confirmada +
      conteos.completada +
      conteos.cancelada;
    const confirmadas = conteos.confirmada + conteos.completada;
    const completadas = conteos.completada;

    const pct = (valor: number) =>
      total > 0 ? Number(((valor / total) * 100).toFixed(1)) : 0;

    const etapas = [
      {
        key: 'agendadas',
        label: 'Citas agendadas',
        descripcion: 'Total reservado en el período',
        valor: total,
        porcentaje: 100,
        color: '#0a4d7a',
      },
      {
        key: 'confirmadas',
        label: 'Confirmadas',
        descripcion: 'El cliente confirmó asistencia',
        valor: confirmadas,
        porcentaje: pct(confirmadas),
        color: '#3b82f6',
      },
      {
        key: 'completadas',
        label: 'Completadas',
        descripcion: 'La cita se realizó exitosamente',
        valor: completadas,
        porcentaje: pct(completadas),
        color: '#10b981',
      },
    ];

    return {
      rango: { desde: desdeStr, hasta: hastaStr },
      etapas,
      metricas: {
        total,
        tasaConfirmacion: pct(confirmadas),
        tasaCompletada: pct(completadas),
        tasaCancelacion: pct(conteos.cancelada),
        canceladas: conteos.cancelada,
      },
    };
  }
}
