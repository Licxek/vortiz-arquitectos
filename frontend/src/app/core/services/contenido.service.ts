import { Injectable } from '@angular/core';

// Estructura del almacén: pagina -> seccion -> campo -> valor
// Ej: contenido['inicio']['hero']['titulo'] = 'Mi título'
export type ContenidoPaginas = Record<string, Record<string, Record<string, string>>>;

@Injectable({ providedIn: 'root' })
export class ContenidoService {
  private readonly STORAGE_KEY = 'vortiz_contenido_paginas';
  private contenido: ContenidoPaginas = {};

  constructor() {
    this.cargarDesdeStorage();
  }

  private cargarDesdeStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.contenido = raw ? JSON.parse(raw) : {};
    } catch {
      this.contenido = {};
    }
  }

  private persistir(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.contenido));
    } catch (e) {
      console.warn('No se pudo guardar el contenido:', e);
    }
  }

  // ---- LECTURA (la usan las páginas públicas) ----

  // Lee un campo individual. Si no hay nada guardado, devuelve el valor por defecto.
  getCampo(pagina: string, seccion: string, campo: string, porDefecto = ''): string {
    const valor = this.contenido[pagina]?.[seccion]?.[campo];
    return valor && valor.trim() ? valor : porDefecto;
  }

  // Lee una sección completa (objeto de campos) o {} si no existe.
  getSeccion(pagina: string, seccion: string): Record<string, string> {
    return this.contenido[pagina]?.[seccion] || {};
  }

  // ---- ESCRITURA (la usa el admin) ----

  // Lee toda la página (para precargar el editor del admin).
  getPagina(pagina: string): Record<string, Record<string, string>> {
    return this.contenido[pagina] || {};
  }

  // Guarda toda la página de una vez y persiste.
  guardarPagina(pagina: string, contenido: Record<string, Record<string, string>>): void {
    this.contenido[pagina] = contenido;
    this.persistir();
  }

  // Útil para pruebas: borrar todo lo guardado.
  resetear(): void {
    this.contenido = {};
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
