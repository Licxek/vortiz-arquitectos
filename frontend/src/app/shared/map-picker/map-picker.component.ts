import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export interface DireccionGeo {
  direccion: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
}

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <div
        #mapaEl
        class="rounded-xl overflow-hidden border border-gray-200 bg-gray-100 z-0 shadow-sm"
        [style.height.px]="alto"
      ></div>

      <div
        *ngIf="cargando"
        class="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center z-10"
      >
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              class="opacity-25"
            ></circle>
            <path
              fill="currentColor"
              class="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          Buscando dirección...
        </div>
      </div>
    </div>

    <p class="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
      <svg
        class="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      Arrastra el marcador para ajustar la ubicación o edita los campos arriba
    </p>
  `,
})
export class MapPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapaEl', { static: true }) mapaEl!: ElementRef<HTMLDivElement>;

  @Input() direccion = '';
  @Input() ciudad = '';
  @Input() estado = '';
  @Input() codigoPostal = '';
  @Input() alto = 280;

  @Output() ubicacionCambio = new EventEmitter<DireccionGeo>();

  cargando = false;

  private mapa: any;
  private marcador: any;
  private L: any;
  private debounceTimer?: any;
  private ultimaBusqueda = '';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // 👇 FIX: acceder correctamente al módulo
      const mod: any = await import('leaflet');
      this.L = mod.default || mod;

      if (!this.L?.map) {
        console.error('[map-picker] Leaflet no expuso .map(). Modulo:', mod);
        return;
      }

      // Fix iconos (Leaflet busca PNGs relativos por default)
      const pinIcon = this.L.divIcon({
        className: '',
        html: `
    <div style="position: relative; width: 36px; height: 48px; transform: translate(-50%, -100%);">
      <svg viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30c0-9.94-8.06-18-18-18z" fill="#0a4d7a"/>
        <circle cx="18" cy="18" r="7" fill="white"/>
      </svg>
    </div>
  `,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
      });

      const centroDefault: [number, number] = [24.0277, -104.6532]; // Durango

      this.mapa = this.L.map(this.mapaEl.nativeElement, {
        attributionControl: true,
        zoomControl: true,
      }).setView(centroDefault, 13);

      this.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(this.mapa);

      this.marcador = this.L.marker(centroDefault, {
        draggable: true,
        icon: pinIcon,
      }).addTo(this.mapa);

      this.marcador.on('dragend', () => {
        const pos = this.marcador.getLatLng();
        this.reverseGeocode(pos.lat, pos.lng);
      });

      // 👇 FIX CRÍTICO: forzar recalcular tamaño del mapa
      // (Leaflet a veces calcula 0px de alto al inicializar en contenedores dinámicos)
      setTimeout(() => {
        this.mapa?.invalidateSize();
        if (this.direccion || this.ciudad) {
          this.buscarYMover();
        }
      }, 200);
    } catch (err) {
      console.error('[map-picker] Error inicializando Leaflet:', err);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.mapa) return;

    if (changes['direccion'] || changes['ciudad'] || changes['estado'] || changes['codigoPostal']) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.buscarYMover(), 800);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.debounceTimer);
    if (this.mapa) this.mapa.remove();
  }

  private async buscarYMover() {
    const query = [this.direccion, this.ciudad, this.estado, this.codigoPostal, 'México']
      .filter((p) => p?.trim())
      .join(', ');

    if (!query || query === this.ultimaBusqueda) return;
    this.ultimaBusqueda = query;

    this.cargando = true;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=es`,
      );
      const data = await res.json();
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        this.marcador.setLatLng([lat, lng]);
        this.mapa.setView([lat, lng], 16);
      }
    } catch (err) {
      console.warn('[map-picker] Geocoding falló:', err);
    } finally {
      this.cargando = false;
    }
  }

  private async reverseGeocode(lat: number, lng: number) {
    this.cargando = true;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
      );
      const d = await res.json();
      const a = d.address || {};

      const direccion = [a.road, a.house_number].filter(Boolean).join(' ');
      const suburbio = a.suburb || a.neighbourhood || a.quarter || '';
      const direccionCompleta = suburbio ? `${direccion}, ${suburbio}` : direccion;

      const resultado: DireccionGeo = {
        direccion: direccionCompleta,
        ciudad: a.city || a.town || a.village || a.municipality || '',
        estado: a.state || '',
        codigoPostal: a.postcode || '',
      };

      this.ultimaBusqueda = [
        resultado.direccion,
        resultado.ciudad,
        resultado.estado,
        resultado.codigoPostal,
        'México',
      ]
        .filter((p) => p?.trim())
        .join(', ');

      this.ubicacionCambio.emit(resultado);
    } catch (err) {
      console.warn('[map-picker] Reverse geocoding falló:', err);
    } finally {
      this.cargando = false;
    }
  }
}
