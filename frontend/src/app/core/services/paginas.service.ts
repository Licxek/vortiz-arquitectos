import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoPagina = 'borrador' | 'publicada' | 'programada';
export type VisibilidadPagina = 'publica' | 'registrados' | 'contrasena';

export interface SeoPagina {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
}

export interface BloquePagina {
  id: number;
  tipo:
    | 'hero' | 'texto' | 'imagen' | 'galeria' | 'cita'
    | 'cta' | 'estadisticas' | 'servicios' | 'contacto' | 'mapa';
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  imagenUrl?: string;
  textoBoton?: string;
  expandido?: boolean;
  items?: { titulo: string; valor?: string; descripcion?: string; icono?: string }[];
  imagenes?: string[];
  direccion?: string;
  campos?: string[];
  serviciosIds?: number[]; // 👈 NUEVO
}

export interface Pagina {
  id: number;
  titulo: string;
  slug: string;
  descripcion: string;
  imagenDestacada: string;
  categoria: string;
  estado: EstadoPagina;
  visibilidad: VisibilidadPagina;
  mostrarEnMenu: boolean;
  posicionMenu: number;
  visible: boolean;
  bloques: BloquePagina[];
  seo: SeoPagina;
  permitirComentarios: boolean;
  icono: string;
  color: string;
  fechaPublicacion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PaginasService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/paginas`;

  // ============ Público ============

  /** Para el navbar: solo páginas publicadas y visibles */
  getPaginasVisibles(): Observable<Pagina[]> {
    return this.http.get<Pagina[]>(this.base);
  }

  /** Para la página pública /p/:slug */
  getPorSlug(slug: string): Observable<Pagina> {
    return this.http.get<Pagina>(`${this.base}/slug/${slug}`);
  }

  // ============ Admin ============

  /** Todas las páginas (incluye borradores y ocultas) */
  getAdmin(): Observable<Pagina[]> {
    return this.http.get<Pagina[]>(`${this.base}/admin`);
  }

  /** Una página por id (admin) */
  getAdminPorId(id: number): Observable<Pagina> {
    return this.http.get<Pagina>(`${this.base}/admin/${id}`);
  }

  crear(payload: Partial<Pagina>): Observable<Pagina> {
    return this.http.post<Pagina>(this.base, payload);
  }

  actualizar(id: number, payload: Partial<Pagina>): Observable<Pagina> {
    return this.http.put<Pagina>(`${this.base}/${id}`, payload);
  }

  eliminar(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
