import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';


// ============ TIPOS DE KPIS ============

export interface SparklinePoint {
  fecha: string;
  valor: number;
}

export interface KpiCitas {
  valor: number;
  cambio: number;
  anterior: number;
  sparkline: SparklinePoint[];
}

export interface KpiTasaConfirmacion {
  valor: number;
  cambio: number;
  confirmadas: number;
  total: number;
}

export interface KpiEntero {
  valor: number;
}

export interface RangoFecha {
  desde: string;
  hasta: string;
}

export interface KpisDashboard {
  rango: RangoFecha;
  citas: KpiCitas;
  tasaConfirmacion: KpiTasaConfirmacion;
  servicios: KpiEntero;
  proyectos: KpiEntero;
}

// ============ TIPOS DE GRÁFICAS ============

export interface CitasPorMes {
  mes: string;
  label: string;
  valor: number;
}

export interface CategoriaServicio {
  categoria: string;
  label: string;
  valor: number;
}

export interface ActividadDia {
  fecha: string;
  label: string;
  valor: number;
}

export interface ClienteNuevo {
  mes: string;
  label: string;
  valor: number;
}

// ============ TIPOS DE DETALLE ============

export interface InsightDetalle {
  total: number;
  promedio: number;
  mejor: { label: string; valor: number };
  peor: { label: string; valor: number };
  cambio: number;
  totalAnterior: number;
}

export interface TablaDetalle {
  columnas: string[];
  filas: (string | number)[][];
}

export interface DetalleReporte {
  tipo: string;
  rango: { desde: string; hasta: string };
  serie: { label: string; valor: number }[];
  tipoGrafica: 'area' | 'donut' | 'line' | 'bar';
  unidad: string;
  insights: InsightDetalle;
  tabla: TablaDetalle;
}

export interface DetalleReporteVisitas extends DetalleReporte {
  topPaginas?: { nombre: string; vistas: number }[];
  topPaises?: { pais: string; usuarios: number }[];
  dispositivos?: { tipo: string; usuarios: number }[];
  topFuentes?: { fuente: string; usuarios: number }[];
}

// ============ TIPOS DE HEATMAP ============

export interface HeatmapPunto {
  x: string;
  y: number;
}

export interface HeatmapSerie {
  name: string;
  data: HeatmapPunto[];
}

export interface HeatmapInsights {
  mejorDia: { dia: string; valor: number };
  mejorHora: { hora: string; valor: number };
  mejorCombo: { dia: string; hora: string; valor: number };
  totalCitas: number;
}

export interface HeatmapData {
  series: HeatmapSerie[];
  horas: string[];
  insights: HeatmapInsights;
}

// ============ TIPOS DE FUNNEL ============

export interface FunnelEtapa {
  key: string;
  label: string;
  descripcion: string;
  valor: number;
  porcentaje: number;
  color: string;
}

export interface FunnelMetricas {
  total: number;
  tasaConfirmacion: number;
  tasaCompletada: number;
  tasaCancelacion: number;
  canceladas: number;
}

export interface FunnelData {
  rango: { desde: string; hasta: string };
  etapas: FunnelEtapa[];
  metricas: FunnelMetricas;
}

// ============ TIPOS DE PDF ============

export interface OpcionesGenerarPDF {
  desde?: string;
  hasta?: string;
  accion: 'descargar' | 'enviar' | 'ambas';
  destinatarios?: string[];
}

export interface RespuestaEnvioPDF {
  mensaje: string;
  destinatarios?: string[];
  previewUrl?: string;
}

// ============ SERVICE ============

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reportes`;

  obtenerKpis(desde?: string, hasta?: string): Observable<KpisDashboard> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<KpisDashboard>(`${this.apiUrl}/kpis`, { params });
  }

  obtenerCitasPorMes(): Observable<CitasPorMes[]> {
    return this.http.get<CitasPorMes[]>(`${this.apiUrl}/citas-por-mes`);
  }

  obtenerCategoriasServicios(): Observable<CategoriaServicio[]> {
    return this.http.get<CategoriaServicio[]>(`${this.apiUrl}/categorias-servicios`);
  }

  obtenerActividadSemanal(): Observable<ActividadDia[]> {
    return this.http.get<ActividadDia[]>(`${this.apiUrl}/actividad-semanal`);
  }

  obtenerClientesNuevos(): Observable<ClienteNuevo[]> {
    return this.http.get<ClienteNuevo[]>(`${this.apiUrl}/clientes-nuevos`);
  }

  obtenerDetalle(tipo: string, desde?: string, hasta?: string): Observable<DetalleReporte> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<DetalleReporte>(`${this.apiUrl}/detalle/${tipo}`, { params });
  }

  obtenerHeatmapHorarios(desde?: string, hasta?: string): Observable<HeatmapData> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<HeatmapData>(`${this.apiUrl}/heatmap-horarios`, { params });
  }

  obtenerFunnelConversion(desde?: string, hasta?: string): Observable<FunnelData> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<FunnelData>(`${this.apiUrl}/funnel-conversion`, { params });
  }

  /**
   * Genera el PDF y lo descarga como blob.
   * Úsalo para acciones 'descargar' o 'ambas'.
   */
  descargarReportePDF(tipo: string, opciones: OpcionesGenerarPDF): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/generar-pdf/${tipo}`, opciones, {
      responseType: 'blob',
    });
  }

  /**
   * Genera el PDF y lo envía por correo (sin descargar).
   * Úsalo para acción 'enviar'.
   */
  enviarReportePDF(tipo: string, opciones: OpcionesGenerarPDF): Observable<RespuestaEnvioPDF> {
    return this.http.post<RespuestaEnvioPDF>(`${this.apiUrl}/generar-pdf/${tipo}`, opciones);
  }
}
