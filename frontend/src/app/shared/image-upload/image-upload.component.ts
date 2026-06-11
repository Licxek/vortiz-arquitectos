import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  inject,
  signal,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadsService } from '../../core/services/uploads.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-upload.component.html',
})
export class ImageUploadComponent implements OnChanges {
  /** URL actual de la imagen (o vacío si no hay) */
  @Input() valor = '';
  /** Carpeta en el backend para organizar (proyectos, servicios, perfil, marca, etc.) */
  @Input() carpeta = 'general';
  /** Etiqueta opcional encima del componente */
  @Input() label = '';
  /** Ratio de aspecto */
  @Input() aspectRatio: 'square' | 'wide' | 'auto' = 'wide';
  /** Texto del placeholder */
  @Input() placeholder = 'Click para subir o arrastra aquí';
  @Input() objectFit: 'cover' | 'contain' = 'cover';

  @Output() valorChange = new EventEmitter<string>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private uploads = inject(UploadsService);

  subiendo = signal(false);
  arrastrando = signal(false);
  error = signal<string | null>(null);

  abrirSelector() {
    this.fileInput.nativeElement.click();
  }

  onArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.subirArchivo(file);
    input.value = ''; // permitir resubir el mismo archivo
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.arrastrando.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.arrastrando.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.arrastrando.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.subirArchivo(file);
  }

  eliminar() {
    // Si quieres borrar la imagen del servidor también, descomenta:
    // const publicId = this.extraerPublicId(this.valor);
    // if (publicId) this.uploads.eliminarImagen(publicId).subscribe();
    this.valorChange.emit('');
  }

  private subirArchivo(file: File) {
    // Validación cliente
    if (!file.type.match(/^image\/(jpeg|png|webp|gif|svg\+xml)$/)) {
      this.error.set('Formato no permitido. Usa PNG, JPG, WEBP, GIF o SVG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Imagen demasiado grande. Máximo 5MB.');
      return;
    }

    this.error.set(null);
    this.subiendo.set(true);

    // Guardar publicId anterior para borrar después
    const publicIdAnterior = this.extraerPublicId(this.valor);

    this.uploads.subirImagen(file, this.carpeta).subscribe({
      next: (res) => {
        this.subiendo.set(false);
        this.valorChange.emit(res.url);

        // Borrar el anterior del servidor si existía
        if (publicIdAnterior) {
          this.uploads.eliminarImagen(publicIdAnterior).subscribe();
        }
      },
      error: (err) => {
        this.subiendo.set(false);
        this.error.set(err?.error?.message || 'Error al subir la imagen');
      },
    });
  }

  /** Extrae el publicId de una URL local (formato: .../uploads/carpeta/archivo.ext) */
  private extraerPublicId(url: string): string {
    const match = (url || '').match(/\/uploads\/(.+)$/);
    return match ? match[1] : '';
  }

  imagenRota = signal(false); // 👈 NUEVO

  ngOnChanges(changes: SimpleChanges) {
    if (changes['valor']) {
      this.imagenRota.set(false); // reset al cambiar el valor
    }
  }

  onImagenError() {
    this.imagenRota.set(true);
  }
}
