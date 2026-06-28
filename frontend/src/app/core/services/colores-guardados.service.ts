import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ColoresGuardadosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/colores-guardados`;

  /** Lista todos los colores guardados (ordenados por más reciente) */
  listar(): Observable<string[]> {
    return this.http
      .get<string[]>(this.base)
      .pipe(catchError(() => of([])));
  }

  /** Guarda un color (upsert). Devuelve la lista completa actualizada */
  guardar(hex: string): Observable<string[]> {
    return this.http
      .post<string[]>(this.base, { hex })
      .pipe(catchError(() => of([])));
  }

  /** Elimina un color por hex. Devuelve la lista completa actualizada */
  eliminar(hex: string): Observable<string[]> {
    // El backend espera el hex SIN el # porque rompe las URLs
    const hexLimpio = hex.replace('#', '');
    return this.http
      .delete<string[]>(`${this.base}/${hexLimpio}`)
      .pipe(catchError(() => of([])));
  }
}
