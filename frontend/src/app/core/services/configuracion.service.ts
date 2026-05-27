import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Configuracion {
  id: number;
  logo_url: string;
  logo_footer_url: string;
  telefono: string;
  correo_contacto: string;
  direccion: string;
  redes: { nombre: string; icono: string; url: string }[];
  horario: string;
  color_degradado_inicio: string;
  color_degradado_fin: string;
  color_primario: string;
  color_secundario: string;
  color_texto_nav: string;
  color_texto_footer: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  nombre: string;
  eslogan: string;
}

export interface ConfiguracionCompleta {
  id: number;
  negocio: any;
  contacto: any;
  redes: any[];
  agenda: any;
  apariencia: any;
  notificaciones: any;
  seo: any;
}

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private base = `${environment.apiUrl}/configuracion`;
  private publicaSubject = new BehaviorSubject<Configuracion | null>(null);
  configPublica$ = this.publicaSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Pública (header, footer, login) — la que ya usabas
  getConfiguracion(): Observable<Configuracion> {
    return this.http.get<Configuracion>(`${this.base}/publica`).pipe(
      catchError(() => of({
        id: 1,
        logo_url: '/assets/img/logo.png',
        logo_footer_url: '/assets/img/logo_vortiz.png',
        telefono: '+52 000-000-0000',
        correo_contacto: 'contacto@vortizarquitectos.com',
        direccion: 'Milpillas 101, La Forestal, 34217 Durango, Dgo.',
        redes: [],
        horario: 'Lunes - Viernes 9:00 - 18:00',
        color_degradado_inicio: '#000000',
        color_degradado_fin: '#0a1f3d',
        color_primario: '#0a4d7a',
        color_secundario: '#0a1f3d',
        color_texto_nav: '#ffffff',
        color_texto_footer: '#ffffff',
        meta_title: 'Vortiz Arquitectos',
        meta_description: '',
        meta_keywords: '',
        nombre: 'Vortiz Arquitectos',
        eslogan: 'Diseñamos espacios, construimos confianza.',
      }))
    );
  }

  // Admin: configuración completa (protegida; el interceptor pone el token)
  obtenerCompleta(): Observable<ConfiguracionCompleta> {
    return this.http.get<ConfiguracionCompleta>(this.base);
  }

  // Admin: guardar una sección
  guardarSeccion(seccion: string, datos: any): Observable<any> {
    return this.http.put(`${this.base}/${seccion}`, datos);
  }

  cargarPublica() {
    this.getConfiguracion().subscribe(c => this.publicaSubject.next(c));
  }
}
