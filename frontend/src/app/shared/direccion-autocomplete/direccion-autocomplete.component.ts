import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  signal,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SugerenciaDireccion {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

@Component({
  selector: 'app-direccion-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative" (click)="$event.stopPropagation()">
      <div class="relative">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <input
          type="text"
          [value]="valor"
          (input)="onInput($any($event.target).value)"
          (focus)="onFocus()"
          (keydown.escape)="cerrar()"
          [placeholder]="placeholder"
          class="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0a4d7a] focus:bg-white transition-all"
        />
        <div
          *ngIf="cargando()"
          class="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <svg class="w-4 h-4 text-[#0a4d7a] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
        </div>
        <button
          *ngIf="valor && !cargando()"
          type="button"
          (click)="limpiar()"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
          title="Limpiar"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Sugerencias -->
      <div
        *ngIf="abierto() && sugerencias().length > 0"
        class="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-30 max-h-72 overflow-y-auto animate-[fadeIn_0.15s_ease-out]"
      >
        <button
          *ngFor="let s of sugerencias(); let i = index"
          type="button"
          (click)="seleccionar(s)"
          class="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-start gap-2.5 border-b border-gray-50 last:border-0"
        >
          <svg
            class="w-4 h-4 text-[#0a4d7a] shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span class="text-sm text-gray-800 leading-tight">{{ s.display_name }}</span>
        </button>
      </div>

      <!-- Empty state -->
      <div
        *ngIf="abierto() && !cargando() && busquedaRealizada() && sugerencias().length === 0"
        class="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-30 px-4 py-3 text-center text-sm text-gray-500 animate-[fadeIn_0.15s_ease-out]"
      >
        No se encontraron direcciones para "{{ valor }}"
      </div>
    </div>
  `,
})
export class DireccionAutocompleteComponent implements OnDestroy {
  @Input() valor = '';
  @Input() placeholder = 'Escribe una dirección...';
  @Output() valorChange = new EventEmitter<string>();

  abierto = signal(false);
  cargando = signal(false);
  sugerencias = signal<SugerenciaDireccion[]>([]);
  busquedaRealizada = signal(false);

  private timeoutBusqueda: any = null;

  constructor(private el: ElementRef) {}

  ngOnDestroy() {
    if (this.timeoutBusqueda) clearTimeout(this.timeoutBusqueda);
  }

  onInput(nuevoValor: string) {
    this.valor = nuevoValor;
    this.valorChange.emit(nuevoValor);
    this.busquedaRealizada.set(false);
    this.abierto.set(true);

    if (this.timeoutBusqueda) clearTimeout(this.timeoutBusqueda);

    if (nuevoValor.trim().length < 3) {
      this.sugerencias.set([]);
      this.cargando.set(false);
      return;
    }

    // Debounce 400ms
    this.timeoutBusqueda = setTimeout(() => {
      this.buscarDirecciones(nuevoValor.trim());
    }, 400);
  }

  onFocus() {
    if (this.valor.trim().length >= 3 && this.sugerencias().length > 0) {
      this.abierto.set(true);
    }
  }

  private async buscarDirecciones(query: string) {
    this.cargando.set(true);
    try {
      // Nominatim de OpenStreetMap (gratis, sin API key)
      // Priorizamos México con countrycodes=mx
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=6&countrycodes=mx&addressdetails=0`;

      const respuesta = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
        },
      });

      if (!respuesta.ok) throw new Error('Error en la búsqueda');

      const data: SugerenciaDireccion[] = await respuesta.json();
      this.sugerencias.set(data);
      this.busquedaRealizada.set(true);
    } catch (err) {
      console.error('Error buscando direcciones:', err);
      this.sugerencias.set([]);
      this.busquedaRealizada.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionar(sugerencia: SugerenciaDireccion) {
    this.valor = sugerencia.display_name;
    this.valorChange.emit(sugerencia.display_name);
    this.cerrar();
  }

  limpiar() {
    this.valor = '';
    this.valorChange.emit('');
    this.sugerencias.set([]);
    this.busquedaRealizada.set(false);
    this.cerrar();
  }

  cerrar() {
    this.abierto.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.cerrar();
    }
  }
}
