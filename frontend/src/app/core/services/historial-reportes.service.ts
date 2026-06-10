import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReporteHistorial {
  id: number;
  tipo: string;
  titulo: string;
  descripcion: string;
  rangoDesde: string;
  rangoHasta: string;
  archivo: string;
  tamanioKb: number;
  destinatarios: string[];
  emailEnviado: boolean;
  generadoPor?: { id: number; nombre: string; apellidos: string };
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface FiltrosHistorial {
  tipo?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
}

export interface RespuestaReenvio {
  mensaje: string;
  destinatarios: string[];
  previewUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class HistorialReportesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reportes/historial`;

  listar(filtros?: FiltrosHistorial): Observable<ReporteHistorial[]> {
    let params = new HttpParams();
    if (filtros?.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros?.desde) params = params.set('desde', filtros.desde);
    if (filtros?.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros?.limit) params = params.set('limit', String(filtros.limit));
    return this.http.get<ReporteHistorial[]>(this.apiUrl, { params });
  }

  descargar(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/descargar`, {
      responseType: 'blob',
    });
  }

  reenviar(id: number, destinatarios: string[]): Observable<RespuestaReenvio> {
    return this.http.post<RespuestaReenvio>(
      `${this.apiUrl}/${id}/reenviar`,
      { destinatarios },
    );
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${id}`);
  }
}
