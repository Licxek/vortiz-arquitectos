import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface OpcionSelect {
  value: string;
  label: string;
  esNueva?: boolean;
}

@Component({
  selector: 'app-select-con-creacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative" (click)="$event.stopPropagation()">
      <!-- Botón principal -->
      <button
        type="button"
        (click)="toggleAbierto()"
        class="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm text-left transition-all"
        [class.border-[#0a4d7a]]="abierto()"
        [class.ring-2]="abierto()"
        [class.ring-blue-100]="abierto()"
      >
        <span class="flex items-center gap-2 min-w-0">
          <span
            *ngIf="colorSeleccionado()"
            class="w-2.5 h-2.5 rounded-full shrink-0"
            [style.background]="colorSeleccionado()"
          ></span>
          <span class="truncate" [class.text-gray-400]="!labelSeleccionado()">
            {{ labelSeleccionado() || placeholder }}
          </span>
        </span>
        <svg
          class="w-4 h-4 text-gray-400 transition-transform shrink-0"
          [class.rotate-180]="abierto()"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown (fixed para escapar del overflow del padre) -->
      <div
        *ngIf="abierto()"
        class="fixed bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] animate-[fadeIn_0.15s_ease-out] flex flex-col"
        [style.top]="dropdownStyle().top"
        [style.left]="dropdownStyle().left"
        [style.width]="dropdownStyle().width"
        [style.maxHeight]="dropdownStyle().maxHeight"
      >
        <!-- Buscador / creador -->
        <div class="p-2 border-b border-gray-100 bg-gray-50">
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z"
              />
            </svg>
            <input
              #inputBusqueda
              type="text"
              [value]="busqueda()"
              (input)="busqueda.set($any($event.target).value)"
              (keydown.enter)="onEnter($event)"
              (keydown.escape)="cerrar()"
              [placeholder]="permitirCrear ? 'Buscar o crear nueva...' : 'Buscar...'"
              class="buscador-dropdown w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0a4d7a] transition-all"
            />
          </div>
          <p *ngIf="permitirCrear && puedeCrear()" class="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1 px-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Presiona <kbd class="px-1 py-0.5 bg-gray-100 rounded text-[9px] font-mono">Enter</kbd> para crear
          </p>
        </div>

        <!-- Lista de opciones -->
        <div class="flex-1 overflow-y-auto min-h-0">
          <!-- Opciones filtradas -->
          <button
            *ngFor="let op of opcionesFiltradas(); trackBy: trackByValue"
            type="button"
            (click)="seleccionar(op)"
            class="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center gap-2.5 border-b border-gray-50 last:border-0 group"
            [class.bg-blue-50]="value === op.value"
          >
            <span
              *ngIf="colorPorValue"
              class="w-2.5 h-2.5 rounded-full shrink-0"
              [style.background]="colorPorValue(op.value)"
            ></span>
            <span class="flex-1 text-sm text-gray-800 truncate">{{ op.label }}</span>
            <svg
              *ngIf="value === op.value"
              class="w-4 h-4 text-[#0a4d7a] shrink-0"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>

          <!-- Empty state -->
          <div
            *ngIf="opcionesFiltradas().length === 0 && !puedeCrear()"
            class="px-4 py-6 text-center text-sm text-gray-400"
          >
            No hay coincidencias
          </div>

          <!-- Opción "Crear nueva" -->
          <button
            *ngIf="permitirCrear && puedeCrear()"
            type="button"
            (click)="crearYSeleccionar()"
            class="w-full px-3 py-3 text-left bg-gradient-to-br from-blue-50/50 to-white hover:from-blue-100 transition-colors flex items-center gap-2.5 border-t border-gray-100"
          >
            <div class="w-7 h-7 bg-[#0a4d7a] rounded-lg flex items-center justify-center shrink-0">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500">Crear nueva categoría</p>
              <p class="text-sm font-semibold text-gray-900 truncate">"{{ busqueda() }}"</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SelectConCreacionComponent {
  // Signals internos que se actualizan con los @Input setters
  private opcionesSignal = signal<OpcionSelect[]>([]);
  private valueSignal = signal<string>('');

  @Input() set opciones(v: OpcionSelect[]) {
    this.opcionesSignal.set(v || []);
  }
  get opciones(): OpcionSelect[] {
    return this.opcionesSignal();
  }

  @Input() set value(v: string) {
    this.valueSignal.set(v || '');
  }
  get value(): string {
    return this.valueSignal();
  }

  @Input() placeholder = 'Selecciona una opción';
  @Input() permitirCrear = true;
  @Input() colorPorValue?: (value: string) => string;

  @Output() valueChange = new EventEmitter<string>();
  @Output() nuevaOpcion = new EventEmitter<{ value: string; label: string }>();

  abierto = signal(false);
  busqueda = signal('');

  // Posición calculada del dropdown (para escapar del overflow del padre)
  dropdownStyle = signal<{ top: string; left: string; width: string; maxHeight: string }>({
    top: '0px',
    left: '0px',
    width: '0px',
    maxHeight: '320px',
  });

  labelSeleccionado = computed(() => {
    const op = this.opcionesSignal().find((o) => o.value === this.valueSignal());
    return op?.label || '';
  });

  colorSeleccionado = computed(() => {
    if (!this.colorPorValue || !this.valueSignal()) return '';
    return this.colorPorValue(this.valueSignal());
  });

  opcionesFiltradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const opciones = this.opcionesSignal();
    if (!q) return opciones;
    return opciones.filter((o) => o.label.toLowerCase().includes(q));
  });

  constructor(private el: ElementRef) {}

  toggleAbierto() {
    this.abierto.update((v) => !v);
    if (this.abierto()) {
      this.busqueda.set('');
      this.calcularPosicionDropdown();
      setTimeout(() => {
        const input = this.el.nativeElement.querySelector('input.buscador-dropdown');
        input?.focus();
      }, 50);
    }
  }

  /** Encuentra el ancestro scrolleable más cercano (el modal o body) */
  private encontrarContenedorScroll(): HTMLElement {
    let el: HTMLElement | null = this.el.nativeElement.parentElement;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      const overflow = style.overflowY;
      if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') {
        return el;
      }
      el = el.parentElement;
    }
    return document.body;
  }

  /** Calcula la posición del dropdown de forma inteligente:
   *  - Se limita a los bordes del contenedor scrolleable (modal padre)
   *  - Abre hacia abajo por defecto, arriba si no hay espacio
   *  - Ajusta la altura máxima para no salirse del contenedor
   */
  private calcularPosicionDropdown() {
    const boton = this.el.nativeElement.querySelector('button') as HTMLElement;
    if (!boton) return;

    const rect = boton.getBoundingClientRect();
    const contenedor = this.encontrarContenedorScroll();
    const contRect =
      contenedor === document.body
        ? { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth }
        : contenedor.getBoundingClientRect();

        // 🐛 DEBUG TEMPORAL
    console.log('🎯 DROPDOWN DEBUG', {
      boton_texto: boton.textContent?.trim().slice(0, 30),
      boton_top: rect.top,
      boton_bottom: rect.bottom,
      contenedor_tag: contenedor.tagName,
      contenedor_class: contenedor.className.slice(0, 60),
      contenedor_top: contRect.top,
      contenedor_bottom: contRect.bottom,
    });

    // Márgenes internos del contenedor (para no pegarse al borde)
    const margen = 12;
    const limiteTop = contRect.top + margen;
    const limiteBottom = contRect.bottom - margen;

    const espacioAbajo = limiteBottom - rect.bottom;
    const espacioArriba = rect.top - limiteTop;

    const altoDeseado = 320;
    // Solo abrir hacia arriba si el espacio abajo es muy chico (menos de 120px)
    // Y hay bastante más espacio arriba
    const abrirArriba = espacioAbajo < 120 && espacioArriba > 200;

    let top: number;
    let maxHeight: number;

    if (abrirArriba) {
      maxHeight = Math.min(altoDeseado, espacioArriba);
      top = rect.top - maxHeight - 6;
    } else {
      // Abrir hacia abajo (comportamiento por defecto)
      maxHeight = Math.min(altoDeseado, Math.max(120, espacioAbajo));
      top = rect.bottom + 6;
    }

    this.dropdownStyle.set({
      top: `${top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      maxHeight: `${maxHeight}px`,
    });
  }

  /** Reposicionar en resize de ventana */
  @HostListener('window:resize')
  onResize() {
    if (this.abierto()) {
      this.calcularPosicionDropdown();
    }
  }

  /** En scroll del window, cerramos para evitar posiciones raras */
  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event) {
    if (!this.abierto()) return;
    const contenedor = this.encontrarContenedorScroll();
    const target = event.target as unknown as Node;

    // Si el scroll viene del document o body (scroll global), cerramos
    const esScrollGlobal =
      target === document || target === document.documentElement || contenedor === document.body;

    if (esScrollGlobal) {
      this.cerrar();
    } else {
      this.calcularPosicionDropdown();
    }
  }

  cerrar() {
    this.abierto.set(false);
    this.busqueda.set('');
  }

  puedeCrear(): boolean {
    if (!this.permitirCrear || !this.busqueda().trim()) return false;
    const q = this.busqueda().toLowerCase().trim();
    // Solo permitir crear si NO existe una opción idéntica
    return !this.opcionesSignal().some((o) => o.label.toLowerCase() === q);
  }

  onEnter(event: Event) {
    event.preventDefault();
    if (this.puedeCrear()) {
      this.crearYSeleccionar();
    } else if (this.opcionesFiltradas().length === 1) {
      this.seleccionar(this.opcionesFiltradas()[0]);
    }
  }

  seleccionar(op: OpcionSelect) {
    this.valueChange.emit(op.value);
    this.cerrar();
  }

  crearYSeleccionar() {
    const label = this.busqueda().trim();
    if (!label) return;
    // Generar value slug-friendly desde el label
    const value = label
      .toLowerCase()
      .replace(/[áéíóú]/g, (m) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' })[m] || '')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    this.nuevaOpcion.emit({ value, label });
    this.valueChange.emit(value);
    this.cerrar();
  }

  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.cerrar();
    }
  }

  trackByValue = (_: number, op: OpcionSelect) => op.value;
}
