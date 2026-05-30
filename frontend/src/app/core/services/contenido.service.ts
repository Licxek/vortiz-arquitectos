import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom} from 'rxjs';
import { environment } from '../../../environments/environment';

// pagina -> seccion -> campo -> valor
export type ContenidoPaginas = Record<string, Record<string, Record<string, string>>>;

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
    return valor && valor.trim() ? valor : porDefecto;
  }

  getSeccion(pagina: string, seccion: string): Record<string, string> {
    return this.contenido[pagina]?.[seccion] || {};
  }

  getPagina(pagina: string): Record<string, Record<string, string>> {
    return this.contenido[pagina] || {};
  }

  // ---- ESCRITURA (admin): guarda en backend y actualiza la caché ----
  guardarPagina(pagina: string, contenido: Record<string, Record<string, string>>) {
    this.contenido[pagina] = contenido; // optimista (caché local)
    return this.http.put(`${this.base}/${pagina}`, contenido);
  }
}
