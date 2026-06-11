import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './mantenimiento.component.html',
})
export class MantenimientoComponent {
  private configService = inject(ConfiguracionService);

  // Convierte el Observable a Signal (lo lee sincrónicamente)
  config = toSignal(this.configService.configPublica$, { initialValue: null });

  ahora = computed(() => new Date().getFullYear());

  nombre = computed(() => this.config()?.nombre || 'Vortiz Arquitectos');

  mensaje = computed(
    () =>
      this.config()?.mantenimiento?.mensaje ||
      'Estamos haciendo mejoras en el sitio. Volveremos muy pronto.',
  );

  fechaFormateada = computed(() => {
    const fecha = this.config()?.mantenimiento?.fechaEstimada?.trim();
    if (!fecha) return '';
    try {
      const d = new Date(fecha);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return '';
    }
  });

  telefono = computed(() => this.config()?.telefono || '');
  email = computed(() => this.config()?.correo_contacto || '');

  /** Busca una red social en el array por su icono */
  private urlRed(icono: string): string {
    const redes = this.config()?.redes || [];
    return redes.find((r) => r.icono === icono)?.url || '';
  }

  whatsappUrl = computed(() => this.urlRed('whatsapp'));
  instagramUrl = computed(() => this.urlRed('instagram'));
  facebookUrl = computed(() => this.urlRed('facebook'));
  linkedinUrl = computed(() => this.urlRed('linkedin'));

  hayRedes = computed(
    () => !!(this.instagramUrl() || this.facebookUrl() || this.linkedinUrl()),
  );
}
