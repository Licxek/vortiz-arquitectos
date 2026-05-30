import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Periodo = 'hoy' | 'semana' | 'mes' | 'año';

export interface CitaBackend {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  tipo: 'consulta' | 'proyecto';
  servicioId: number | null;
  servicio?: { id: number; titulo: string; categoria: string } | null;
  motivo: string;
  fecha: string;
  hora: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
  createdAt: string;
  updatedAt: string;
}

export interface StatsResponse {
  periodo: string;
  citas: { valor: number; cambio: number };
  consultas: { valor: number; cambio: number };
  proyectos: { valor: number };
  visitas: { valor: number };
}

@Injectable({ providedIn: 'root' })
export class InicioService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/inicio`;

  obtenerStats(periodo: Periodo): Observable<StatsResponse> {
    const p = periodo === 'año' ? 'anio' : periodo;
    return this.http.get<StatsResponse>(`${this.base}/stats?periodo=${p}`);
  }

  obtenerAgenda(): Observable<CitaBackend[]> {
    return this.http.get<CitaBackend[]>(`${this.base}/agenda`);
  }

  obtenerConsultas(): Observable<CitaBackend[]> {
    return this.http.get<CitaBackend[]>(`${this.base}/consultas-pendientes`);
  }
}
