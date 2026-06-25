import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Resalta las coincidencias de `query` dentro de un texto.
 * Uso: {{ resultado.titulo | highlightSearch: query }}
 *
 * Devuelve SafeHtml con <mark> alrededor de las partes que coinciden.
 * Es insensible a mayúsculas/acentos y escapa HTML para evitar inyección.
 */
@Pipe({
  name: 'highlightSearch',
  standalone: true,
})
export class HighlightSearchPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string | null | undefined, query: string | null | undefined): SafeHtml {
    const safe = this.escapeHtml(text || '');
    const q = (query || '').trim();
    if (!safe || !q) return this.sanitizer.bypassSecurityTrustHtml(safe);

    // Normalizar para comparación (sin acentos, lowercase)
    const normalizado = this.normalizar(safe);
    const qNorm = this.normalizar(q);

    if (qNorm.length === 0) return this.sanitizer.bypassSecurityTrustHtml(safe);

    // Buscar TODAS las ocurrencias y armar el HTML
    let resultado = '';
    let i = 0;
    while (i < safe.length) {
      const idx = normalizado.indexOf(qNorm, i);
      if (idx === -1) {
        resultado += safe.slice(i);
        break;
      }
      resultado += safe.slice(i, idx);
      resultado += `<mark class="vortiz-highlight-match">${safe.slice(idx, idx + qNorm.length)}</mark>`;
      i = idx + qNorm.length;
    }

    return this.sanitizer.bypassSecurityTrustHtml(resultado);
  }

  /** Quita acentos y pasa a minúsculas para matchear sin distinguir */
  private normalizar(s: string): string {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /** Escapa caracteres HTML para evitar inyección */
  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
