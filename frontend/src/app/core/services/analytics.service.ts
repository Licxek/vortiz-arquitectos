import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VisitasGA {
  valor: number;
  cambio: number;
}

export interface DashboardGA {
  configurado: boolean;
  periodo?: string;
  sparkline?: { fecha: string; valor: number }[];
  topPaginas?: { nombre: string; vistas: number }[];
  topPaises?: { pais: string; usuarios: number }[];
  dispositivos?: { tipo: string; usuarios: number }[];
  topFuentes?: { fuente: string; usuarios: number }[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/analytics`;

  estado(): Observable<{ configurado: boolean }> {
    return this.http
      .get<{ configurado: boolean }>(`${this.base}/estado`)
      .pipe(catchError(() => of({ configurado: false })));
  }

  obtenerVisitas(periodo: string): Observable<VisitasGA> {
    return this.http
      .get<VisitasGA>(`${this.base}/visitas`, { params: { periodo } })
      .pipe(catchError(() => of({ valor: 0, cambio: 0 })));
  }

  obtenerDashboard(): Observable<DashboardGA> {
    return this.http
      .get<DashboardGA>(`${this.base}/dashboard`)
      .pipe(catchError(() => of({ configurado: false } as DashboardGA)));
  }
}
