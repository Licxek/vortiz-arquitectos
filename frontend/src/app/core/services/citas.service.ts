import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TipoCita = 'consulta' | 'proyecto';
export type EstadoCita = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

export interface CrearCitaDto {
  nombre: string;
  correo: string;
  telefono: string;
  tipo: TipoCita;
  servicioId?: number | null;
  motivo?: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
}

export interface Cita {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  tipo: TipoCita;
  servicioId: number | null;
  servicio?: { id: number; titulo: string; categoria: string } | null;
  motivo: string;
  fecha: string;
  hora: string;
  duracion: number;
  estado: EstadoCita;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CitasService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/citas`;

  // Público
  crear(data: CrearCitaDto): Observable<Cita> {
    return this.http.post<Cita>(this.base, data);
  }

  // Admin (los siguientes los usaremos en la etapa 3)
  listar(): Observable<Cita[]> {
    return this.http.get<Cita[]>(this.base);
  }

  obtener(id: number): Observable<Cita> {
    return this.http.get<Cita>(`${this.base}/${id}`);
  }

  cambiarEstado(id: number, estado: EstadoCita): Observable<Cita> {
    return this.http.patch<Cita>(`${this.base}/${id}/estado`, { estado });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
