import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatea números telefónicos mexicanos (o internacionales) para que se lean bien.
 * Ejemplos:
 *   "+526181588809"     → "+52 618 158 8809"
 *   "6181588809"        → "618 158 8809"
 *   "+52 618 158 88 09" → "+52 618 158 8809" (normalizado)
 */
@Pipe({
  name: 'telefonoFormato',
  standalone: true,
})
export class TelefonoFormatoPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    // Quitar todo lo que no sea dígito o "+"
    let raw = String(value).trim();
    const tienePrefijoMas = raw.startsWith('+');
    const digitos = raw.replace(/\D/g, '');

    if (!digitos) return value; // si no hay dígitos, devuelve el original tal cual

    // 12 dígitos con "+" al inicio → asumir prefijo de país (ej. +52 618 158 8809)
    if (tienePrefijoMas && digitos.length === 12) {
      const pais = digitos.substring(0, 2);
      const lada = digitos.substring(2, 5);
      const parte1 = digitos.substring(5, 8);
      const parte2 = digitos.substring(8, 12);
      return `+${pais} ${lada} ${parte1} ${parte2}`;
    }

    // 12 dígitos sin "+" → mismo formato pero con "+" agregado
    if (digitos.length === 12) {
      const pais = digitos.substring(0, 2);
      const lada = digitos.substring(2, 5);
      const parte1 = digitos.substring(5, 8);
      const parte2 = digitos.substring(8, 12);
      return `+${pais} ${lada} ${parte1} ${parte2}`;
    }

    // 10 dígitos → número mexicano sin lada de país (ej. 618 158 8809)
    if (digitos.length === 10) {
      const lada = digitos.substring(0, 3);
      const parte1 = digitos.substring(3, 6);
      const parte2 = digitos.substring(6, 10);
      return `${lada} ${parte1} ${parte2}`;
    }

    // Cualquier otro caso: agrupa de 3 en 3 de derecha a izquierda
    return digitos.replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
  }
}
