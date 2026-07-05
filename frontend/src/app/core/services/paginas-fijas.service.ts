import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaginaFijaConfig {
  slug: string;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class PaginasFijasService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/paginas-fijas`;

  private configSubject = new BehaviorSubject<PaginaFijaConfig[]>([]);
  config$ = this.configSubject.asObservable();

  listar(): Observable<PaginaFijaConfig[]> {
    return this.http.get<PaginaFijaConfig[]>(this.baseUrl).pipe(
      tap((data) => this.configSubject.next(data)),
    );
  }

  actualizarVisibilidad(slug: string, visible: boolean): Observable<PaginaFijaConfig> {
    return this.http.patch<PaginaFijaConfig>(
      `${this.baseUrl}/${encodeURIComponent(slug)}`,
      { visible },
    ).pipe(
      tap((actualizada) => {
        const actual = this.configSubject.value;
        const idx = actual.findIndex((c) => c.slug === slug);
        if (idx >= 0) {
          const nuevo = [...actual];
          nuevo[idx] = actualizada;
          this.configSubject.next(nuevo);
        }
      }),
    );
  }

  esVisible(slug: string): boolean {
    const config = this.configSubject.value.find((c) => c.slug === slug);
    return config ? config.visible : true; // Default: visible si no hay config
  }
}
