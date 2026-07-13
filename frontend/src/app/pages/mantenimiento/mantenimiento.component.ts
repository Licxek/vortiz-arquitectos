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

  ahora = computed(() => new Date().getFullYear());
  horaActual = signal(this.formatearHora(new Date()));
  countdown = signal<Countdown | null>(null);

  // 🔥 Signal que se actualiza CADA SEGUNDO para forzar recálculo del progreso
  private tickTiempo = signal(Date.now());

  private intervalReloj: any = null;
  private intervalCountdown: any = null;
  private intervalTick: any = null;

  ngOnInit() {
    // Reloj cada segundo
    this.intervalReloj = setInterval(() => {
      this.horaActual.set(this.formatearHora(new Date()));
    }, 1000);

    // Countdown cada segundo
    this.actualizarCountdown();
    this.intervalCountdown = setInterval(() => this.actualizarCountdown(), 1000);

    // 🔥 Tick de tiempo cada segundo para que el progreso se recalcule EN VIVO
    this.intervalTick = setInterval(() => {
      this.tickTiempo.set(Date.now());
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalReloj) clearInterval(this.intervalReloj);
    if (this.intervalCountdown) clearInterval(this.intervalCountdown);
    if (this.intervalTick) clearInterval(this.intervalTick);
    if (this.timeoutCopiado) clearTimeout(this.timeoutCopiado); // 👈 agregar
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
        this.countdown.set({ dias: 0, horas: 0, minutos: 0, segundos: 0, vencido: true });
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

  // 🔥 PROGRESO REAL con precisión de segundos (para que se vea en vivo)
  progreso = computed(() => {
    const ahora = this.tickTiempo(); // 👈 dependencia que fuerza recálculo cada segundo
    const m = this.config()?.mantenimiento;

    if (!m?.activadoEn || !m?.fechaEstimada) {
      return { porcentaje: 50, tieneReal: false, porcentajeExacto: 50 };
    }

    try {
      const inicio = new Date(m.activadoEn).getTime();
      const fin = new Date(m.fechaEstimada).getTime();

      if (isNaN(inicio) || isNaN(fin) || fin <= inicio) {
        return { porcentaje: 50, tieneReal: false, porcentajeExacto: 50 };
      }

      const total = fin - inicio;
      const transcurrido = ahora - inicio;
      const porcentajeExacto = (transcurrido / total) * 100;

      // Cap entre 1% y 99%
      const capped = Math.max(1, Math.min(99, porcentajeExacto));

      return {
        porcentaje: Math.round(capped),
        porcentajeExacto: capped, // 👈 con decimales para transición suave del ancho
        tieneReal: true,
      };
    } catch {
      return { porcentaje: 50, tieneReal: false, porcentajeExacto: 50 };
    }
  });

  labelProgreso = computed(() => {
    const { porcentaje, tieneReal } = this.progreso();
    if (!tieneReal) return 'Trabajando en el sitio';

    if (porcentaje >= 99) return 'Acabados finales';
    if (porcentaje >= 90) return 'Últimos ajustes';
    if (porcentaje >= 70) return 'Detalles finales';
    if (porcentaje >= 50) return 'Levantando muros';
    if (porcentaje >= 30) return 'Cimentando estructura';
    if (porcentaje >= 15) return 'Iniciando remodelación';
    return 'Preparando el terreno';
  });

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

  // ============ COPIAR TELÉFONO ============
  telefonoCopiado = signal(false);
  private timeoutCopiado: any = null;

  copiarTelefono() {
    const tel = this.telefono();
    if (!tel) return;

    // Intento moderno (Clipboard API)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(tel).then(
        () => this.mostrarCopiado(),
        () => this.copiarFallback(tel),
      );
    } else {
      this.copiarFallback(tel);
    }
  }

  private copiarFallback(texto: string) {
    // Fallback para navegadores antiguos
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.mostrarCopiado();
    } catch {
      // silencio
    }
    document.body.removeChild(textarea);
  }

  private mostrarCopiado() {
    this.telefonoCopiado.set(true);
    if (this.timeoutCopiado) clearTimeout(this.timeoutCopiado);
    this.timeoutCopiado = setTimeout(() => {
      this.telefonoCopiado.set(false);
      this.timeoutCopiado = null;
    }, 2000);
  }
}
