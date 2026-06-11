import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PerfilUsuario {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  avatar: string | null; // 👈 NUEVO
  rol: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sesion {
  id: number;
  navegador: string;
  sistemaOperativo: string;
  dispositivo: string;
  ip: string | null;
  ubicacion: string | null;
  ultimoAcceso: string;
  creadaEn: string;
  esActual: boolean;
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/perfil`;

  obtener(): Observable<PerfilUsuario> {
    return this.http.get<PerfilUsuario>(this.base);
  }

  actualizar(data: {
    nombre?: string;
    apellidos?: string;
    correo?: string;
    telefono?: string | null;
    avatar?: string | null;
    codigo?: string; // 👈 AGREGA esto para el código de verificación
  }): Observable<PerfilUsuario> {
    return this.http.patch<PerfilUsuario>(this.base, data); // 👈 PATCH, no PUT
  }

  cambiarPassword(actual: string, nueva: string, codigo: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/cambiar-password`, {
      actual,
      nueva,
      codigo, // 👈 NUEVO
    });
  }

  solicitarCodigo(proposito: 'cambiar_correo' | 'cambiar_password', payload?: any) {
    return this.http.post<{ message: string }>(
      `${this.base}/solicitar-codigo`, // ✅ usa la misma base
      { proposito, payload },
    );
  }
  listarSesiones(): Observable<Sesion[]> {
    return this.http.get<Sesion[]>(`${this.base}/sesiones`);
  }

  cerrarSesion(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/sesiones/${id}`);
  }

  cerrarOtrasSesiones(): Observable<{ message: string; cerradas: number }> {
    return this.http.delete<{ message: string; cerradas: number }>(`${this.base}/sesiones`);
  }
}
