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
        class="rounded-xl overflow-hidden border border-gray-200 bg-gray-100 z-0"
        [style.height.px]="alto"
      ></div>

      <div
        *ngIf="cargando"
        class="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center z-10"
      >
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
            <path fill="currentColor" class="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Buscando dirección...
        </div>
      </div>
    </div>

    <p class="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
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

    // Carga dinámica para evitar SSR issues
    this.L = await import('leaflet');
    await import('leaflet/dist/leaflet.css' as any).catch(() => {});

    // Fix iconos faltantes (problema clásico de Leaflet con bundlers)
    delete (this.L.Icon.Default.prototype as any)._getIconUrl;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Centro inicial: Durango como fallback
    const centroDefault: [number, number] = [24.0277, -104.6532];

    this.mapa = this.L.map(this.mapaEl.nativeElement, {
      attributionControl: true,
      zoomControl: true,
    }).setView(centroDefault, 13);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.mapa);

    this.marcador = this.L.marker(centroDefault, { draggable: true }).addTo(this.mapa);

    this.marcador.on('dragend', () => {
      const pos = this.marcador.getLatLng();
      this.reverseGeocode(pos.lat, pos.lng);
    });

    // Buscar dirección inicial si hay
    if (this.direccion || this.ciudad) {
      this.buscarYMover();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.mapa) return;

    // Debounce: si el usuario está escribiendo, no buscamos cada tecla
    if (
      changes['direccion'] ||
      changes['ciudad'] ||
      changes['estado'] ||
      changes['codigoPostal']
    ) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.buscarYMover(), 800);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.debounceTimer);
    if (this.mapa) this.mapa.remove();
  }

  /** Geocoding directo: dirección textual → coordenadas */
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
      console.warn('Geocoding falló:', err);
    } finally {
      this.cargando = false;
    }
  }

  /** Geocoding inverso: coordenadas → dirección textual */
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
      console.warn('Reverse geocoding falló:', err);
    } finally {
      this.cargando = false;
    }
  }
}
