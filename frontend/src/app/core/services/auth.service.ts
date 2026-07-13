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
    // 🔒 Al recargar la página, solo cargamos datos mínimos
    // El resto se obtiene con /auth/me (silencioso, en background)
    const raw = localStorage.getItem('vortiz_user_min');
    if (!raw) return null;
    try {
      const min = JSON.parse(raw);
      // Cargamos los datos completos en background al iniciar
      this.refrescarUsuarioDesdeBackend();
      return min as Usuario;
    } catch {
      return null;
    }
  }

  private refrescarUsuarioDesdeBackend() {
    if (!this.getToken()) return;
    // 🎯 Header custom para que el interceptor NO muestre modal si esto falla
    this.http.get<Usuario>(`${this.apiUrl}/me`, {
      headers: { 'X-Silent-Auth': '1' }
    }).subscribe({
      next: (usuario) => {
        this.usuarioSubject.next(usuario);
      },
      error: () => {
        // Falló silenciosamente. Los datos mínimos ya están cargados
        // desde localStorage, el usuario puede seguir usando la app.
      },
    });
  }

  login(correo: string, password: string): Observable<LoginResp> {
    return this.http.post<LoginResp>(`${this.apiUrl}/login`, { correo, password }).pipe(
      tap((resp) => {
        localStorage.setItem('vortiz_token', resp.token);
        // 🔒 Guardamos solo lo mínimo en localStorage
        // Datos completos siempre vienen del BehaviorSubject en memoria
        localStorage.setItem(
          'vortiz_user_min',
          JSON.stringify({
            id: resp.usuario.id,
            nombre: resp.usuario.nombre,
            rol: resp.usuario.rol,
          }),
        );
        this.usuarioSubject.next(resp.usuario);
      }),
    );
  }

  getUser(): Usuario | null {
    return this.usuarioSubject.value;
  }
  setUser(usuario: Usuario): void {
    localStorage.setItem(
      'vortiz_user_min',
      JSON.stringify({
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
      }),
    );
    this.usuarioSubject.next(usuario);
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
    localStorage.removeItem('vortiz_user');       // por si acaso queda del key viejo
    localStorage.removeItem('vortiz_user_min');   // el nuevo
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
