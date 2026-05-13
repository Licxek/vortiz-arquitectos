import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Pagina {
  id: number;
  titulo: string;
  slug: string;
  contenido: string;
  visible: boolean;
  orden: number;
}

@Injectable({ providedIn: 'root' })
export class PaginasService {
  private apiUrl = `${environment.apiUrl}/paginas`;

  constructor(private http: HttpClient) {}

  getPaginasVisibles(): Observable<Pagina[]> {
    return this.http.get<Pagina[]>(`${this.apiUrl}?visible=true`).pipe(
      catchError(() => of([]))
    );
  }
}
