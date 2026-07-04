import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Categoria {
  id: number;
  tipo: 'servicio' | 'proyecto';
  value: string;
  label: string;
  orden: number;
  esPersonalizada: boolean;
}

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/categorias`;

  private serviciosSubject = new BehaviorSubject<Categoria[]>([]);
  private proyectosSubject = new BehaviorSubject<Categoria[]>([]);

  servicios$ = this.serviciosSubject.asObservable();
  proyectos$ = this.proyectosSubject.asObservable();

  cargarServicios(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.baseUrl}?tipo=servicio`).pipe(
      tap((cats) => this.serviciosSubject.next(cats)),
    );
  }

  cargarProyectos(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.baseUrl}?tipo=proyecto`).pipe(
      tap((cats) => this.proyectosSubject.next(cats)),
    );
  }

  crear(dto: { tipo: 'servicio' | 'proyecto'; value: string; label: string }): Observable<Categoria> {
    return this.http.post<Categoria>(this.baseUrl, dto).pipe(
      tap((nueva) => {
        // Actualizar lista local
        if (nueva.tipo === 'servicio') {
          this.serviciosSubject.next([...this.serviciosSubject.value, nueva]);
        } else {
          this.proyectosSubject.next([...this.proyectosSubject.value, nueva]);
        }
      }),
    );
  }

  eliminar(id: number, tipo: 'servicio' | 'proyecto'): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        // Actualizar lista local
        if (tipo === 'servicio') {
          this.serviciosSubject.next(this.serviciosSubject.value.filter((c) => c.id !== id));
        } else {
          this.proyectosSubject.next(this.proyectosSubject.value.filter((c) => c.id !== id));
        }
      }),
    );
  }

  getServicios(): Categoria[] {
    return this.serviciosSubject.value;
  }

  getProyectos(): Categoria[] {
    return this.proyectosSubject.value;
  }
}
