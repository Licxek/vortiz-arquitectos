import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lightbox.component.html',
})
export class LightboxComponent {
  @Input() imagenes: string[] = [];
  @Input() set indiceInicial(v: number) {
    this.indice.set(Math.max(0, Math.min(v, this.imagenes.length - 1)));
  }
  @Output() cerrar = new EventEmitter<void>();

  indice = signal(0);

  imagenActual = computed(() => this.imagenes[this.indice()] || '');
  total = computed(() => this.imagenes.length);

  private touchStartX = 0;

  siguiente(e?: Event) {
    e?.stopPropagation();
    if (this.total() <= 1) return;
    this.indice.update((i) => (i + 1) % this.total());
  }

  anterior(e?: Event) {
    e?.stopPropagation();
    if (this.total() <= 1) return;
    this.indice.update((i) => (i - 1 + this.total()) % this.total());
  }

  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.touches[0].clientX;
  }

  onTouchEnd(e: TouchEvent) {
    const diff = this.touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) this.siguiente();
      else this.anterior();
    }
  }

  @HostListener('document:keydown', ['$event'])
  manejarTeclas(e: KeyboardEvent) {
    if (e.key === 'Escape') this.cerrar.emit();
    if (e.key === 'ArrowRight') this.siguiente();
    if (e.key === 'ArrowLeft') this.anterior();
  }
}
