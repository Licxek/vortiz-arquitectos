import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// pagina -> seccion -> campo -> valor
export type ContenidoPaginas = Record<string, Record<string, Record<string, any>>>;

@Injectable({ providedIn: 'root' })
export class ContenidoService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/contenido`;
  private contenido: ContenidoPaginas = {};

  // Precarga TODO el contenido (se llama al arrancar la app)
  async cargarTodo(): Promise<void> {
    try {
      this.contenido = await firstValueFrom(this.http.get<ContenidoPaginas>(this.base));
    } catch {
      this.contenido = {};
    }
  }

  // ---- LECTURA (páginas públicas): síncrona, lee de la caché en memoria ----
  getCampo(pagina: string, seccion: string, campo: string, porDefecto = ''): string {
    const valor = this.contenido[pagina]?.[seccion]?.[campo];
    return typeof valor === 'string' && valor.trim() ? valor : porDefecto;
  }

  getLista<T>(pagina: string, seccion: string, porDefecto: T[], campo: string = 'lista'): T[] {
    const valor = this.contenido[pagina]?.[seccion]?.[campo];
    return Array.isArray(valor) && valor.length > 0 ? (valor as T[]) : porDefecto;
  }

  getSeccion(pagina: string, seccion: string): Record<string, any> {
    return this.contenido[pagina]?.[seccion] || {};
  }

  getPagina(pagina: string): Record<string, Record<string, any>> {
    return this.contenido[pagina] || {};
  }

  // ---- ESCRITURA (admin) ----
  guardarPagina(pagina: string, contenido: Record<string, Record<string, any>>) {
    this.contenido[pagina] = contenido;
    return this.http.put(`${this.base}/${pagina}`, contenido);
  }
}
