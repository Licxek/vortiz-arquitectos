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

  // Touch state (no signal, no necesita re-render)
  private touchStartX = 0;
  private touchEndX = 0;
  private autoplayInterval: any = null;

  imagenActual = computed(() => {
    const list = this._imagenes();
    if (list.length === 0) return this.placeholder || this.defaultPlaceholder;
    return list[this.indiceActual()] || list[0];
  });

  total = computed(() => this._imagenes().length);
  tieneMultiples = computed(() => this.total() > 1);

  aspectClass = computed(() => {
    const map = {
      wide: 'aspect-video', // 16:9
      square: 'aspect-square',
      '4:3': 'aspect-[4/3]',
      tall: 'aspect-[3/4]',
    };
    return map[this.aspectRatio] || map.wide;
  });

  private defaultPlaceholder =
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
    if (this.clickable) {
      this.imageClick.emit(this.indiceActual());
    }
  }

  // ============ TOUCH ============
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].clientX;
    const diff = this.touchStartX - this.touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) this.siguiente();
      else this.anterior();
    }
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

  // ============ KEYBOARD (accesibilidad) ============
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.tieneMultiples()) return;
    if (event.key === 'ArrowRight') this.siguiente(event);
    if (event.key === 'ArrowLeft') this.anterior(event);
  }
}
