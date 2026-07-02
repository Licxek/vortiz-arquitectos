import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeolocalizacionService } from '../../core/services/geolocalizacion.service';

interface Pais {
  codigo: string;
  nombre: string;
  iso: string;
}

const PAISES: Pais[] = [
  { codigo: '+52', nombre: 'México', iso: 'mx' },
  { codigo: '+1', nombre: 'Estados Unidos', iso: 'us' },
  { codigo: '+1', nombre: 'Canadá', iso: 'ca' },
  { codigo: '+34', nombre: 'España', iso: 'es' },
  { codigo: '+54', nombre: 'Argentina', iso: 'ar' },
  { codigo: '+55', nombre: 'Brasil', iso: 'br' },
  { codigo: '+56', nombre: 'Chile', iso: 'cl' },
  { codigo: '+57', nombre: 'Colombia', iso: 'co' },
  { codigo: '+51', nombre: 'Perú', iso: 'pe' },
  { codigo: '+58', nombre: 'Venezuela', iso: 've' },
  { codigo: '+593', nombre: 'Ecuador', iso: 'ec' },
  { codigo: '+591', nombre: 'Bolivia', iso: 'bo' },
  { codigo: '+598', nombre: 'Uruguay', iso: 'uy' },
  { codigo: '+595', nombre: 'Paraguay', iso: 'py' },
  { codigo: '+502', nombre: 'Guatemala', iso: 'gt' },
  { codigo: '+503', nombre: 'El Salvador', iso: 'sv' },
  { codigo: '+504', nombre: 'Honduras', iso: 'hn' },
  { codigo: '+505', nombre: 'Nicaragua', iso: 'ni' },
  { codigo: '+506', nombre: 'Costa Rica', iso: 'cr' },
  { codigo: '+507', nombre: 'Panamá', iso: 'pa' },
  { codigo: '+53', nombre: 'Cuba', iso: 'cu' },
  { codigo: '+1', nombre: 'República Dominicana', iso: 'do' },
  { codigo: '+44', nombre: 'Reino Unido', iso: 'gb' },
  { codigo: '+33', nombre: 'Francia', iso: 'fr' },
  { codigo: '+49', nombre: 'Alemania', iso: 'de' },
  { codigo: '+39', nombre: 'Italia', iso: 'it' },
];

