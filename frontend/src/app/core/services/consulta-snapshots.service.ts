import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConsultaSnapshot {
  id: number;
  citaId: number;
  motivo: 'automatico_resuelto' | 'automatico_archivado' | 'manual';
  clienteSnapshot: {
    nombre: string;
    correo: string;
    telefono: string;
  };
  consultaSnapshot: {
    id: number;
    tipo: string;
    motivo: string;
    servicio: string | null;
    fecha: string;
    hora: string;
    estado: string;
    createdAt: string;
  };
  mensajesSnapshot: Array<{
    id: number;
    autor: 'cliente' | 'admin';
    texto: string;
    metodo: string | null;
    createdAt: string;
  }>;
  totalMensajes: number;
  duracionDias: number | null;
  creadoPor: number | null;
  usuario?: { id: number; nombre: string; correo: string } | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ConsultaSnapshotsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/consulta-snapshots`;

  crear(citaId: number, motivo: 'automatico_resuelto' | 'automatico_archivado' | 'manual'): Observable<ConsultaSnapshot> {
    return this.http.post<ConsultaSnapshot>(this.base, { citaId, motivo });
  }

  listarTodos(): Observable<ConsultaSnapshot[]> {
    return this.http.get<ConsultaSnapshot[]>(this.base);
  }

  obtenerPorCita(citaId: number): Observable<ConsultaSnapshot[]> {
    return this.http.get<ConsultaSnapshot[]>(`${this.base}/por-cita/${citaId}`);
  }

  obtenerPorId(id: number): Observable<ConsultaSnapshot> {
    return this.http.get<ConsultaSnapshot>(`${this.base}/${id}`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
