import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Proyecto } from '../../core/services/catalogo.service';
import { LightboxComponent } from '../lightbox/lightbox.component';

@Component({
  selector: 'app-project-showcase',
  standalone: true,
  imports: [CommonModule, LightboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-showcase.component.html',
})
export class ProjectShowcaseComponent {
  @Input({ required: true }) proyecto!: Proyecto;
  @Output() cerrar = new EventEmitter<void>();

  private sanitizer = inject(DomSanitizer);

  lightboxIndex = signal(-1);
  mostrarTodas = signal(false);
  videoAbierto = signal(false);

  imagenes = computed(() => this.proyecto?.imagenesPublicas || []);
  hayImagenes = computed(() => this.imagenes().length > 0);

  abrirLightbox(idx: number, event?: Event) {
    event?.stopPropagation();
    this.lightboxIndex.set(idx);
  }

  cerrarLightbox() {
    this.lightboxIndex.set(-1);
  }

  toggleVerTodas(event?: Event) {
    event?.stopPropagation();
    this.mostrarTodas.update((v) => !v);
  }

  abrirVideo(event?: Event) {
    event?.stopPropagation();
    this.videoAbierto.set(true);
  }

  cerrarVideo(event?: Event) {
    event?.stopPropagation();
    this.videoAbierto.set(false);
  }

  /** Convierte URL de YouTube/Vimeo a URL embebible */
  embedUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.proyecto?.videoUrl;
    if (!url) return null;

    let embed = '';

    // YouTube
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]+)/,
    );
    if (ytMatch) embed = `https://www.youtube.com/embed/${ytMatch[1]}`;

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) embed = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  });

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.lightboxIndex() >= 0) return; // lightbox maneja su propio escape
    if (this.videoAbierto()) {
      this.videoAbierto.set(false);
      return;
    }
    this.cerrar.emit();
  }
}
