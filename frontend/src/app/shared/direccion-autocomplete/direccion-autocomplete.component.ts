import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  ViewChild,
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
  place_id?: number;
}

@Component({
  selector: 'app-direccion-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative" (click)="$event.stopPropagation()">
      <!-- Input -->
      <div class="relative group">
        <!-- Icono ancla -->
        <div
          class="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 pointer-events-none z-10 transition-all"
          [class.bg-gradient-to-br]="true"
          [class.from-[#0a4d7a]]="tieneValor()"
          [class.to-[#0a5d8f]]="tieneValor()"
          [class.from-[#0a4d7a]/10]="!tieneValor()"
          [class.to-[#0a4d7a]/5]="!tieneValor()"
        >
          <svg
            class="w-4 h-4 transition-colors"
            [class.text-white]="tieneValor()"
            [class.text-[#0a4d7a]]="!tieneValor()"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
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
        </div>

        <input
          #inputDireccion
          type="text"
          [value]="valor"
          (input)="onInput($any($event.target).value)"
          (focus)="onFocus()"
          (keydown.escape)="cerrar()"
          [placeholder]="placeholder"
          class="w-full pl-14 pr-12 py-3 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 hover:border-[#0a4d7a]/40 hover:shadow-sm rounded-xl text-sm font-medium text-gray-800 outline-none focus:border-[#0a4d7a] focus:ring-4 focus:ring-blue-100 focus:from-white focus:to-white transition-all"
        />

        <!-- Loading spinner o botón limpiar -->
        <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <div *ngIf="cargando()" class="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center">
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
            class="w-8 h-8 rounded-md bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-500 flex items-center justify-center transition-all"
            title="Limpiar"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Sugerencias (fixed para escapar del modal) -->
      <div
        *ngIf="abierto() && sugerencias().length > 0"
        class="fixed bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] flex flex-col animate-[fadeIn_0.15s_ease-out]"
        [style.top]="dropdownStyle().top"
        [style.left]="dropdownStyle().left"
        [style.width]="dropdownStyle().width"
        [style.maxHeight]="dropdownStyle().maxHeight"
      >
        <!-- Header -->
        <div class="px-3 py-2 bg-gradient-to-br from-blue-50 to-white border-b border-gray-100 flex items-center justify-between shrink-0">
          <p class="text-[10px] font-bold uppercase tracking-widest text-[#0a4d7a] flex items-center gap-1.5">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Sugerencias
          </p>
          <span class="text-[10px] font-semibold text-gray-500 px-2 py-0.5 bg-white rounded-full border border-gray-200">
            {{ sugerencias().length }}
          </span>
        </div>

        <!-- Lista con scroll interno -->
        <div class="flex-1 overflow-y-auto min-h-0">
          <button
            *ngFor="let s of sugerencias(); let i = index; trackBy: trackByPlaceId"
            type="button"
            (click)="seleccionar(s)"
            class="w-full px-3 py-3 text-left hover:bg-blue-50 transition-colors flex items-start gap-3 border-b border-gray-50 last:border-0 group"
          >
            <span class="w-7 h-7 rounded-md bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors mt-0.5">
              <svg
                class="w-3.5 h-3.5 text-gray-500 group-hover:text-[#0a4d7a] transition-colors"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </span>

            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-800 leading-tight font-medium line-clamp-2">
                {{ s.display_name }}
              </p>
              <p *ngIf="s.type" class="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider font-semibold">
                {{ etiquetaTipo(s.type) }}
              </p>
            </div>
          </button>
        </div>
      </div>

      <!-- Empty state (también fixed) -->
      <div
        *ngIf="abierto() && !cargando() && busquedaRealizada() && sugerencias().length === 0 && valor.trim().length >= 3"
        class="fixed bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] px-4 py-5 animate-[fadeIn_0.15s_ease-out]"
        [style.top]="dropdownStyle().top"
        [style.left]="dropdownStyle().left"
        [style.width]="dropdownStyle().width"
      >
        <div class="flex flex-col items-center gap-2 text-center">
          <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
          </div>
          <p class="text-sm font-semibold text-gray-700">Sin resultados</p>
          <p class="text-xs text-gray-500">No encontramos direcciones para "{{ valor }}"</p>
          <p class="text-xs text-gray-400 mt-1">Intenta ser más específico o con menos palabras</p>
        </div>
      </div>

      <!-- Hint (también fixed) -->
      <div
        *ngIf="abierto() && valor.trim().length > 0 && valor.trim().length < 3"
        class="fixed bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-[9999] px-4 py-3 animate-[fadeIn_0.15s_ease-out]"
        [style.top]="dropdownStyle().top"
        [style.left]="dropdownStyle().left"
        [style.width]="dropdownStyle().width"
      >
        <p class="text-xs text-gray-500 flex items-center gap-2">
          <svg class="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Escribe al menos 3 caracteres para buscar
        </p>
      </div>
    </div>
  `,
})
export class DireccionAutocompleteComponent implements OnDestroy {
  private _valor = '';

  @Input()
  set valor(v: string) {
    if (v !== this._valor) {
      this._valor = v;
    }
  }
  get valor(): string {
    return this._valor;
  }

  @Input() placeholder = 'Escribe una dirección...';
  @Output() valorChange = new EventEmitter<string>();

  abierto = signal(false);
  cargando = signal(false);
  sugerencias = signal<SugerenciaDireccion[]>([]);
  busquedaRealizada = signal(false);

  private timeoutBusqueda: any = null;
  private ultimaQuery = '';

  @ViewChild('inputDireccion') inputDireccion?: ElementRef<HTMLElement>;

  /** Posición fixed del dropdown */
  dropdownStyle = signal<{ top: string; left: string; width: string; maxHeight: string }>({
    top: '0px',
    left: '0px',
    width: '0px',
    maxHeight: '320px',
  });

  constructor(private el: ElementRef) {}

  ngOnDestroy(): void {
    if (this.timeoutBusqueda) clearTimeout(this.timeoutBusqueda);
  }

  tieneValor(): boolean {
    return this._valor.trim().length > 0;
  }

  onInput(nuevoValor: string): void {
    this._valor = nuevoValor;
    this.valorChange.emit(nuevoValor);
    this.busquedaRealizada.set(false);
    this.abierto.set(true);
    this.calcularPosicionDropdown();
    this.registrarScrollListeners();

    if (this.timeoutBusqueda) clearTimeout(this.timeoutBusqueda);

    const trimmed = nuevoValor.trim();
    if (trimmed.length < 3) {
      this.sugerencias.set([]);
      this.cargando.set(false);
      this.ultimaQuery = '';
      return;
    }

    this.timeoutBusqueda = setTimeout(() => {
      this.buscarDirecciones(trimmed);
    }, 350);
  }

  onFocus(): void {
    if (this._valor.trim().length >= 3) {
      this.abierto.set(true);
      this.calcularPosicionDropdown();
      this.registrarScrollListeners();
      if (this.sugerencias().length === 0 || this.ultimaQuery !== this._valor.trim()) {
        this.buscarDirecciones(this._valor.trim());
      }
    } else if (this._valor.trim().length > 0) {
      this.abierto.set(true);
      this.calcularPosicionDropdown();
      this.registrarScrollListeners();
    }
  }

  private async buscarDirecciones(query: string): Promise<void> {
    this.cargando.set(true);
    this.ultimaQuery = query;

    try {
      // Bounding box aproximado de Durango, MX para priorizar resultados locales
      // Formato: viewbox=lon1,lat1,lon2,lat2 (viewbox left,top,right,bottom)
      const viewboxDurango = '-104.8,24.2,-104.5,24.15';

      // Nominatim: búsqueda amplia con bias a México y Durango
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}` +
        `&limit=10&countrycodes=mx&addressdetails=1&accept-language=es` +
        `&viewbox=${viewboxDurango}&bounded=0`;

      const respuesta = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
        },
      });

      if (this.ultimaQuery !== query) return;
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

      let data: SugerenciaDireccion[] = await respuesta.json();

      // Si NO hay resultados, intentar una segunda búsqueda SIN filtro de país
      // (a veces Nominatim se confunde con direcciones específicas)
      if (data.length === 0) {
        const urlFallback =
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}` +
          `&limit=10&addressdetails=1&accept-language=es`;

        const respuestaFallback = await fetch(urlFallback, {
          headers: { 'Accept-Language': 'es' },
        });

        if (this.ultimaQuery !== query) return;
        if (respuestaFallback.ok) {
          data = await respuestaFallback.json();
        }
      }

      this.sugerencias.set(data || []);
      this.busquedaRealizada.set(true);

      if (this._valor.trim().length >= 3) {
        this.abierto.set(true);
      }
    } catch (err) {
      console.error('Error buscando direcciones:', err);
      this.sugerencias.set([]);
      this.busquedaRealizada.set(true);
    } finally {
      if (this.ultimaQuery === query) {
        this.cargando.set(false);
      }
    }
  }

  seleccionar(sugerencia: SugerenciaDireccion): void {
    this._valor = sugerencia.display_name;
    this.valorChange.emit(sugerencia.display_name);
    this.ultimaQuery = sugerencia.display_name;
    this.cerrar();
  }

  limpiar(): void {
    this._valor = '';
    this.valorChange.emit('');
    this.sugerencias.set([]);
    this.busquedaRealizada.set(false);
    this.ultimaQuery = '';
    this.cerrar();
  }

  cerrar(): void {
    this.abierto.set(false);
    this.quitarScrollListeners();
  }

  etiquetaTipo(tipo: string): string {
    const mapa: { [key: string]: string } = {
      house: 'Casa',
      residential: 'Residencial',
      commercial: 'Comercial',
      road: 'Calle',
      street: 'Calle',
      neighbourhood: 'Colonia',
      suburb: 'Colonia',
      city: 'Ciudad',
      town: 'Ciudad',
      village: 'Localidad',
      administrative: 'Zona administrativa',
      building: 'Edificio',
      shop: 'Tienda',
      restaurant: 'Restaurante',
      school: 'Escuela',
      hospital: 'Hospital',
      hotel: 'Hotel',
      park: 'Parque',
      church: 'Iglesia',
    };
    return mapa[tipo] || tipo;
  }

  trackByPlaceId(_: number, s: SugerenciaDireccion): string {
    return s.place_id ? String(s.place_id) : s.display_name;
  }

  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.cerrar();
    }
  }
  /** Calcula la posición fixed del dropdown de sugerencias */
  private calcularPosicionDropdown(): void {
    const input = this.inputDireccion?.nativeElement;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const margen = 12;

    const espacioAbajo = viewportHeight - rect.bottom - margen;
    const espacioArriba = rect.top - margen;

    const altoDeseado = 320;
    // Preferir abrir hacia abajo
    const abrirArriba = espacioAbajo < 150 && espacioArriba > espacioAbajo;

    let top: number;
    let maxHeight: number;

    if (abrirArriba) {
      maxHeight = Math.min(altoDeseado, Math.max(150, espacioArriba));
      top = rect.top - maxHeight - 8;
    } else {
      maxHeight = Math.min(altoDeseado, Math.max(150, espacioAbajo));
      top = rect.bottom + 8;
    }

    const left = Math.max(margen, Math.min(rect.left, viewportWidth - rect.width - margen));

    this.dropdownStyle.set({
      top: `${top}px`,
      left: `${left}px`,
      width: `${rect.width}px`,
      maxHeight: `${maxHeight}px`,
    });
  }

  /** Reposiciona el dropdown si la ventana cambia de tamaño */
  @HostListener('window:resize')
  onResize(): void {
    if (this.abierto()) {
      this.calcularPosicionDropdown();
    }
  }
  private scrollListener = () => {
    if (this.abierto()) this.cerrar();
  };
  private ancestrosScrolleables: HTMLElement[] = [];

  private registrarScrollListeners(): void {
    this.quitarScrollListeners();
    let el: HTMLElement | null = this.el.nativeElement.parentElement;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      const overflow = style.overflowY;
      if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') {
        el.addEventListener('scroll', this.scrollListener, { passive: true });
        this.ancestrosScrolleables.push(el);
      }
      el = el.parentElement;
    }
    document.body.addEventListener('scroll', this.scrollListener, { passive: true });
    this.ancestrosScrolleables.push(document.body);
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  private quitarScrollListeners(): void {
    for (const el of this.ancestrosScrolleables) {
      el.removeEventListener('scroll', this.scrollListener);
    }
    this.ancestrosScrolleables = [];
    window.removeEventListener('scroll', this.scrollListener);
  }
}