@Component({
  selector: 'app-telefono-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <div class="flex">
        <!-- Selector de país -->
        <button
          type="button"
          (click)="toggleDropdown()"
          [disabled]="disabled"
          class="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:hover:bg-gray-50"
        >
          <span
            class="fi fi-{{ ladaSeleccionada.iso }} rounded-sm shadow-sm"
            style="width: 1.4em; height: 1.05em;"
          ></span>
          <span class="text-gray-700 font-medium">{{ ladaSeleccionada.codigo }}</span>
          <svg
            class="w-4 h-4 text-gray-500 transition-transform"
            [class.rotate-180]="dropdownAbierto"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Input del número con auto-formato -->
        <input
          type="tel"
          #inputTel
          [value]="numeroLocal"
          (input)="onInputNumero($event)"
          [disabled]="disabled"
          [placeholder]="placeholder"
          class="flex-1 min-w-0 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-r-lg text-sm text-gray-800 outline-none focus:border-[#0a4d7a] focus:ring-2 focus:ring-[#0a4d7a]/10 focus:bg-white transition-all disabled:cursor-not-allowed disabled:text-gray-700"
        />
      </div>

      <!-- Panel del dropdown -->
      <div
        *ngIf="dropdownAbierto"
        class="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-[fadeIn_0.15s_ease-out]"
      >
        <!-- Buscador -->
        <div class="p-2 border-b border-gray-100">
          <input
            #buscador
            type="text"
            [(ngModel)]="busqueda"
            placeholder="Buscar país..."
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0a4d7a]"
          />
        </div>
        <!-- Lista -->
        <div class="max-h-64 overflow-y-auto">
          <button
            *ngFor="let p of paisesFiltrados"
            type="button"
            (click)="seleccionarPais(p)"
            class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-sm"
          >
            <span
              class="fi fi-{{ p.iso }} rounded-sm shadow-sm"
              style="width: 1.5em; height: 1.125em;"
            ></span>
            <span class="flex-1 text-gray-700">{{ p.nombre }}</span>
            <span class="text-gray-500 text-xs">{{ p.codigo }}</span>
          </button>
          <div
            *ngIf="paisesFiltrados.length === 0"
            class="px-4 py-6 text-center text-sm text-gray-500"
          >
            Sin resultados
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TelefonoInputComponent implements OnInit, OnChanges {
  @Input() valor: string = '';
  @Output() valorChange = new EventEmitter<string>();
  @Input() disabled: boolean = false;
  @Input() placeholder: string = '000 000 0000';
  @Input() autoDetectar: boolean = false;

  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private geolocalizacion = inject(GeolocalizacionService);

  paises = PAISES;
  ladaSeleccionada: Pais = PAISES[0];
  numeroLocal: string = '';
  dropdownAbierto: boolean = false;
  busqueda: string = '';

  ngOnInit() {
    if (this.autoDetectar && !(this.valor || '').trim()) {
      this.detectarPaisAutomaticamente();
    }
  }

  private async detectarPaisAutomaticamente() {
    try {
      const iso = await this.geolocalizacion.detectarPais();
      if (!iso) return;
      if (this.numeroLocal.trim() || (this.valor || '').trim()) return;
      const pais = PAISES.find((p) => p.iso === iso);
      if (pais) {
        this.ladaSeleccionada = pais;
        this.cdr.detectChanges();
      }
    } catch {}
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['valor']) {
      this.parsearValor();
    }
  }

  /** Formatea dígitos en grupos legibles: 3-3-4 estilo internacional */
  private formatearNumero(digitos: string): string {
    if (!digitos) return '';
    if (digitos.length <= 3) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 3)} ${digitos.slice(3)}`;
    if (digitos.length <= 10) {
      return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
    }
    // Más de 10 dígitos: 3-3-4 y el resto
    return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6, 10)} ${digitos.slice(10)}`;
  }

  /** Maneja input con formato en vivo + preservación de cursor */
  onInputNumero(event: Event) {
    const input = event.target as HTMLInputElement;
    const valorEnInput = input.value;
    const posCursorAntes = input.selectionStart ?? valorEnInput.length;

    // Contar dígitos antes del cursor (para restaurar posición correctamente)
    let digitosAntes = 0;
    for (let i = 0; i < posCursorAntes; i++) {
      if (/\d/.test(valorEnInput[i])) digitosAntes++;
    }

    // Extraer solo dígitos
    let digitos = valorEnInput.replace(/\D/g, '');

    // Si el usuario escribió + al inicio, intentar detectar lada de país
    const tienePlus = valorEnInput.trimStart().startsWith('+');
    if (tienePlus && digitos.length > 0) {
      const conMas = '+' + digitos;
      const ordenados = [...PAISES].sort((a, b) => b.codigo.length - a.codigo.length);
      const pais = ordenados.find((p) => conMas.startsWith(p.codigo));
      if (pais) {
        this.ladaSeleccionada = pais;
        const digitosLada = pais.codigo.length - 1; // -1 porque digitos no tiene el +
        digitos = digitos.substring(digitosLada);
        digitosAntes = Math.max(0, digitosAntes - digitosLada);
      }
    }

    // Formatear los dígitos limpios
    const formateado = this.formatearNumero(digitos);
    this.numeroLocal = formateado;
    input.value = formateado;

    // Calcular nueva posición del cursor: justo después del N-ésimo dígito
    let nuevaPos = 0;
    if (digitosAntes > 0) {
      let contador = 0;
      let encontrado = false;
      for (let i = 0; i < formateado.length; i++) {
        if (/\d/.test(formateado[i])) {
          contador++;
          if (contador === digitosAntes) {
            nuevaPos = i + 1;
            encontrado = true;
            break;
          }
        }
      }
      if (!encontrado) nuevaPos = formateado.length;
    }

    input.setSelectionRange(nuevaPos, nuevaPos);

    // Emitir valor completo al padre
    this.emitirValorAlPadre();
    this.cdr.detectChanges();
  }

  private emitirValorAlPadre() {
    const numero = this.numeroLocal.trim();
    if (!numero) {
      this.valorChange.emit('');
      return;
    }
    this.valorChange.emit(`${this.ladaSeleccionada.codigo} ${numero}`);
  }

  private parsearValor() {
    const v = (this.valor || '').trim();
    if (!v) {
      this.numeroLocal = '';
      return;
    }
    const ordenados = [...PAISES].sort((a, b) => b.codigo.length - a.codigo.length);
    const pais = ordenados.find((p) => v.startsWith(p.codigo));
    let numeroSinLada = '';
    if (pais) {
      this.ladaSeleccionada = pais;
      numeroSinLada = v.slice(pais.codigo.length);
    } else {
      this.ladaSeleccionada = PAISES[0];
      numeroSinLada = v;
    }
    // Formatear al cargar valor externo
    const digitos = numeroSinLada.replace(/\D/g, '');
    this.numeroLocal = this.formatearNumero(digitos);
  }

  get paisesFiltrados(): Pais[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.paises;
    return this.paises.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.codigo.includes(q) || p.iso.includes(q),
    );
  }

  toggleDropdown() {
    if (this.disabled) return;
    this.dropdownAbierto = !this.dropdownAbierto;
    if (this.dropdownAbierto) this.busqueda = '';
  }

  seleccionarPais(p: Pais) {
    this.ladaSeleccionada = p;
    this.dropdownAbierto = false;
    this.emitirValorAlPadre();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      if (this.dropdownAbierto) {
        this.dropdownAbierto = false;
        this.cdr.detectChanges();
      }
    }
  }
}
