import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-carousel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-carousel.component.html',
})
export class ImageCarouselComponent implements OnInit, OnDestroy {
  @Input() set imagenes(v: string[]) {
    this._imagenes.set((v || []).filter((x) => !!x && x.trim().length > 0));
    this.indiceActual.set(0);
    this.dragOffset.set(0);
  }
  @Input() alt = '';
  @Input() aspectRatio: 'wide' | 'square' | '4:3' | 'tall' = 'wide';
  @Input() showDots = true;
  @Input() showArrows = true;
  @Input() autoplay = false;
  @Input() autoplayMs = 5000;
  @Input() rounded = true;
  @Input() objectFit: 'cover' | 'contain' = 'cover';
  @Input() placeholder = '';
  @Input() clickable = true;

  @Output() imageClick = new EventEmitter<number>();

  protected _imagenes = signal<string[]>([]);
  indiceActual = signal(0);

  // Touch/drag state
  private touchStartX = 0;
  private touchCurrentX = 0;
  arrastrando = false;
  dragOffset = signal(0); // pixels de arrastre durante el swipe
  private containerWidth = 0;
  private autoplayInterval: any = null;

  total = computed(() => this._imagenes().length);
  tieneMultiples = computed(() => this.total() > 1);

  // Cálculo del transform: mueve el track según índice + offset de arrastre
  translateXTotal = computed(() => {
    const n = this.total();
    if (n === 0) return '0px';
    // Cada imagen ocupa (100 / n)% del track
    // Para mostrar la imagen i, movemos -(i * (100/n))%
    const percentPorImagen = 100 / n;
    const basePercent = -this.indiceActual() * percentPorImagen;
    const offset = this.dragOffset();
    if (offset !== 0 && this.containerWidth > 0) {
      // Convertir el offset en pixels a % del track completo
      // Track total = n * containerWidth; offset% = offset / (n * containerWidth) * 100
      const offsetPercent = (offset / (n * this.containerWidth)) * 100;
      return `${basePercent + offsetPercent}%`;
    }
    return `${basePercent}%`;
  });

  aspectClass = computed(() => {
    const map = {
      wide: 'aspect-video',
      square: 'aspect-square',
      '4:3': 'aspect-[4/3]',
      tall: 'aspect-[3/4]',
    };
    return map[this.aspectRatio] || map.wide;
  });

  defaultPlaceholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">' +
        '<rect width="400" height="250" fill="#f3f4f6"/>' +
        '<g transform="translate(168, 60)" fill="#d1d5db">' +
        '<g transform="scale(2.67)">' +
        '<path d="M21 5v6.59l-3-3.01-4 4.01-4-4-4 4-3-3.01V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2zm-3 6.42l3 3.01V19c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-6.58l3 2.99 4-4 4 4 4-3.99z"/>' +
        '</g></g>' +
        '<text x="200" y="195" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="14">Sin imagen</text>' +
        '</svg>',
    );

  ngOnInit() {
    if (this.autoplay) this.iniciarAutoplay();
  }

  ngOnDestroy() {
    this.detenerAutoplay();
  }

  siguiente(event?: Event) {
    event?.stopPropagation();
    const total = this.total();
    if (total <= 1) return;
    this.indiceActual.update((i) => (i + 1) % total);
    this.reiniciarAutoplay();
  }

  anterior(event?: Event) {
    event?.stopPropagation();
    const total = this.total();
    if (total <= 1) return;
    this.indiceActual.update((i) => (i - 1 + total) % total);
    this.reiniciarAutoplay();
  }

  irA(indice: number, event?: Event) {
    event?.stopPropagation();
    if (indice < 0 || indice >= this.total()) return;
    this.indiceActual.set(indice);
    this.reiniciarAutoplay();
  }

  onClickImagen() {
    // No emitir click si el usuario estaba arrastrando
    if (this.arrastrando) return;
    if (this.clickable) {
      this.imageClick.emit(this.indiceActual());
    }
  }

  // ============ TOUCH con drag en vivo ============
  onTouchStart(event: TouchEvent) {
    if (!this.tieneMultiples()) return;
    this.touchStartX = event.touches[0].clientX;
    this.touchCurrentX = this.touchStartX;
    this.arrastrando = true;
    // Guardar el ancho del contenedor para calcular el porcentaje del drag
    const target = event.currentTarget as HTMLElement;
    this.containerWidth = target.getBoundingClientRect().width;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.arrastrando) return;
    this.touchCurrentX = event.touches[0].clientX;
    const delta = this.touchCurrentX - this.touchStartX;
    this.dragOffset.set(delta);
  }

  onTouchEnd(_event: TouchEvent) {
    if (!this.arrastrando) return;
    const delta = this.touchCurrentX - this.touchStartX;
    const umbral = this.containerWidth * 0.15; // 15% del ancho = cambio de imagen

    this.arrastrando = false;
    this.dragOffset.set(0);

    if (Math.abs(delta) > umbral) {
      if (delta < 0) this.siguiente();
      else this.anterior();
    }
    // Si no supera el umbral, se anima de regreso a la posición actual (por el transition-transform)
  }

  // ============ AUTOPLAY ============
  private iniciarAutoplay() {
    if (!this.tieneMultiples()) return;
    this.autoplayInterval = setInterval(() => this.siguiente(), this.autoplayMs);
  }

  private detenerAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  private reiniciarAutoplay() {
    if (this.autoplay) {
      this.detenerAutoplay();
      this.iniciarAutoplay();
    }
  }

  // ============ KEYBOARD ============
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.tieneMultiples()) return;
    if (event.key === 'ArrowRight') this.siguiente(event);
    if (event.key === 'ArrowLeft') this.anterior(event);
  }
}
