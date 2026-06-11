import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ReportesService } from '../../core/services/reportes.service';

@Component({
  selector: 'app-modal-generar-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal-generar-pdf.component.html',
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class ModalGenerarPdfComponent {
  @Input({ required: true }) tipo = '';
  @Input({ required: true }) titulo = '';
  @Input() desde = '';
  @Input() hasta = '';
  @Output() cerrar = new EventEmitter<void>();

  private reportesService = inject(ReportesService);

  // Estado del form
  descargar = signal(true);
  enviar = signal(false);
  destinatariosTexto = signal('');
  generando = signal(false);
  resultado = signal<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  // Validación
  destinatariosValidos = computed(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.destinatariosTexto()
      .split(',')
      .map((d) => d.trim())
      .filter((d) => emailRegex.test(d));
  });

  formValido = computed(() => {
    if (!this.descargar() && !this.enviar()) return false;
    if (this.enviar() && this.destinatariosValidos().length === 0) return false;
    return true;
  });

  async generar() {
    if (!this.formValido()) return;

    this.generando.set(true);
    this.resultado.set(null);

    const descargar = this.descargar();
    const enviar = this.enviar();
    const accion: 'descargar' | 'enviar' | 'ambas' =
      descargar && enviar ? 'ambas' : descargar ? 'descargar' : 'enviar';

    const opciones = {
      desde: this.desde || undefined,
      hasta: this.hasta || undefined,
      accion,
      destinatarios: enviar ? this.destinatariosValidos() : undefined,
    };

    try {
      if (accion === 'enviar') {
        // Solo correo
        const res = await firstValueFrom(
          this.reportesService.enviarReportePDF(this.tipo, opciones),
        );
        this.resultado.set({
          tipo: 'exito',
          mensaje: `✉️ Reporte enviado a ${res.destinatarios?.length || 0} destinatario(s).`,
        });
      } else {
        // Descargar (o ambas)
        const blob = await firstValueFrom(
          this.reportesService.descargarReportePDF(this.tipo, opciones),
        );
        const fechaActual = new Date().toISOString().split('T')[0];
        const filename = `vortiz-${this.tipo}-${fechaActual}.pdf`;
        this.descargarBlob(blob, filename);

        const mensaje =
          accion === 'ambas'
            ? `📥 Reporte descargado. También enviado a ${this.destinatariosValidos().length} destinatario(s).`
            : '📥 Reporte descargado correctamente.';
        this.resultado.set({ tipo: 'exito', mensaje });
      }
    } catch (err) {
      console.error('Error generando reporte:', err);
      this.resultado.set({
        tipo: 'error',
        mensaje:
          'Hubo un error al generar el reporte. Inténtalo de nuevo o contacta soporte.',
      });
    } finally {
      this.generando.set(false);
    }
  }

  private descargarBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  cerrarModal() {
    this.cerrar.emit();
  }
}
