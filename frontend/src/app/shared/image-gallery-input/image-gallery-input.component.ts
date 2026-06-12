import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageUploadComponent } from '../image-upload/image-upload.component';

@Component({
  selector: 'app-image-gallery-input',
  standalone: true,
  imports: [CommonModule, ImageUploadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-gallery-input.component.html',
})
export class ImageGalleryInputComponent {
  @Input() label = 'Imágenes del proyecto';
  @Input() set imagenes(v: string[]) {
    const arr = (v || []).filter((x) => !!x && x.trim().length > 0);
    const actual = JSON.stringify(this.imagenesArr());
    const nuevo = JSON.stringify(arr);
    if (actual !== nuevo) this.imagenesArr.set(arr);
  }
  @Output() imagenesChange = new EventEmitter<string[]>();

  @Input() carpeta = 'proyectos';
  @Input() maximo = 10;
  @Input() aspectRatio: 'wide' | 'square' | 'auto' = 'wide';
  @Input() hint = 'La primera imagen será la principal (la que aparece en el carrusel por default)';

  imagenesArr = signal<string[]>([]);
  // Toggle para forzar remount del uploader (resetea su estado interno)
  uploaderVisible = signal(true);

  async agregar(url: string) {
    if (!url || !url.trim()) return;
    if (this.imagenesArr().length >= this.maximo) return;
    const nueva = [...this.imagenesArr(), url.trim()];
    this.imagenesArr.set(nueva);
    this.imagenesChange.emit(nueva);

    // Remount del uploader para resetear su estado
    this.uploaderVisible.set(false);
    await new Promise((r) => setTimeout(r, 50));
    this.uploaderVisible.set(true);
  }

  eliminar(i: number, event?: Event) {
    event?.stopPropagation();
    const nueva = this.imagenesArr().filter((_, idx) => idx !== i);
    this.imagenesArr.set(nueva);
    this.imagenesChange.emit(nueva);
  }

  mover(i: number, direccion: 1 | -1, event?: Event) {
    event?.stopPropagation();
    const arr = [...this.imagenesArr()];
    const j = i + direccion;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.imagenesArr.set(arr);
    this.imagenesChange.emit(arr);
  }

  trackByIndex(i: number) {
    return i;
  }
}
