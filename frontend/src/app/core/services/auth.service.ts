// core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Usuario {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  telefono?: string | null;
  avatar?: string | null;
}

interface LoginResp {
  token: string;
  usuario: Usuario;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  // 👇 NUEVO: BehaviorSubject reactivo
  private usuarioSubject = new BehaviorSubject<Usuario | null>(this.cargarUsuarioInicial());
  usuario$ = this.usuarioSubject.asObservable();

  constructor(private http: HttpClient) {}

  private cargarUsuarioInicial(): Usuario | null {
    const raw = localStorage.getItem('vortiz_user');
    return raw ? JSON.parse(raw) : null;
  }

  login(correo: string, password: string): Observable<LoginResp> {
    return this.http.post<LoginResp>(`${this.apiUrl}/login`, { correo, password }).pipe(
      tap((resp) => {
        localStorage.setItem('vortiz_token', resp.token);
        localStorage.setItem('vortiz_user', JSON.stringify(resp.usuario));
        this.usuarioSubject.next(resp.usuario); // 👈 emitir cambio
      }),
    );
  }

  getUser(): Usuario | null {
    return this.usuarioSubject.value;
  }

  setUser(usuario: Usuario): void {
    localStorage.setItem('vortiz_user', JSON.stringify(usuario));
    this.usuarioSubject.next(usuario); // 👈 emitir cambio
  }

  getToken(): string | null {
    return localStorage.getItem('vortiz_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout() {
    const token = this.getToken();

    // Si hay token, avisamos al backend para cerrar la sesión en BD
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
        complete: () => this.limpiarSesion(),
        error: () => this.limpiarSesion(), // limpiamos incluso si falla
      });
    } else {
      this.limpiarSesion();
    }
  }

  private limpiarSesion() {
    localStorage.removeItem('vortiz_token');
    localStorage.removeItem('vortiz_user');
    this.usuarioSubject.next(null);
  }

  solicitarRecuperacion(correo: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot`, { correo });
  }

  verificarCodigo(correo: string, codigo: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/verificar`, { correo, codigo });
  }

  restablecer(correo: string, codigo: string, password: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset`, {
      correo,
      codigo,
      password,
    });
  }
  logoutLocal() {
    this.limpiarSesion();
  }
}
