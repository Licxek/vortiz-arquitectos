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
  avatar: string | null;  // 👈 NUEVO
  rol: string;
  createdAt: string;
  updatedAt: string;
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
    avatar?: string | null;  // 👈 NUEVO
  }): Observable<PerfilUsuario> {
    return this.http.put<PerfilUsuario>(this.base, data);
  }

  cambiarPassword(actual: string, nueva: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/cambiar-password`, {
      actual,
      nueva,
    });
  }
}
