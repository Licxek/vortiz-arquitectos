// core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Usuario {
  id: number; nombre: string; apellidos: string; correo: string; rol: string;
}
interface LoginResp { token: string; usuario: Usuario; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(correo: string, password: string): Observable<LoginResp> {
    return this.http.post<LoginResp>(`${this.apiUrl}/login`, { correo, password }).pipe(
      tap(resp => {
        localStorage.setItem('vortiz_token', resp.token);
        localStorage.setItem('vortiz_user', JSON.stringify(resp.usuario));
      })
    );
  }

  getUser(): Usuario | null {
    const raw = localStorage.getItem('vortiz_user');
    return raw ? JSON.parse(raw) : null;
  }
  getToken(): string | null { return localStorage.getItem('vortiz_token'); }
  isLoggedIn(): boolean { return !!this.getToken(); }
  logout(): void {
    localStorage.removeItem('vortiz_token');
    localStorage.removeItem('vortiz_user');
  }

  solicitarRecuperacion(correo: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot`, { correo });
  }
  verificarCodigo(correo: string, codigo: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/verificar`, { correo, codigo });
  }
  restablecer(correo: string, codigo: string, password: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset`, { correo, codigo, password });
  }
}
