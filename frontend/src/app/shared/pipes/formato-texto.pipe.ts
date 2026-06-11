import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatoTexto', standalone: true })
export class FormatoTextoPipe implements PipeTransform {
  transform(texto: string | null | undefined): string {
    if (!texto) return '';
    return texto
      .replace(/\*(.+?)\*/g, '<span class="italic font-light">$1</span>') // *palabra* = itálica
      .replace(/~(.+?)~/g, '<span class="text-[#0a4d7a]">$1</span>');      // ~palabra~ = azul
  }
}
