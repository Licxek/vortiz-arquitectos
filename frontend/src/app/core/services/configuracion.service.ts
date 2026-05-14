import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Configuracion {
  id: number;
  logo_url: string;
  logo_footer_url: string;
  telefono: string;
  correo_contacto: string;
  direccion: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  whatsapp: string;
  horario: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private apiUrl = `${environment.apiUrl}/configuracion`;

  constructor(private http: HttpClient) {}

  getConfiguracion(): Observable<Configuracion> {
    return this.http.get<Configuracion>(this.apiUrl).pipe(
      catchError(() => of({
        id: 1,
        logo_url: '/assets/img/logo.png',
        logo_footer_url: '/assets/img/logo_vortiz.png',
        telefono: '+52 000-000-0000',
        correo_contacto: 'contacto@vortizarquitectos.com',
        direccion: 'Milpillas 101, La Forestal, 34217 Durango, Dgo.',
        instagram: 'https://www.instagram.com/',
        facebook: 'https://www.facebook.com/',
        linkedin: 'https://www.linkedin.com/',
        whatsapp: '0000000000',
        horario: 'Lunes - Viernes 9:00 - 18:00'
      }))
    );
  }
}
