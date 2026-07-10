import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

interface Countdown {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
  vencido: boolean;
}

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './mantenimiento.component.html',
  styleUrl: './mantenimiento.component.css',
})
export class MantenimientoComponent implements OnInit, OnDestroy {
  private configService = inject(ConfiguracionService);

  config = toSignal(this.configService.configPublica$, { initialValue: null });

  // Signals reactivos
  ahora = computed(() => new Date().getFullYear());
  horaActual = signal(this.formatearHora(new Date()));
  countdown = signal<Countdown | null>(null);
  progreso = signal(23); // porcentaje aleatorio inicial

  // Intervals
  private intervalReloj: any = null;
  private intervalCountdown: any = null;
  private intervalProgreso: any = null;

  ngOnInit() {
    // Reloj en vivo
    this.intervalReloj = setInterval(() => {
      this.horaActual.set(this.formatearHora(new Date()));
    }, 1000);

    // Countdown en vivo
    this.actualizarCountdown();
    this.intervalCountdown = setInterval(() => this.actualizarCountdown(), 1000);

    // Progreso animado (sube lento aleatoriamente entre 15% y 87%)
    this.intervalProgreso = setInterval(() => {
      const actual = this.progreso();
      // Incremento aleatorio entre -1 y +3
      const delta = Math.floor(Math.random() * 5) - 1;
      const nuevo = Math.max(15, Math.min(87, actual + delta));
      this.progreso.set(nuevo);
    }, 2500);
  }

  ngOnDestroy() {
    if (this.intervalReloj) clearInterval(this.intervalReloj);
    if (this.intervalCountdown) clearInterval(this.intervalCountdown);
    if (this.intervalProgreso) clearInterval(this.intervalProgreso);
  }

  private formatearHora(d: Date): string {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  private actualizarCountdown() {
    const fecha = this.config()?.mantenimiento?.fechaEstimada?.trim();
    if (!fecha) {
      this.countdown.set(null);
      return;
    }

    try {
      const objetivo = new Date(fecha).getTime();
      const ahora = Date.now();
      const diff = objetivo - ahora;

      if (diff <= 0) {
        this.countdown.set({
          dias: 0,
          horas: 0,
          minutos: 0,
          segundos: 0,
          vencido: true,
        });
        return;
      }

      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutos = Math.floor((diff / (1000 * 60)) % 60);
      const segundos = Math.floor((diff / 1000) % 60);

      this.countdown.set({ dias, horas, minutos, segundos, vencido: false });
    } catch {
      this.countdown.set(null);
    }
  }

  nombre = computed(() => this.config()?.nombre || 'Vortiz Arquitectos');

  mensaje = computed(
    () =>
      this.config()?.mantenimiento?.mensaje ||
      'Estamos rediseñando cada rincón del sitio con la misma precisión que aplicamos a cada proyecto.',
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
