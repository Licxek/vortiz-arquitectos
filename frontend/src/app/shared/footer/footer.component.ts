import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, signal, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ConfiguracionService, Configuracion } from '../../core/services/configuracion.service';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { TelefonoFormatoPipe } from '../pipes/telefono-formato.pipe';

interface LineaHorario {
  etiqueta: string;   // "Lun – Vie" o "Sáb" o "Dom"
  valor: string;      // "9:00 – 18:00" o "Cerrado"
  cerrado: boolean;
}
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RevealDirective,
    NgOptimizedImage,
    SkeletonComponent,
    TelefonoFormatoPipe,
  ],
  templateUrl: './footer.component.html',
})
export class FooterComponent implements OnInit, OnDestroy {
  configuracion: Configuracion | null = null;
  anio = new Date().getFullYear();
  mostrarArriba = false;
  cargando = signal(true);
  private sanitizer = inject(DomSanitizer);
  /** Si el negocio está abierto en este momento según config de agenda */
  estaAbiertoAhora = false;
  private intervaloEstado: any;
    /** Feedback visual de "copiado" */
  telefonoCopiado = false;
  private timeoutCopiado: any;
  /** Líneas de horario procesadas para mostrar en el footer */
  lineasHorario: LineaHorario[] = [];

  navLinks = [
    { label: 'Inicio', path: '/home' },
    { label: 'Servicios', path: '/servicios' },
    { label: 'Proyectos', path: '/proyectos' },
    { label: 'Nosotros', path: '/nosotros' },
  ];

  constructor(
    private configuracionService: ConfiguracionService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** URL del iframe de Google Maps (se cachea, solo se recalcula si cambia la dirección) */
  mapaUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    `https://maps.google.com/maps?q=${encodeURIComponent('Milpillas 101, La Forestal, Durango, Mexico')}&output=embed`,
  );

  /** Link "Ver en Google Maps" */
  mapaLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Milpillas 101, La Forestal, Durango')}`;

  /** Dirección actual cacheada para detectar cambios reales */
  private direccionCacheada = '';

  @HostListener('window:scroll')
  onScroll() {
    this.mostrarArriba = window.scrollY > 400;
  }

  scrollArriba() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit() {
    this.configuracionService.configPublica$.subscribe((c) => {
      this.configuracion = c;

      // Solo recalcular el mapa si la dirección REALMENTE cambió
      const direccionNueva = c?.direccion || 'Milpillas 101, La Forestal, Durango, Mexico';
      if (direccionNueva !== this.direccionCacheada) {
        this.direccionCacheada = direccionNueva;
        this.mapaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://maps.google.com/maps?q=${encodeURIComponent(direccionNueva)}&output=embed`,
        );
        this.mapaLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionNueva)}`;
      }

      // Recalcular estado "abierto/cerrado"
      this.calcularEstadoAbierto();

      this.cargando.set(false);
      this.cdr.markForCheck();
    });

    // Actualizar estado cada minuto
    this.intervaloEstado = setInterval(() => {
      this.calcularEstadoAbierto();
      this.cdr.markForCheck();
    }, 60000);
  }

  ngOnDestroy() {
    if (this.intervaloEstado) clearInterval(this.intervaloEstado);
    if (this.timeoutCopiado) clearTimeout(this.timeoutCopiado);
  }

  /**
   * Determina si el negocio está abierto ahora mismo.
   * Lee configuracion.agenda.diasSemana (con horarios por día) y horario global.
   */
  private calcularEstadoAbierto() {
    const agenda = this.configuracion?.agenda;
    if (!agenda?.diasSemana?.length) {
      this.estaAbiertoAhora = false;
      this.lineasHorario = [];
      return;
    }

    // 👇 Recalcular las líneas de horario también
    this.calcularLineasHorario();

    const ahora = new Date();
    const jsDay = ahora.getDay();
    const arrayIdx = (jsDay + 6) % 7;

    const diaConfig = agenda.diasSemana[arrayIdx];
    if (!diaConfig?.activo) {
      this.estaAbiertoAhora = false;
      return;
    }

    const horaInicio = diaConfig.horaInicio || agenda.horaInicio || '09:00';
    const horaFin = diaConfig.horaFin || agenda.horaFin || '18:00';

    const [hI, mI] = horaInicio.split(':').map(Number);
    const [hF, mF] = horaFin.split(':').map(Number);
    const inicioMin = hI * 60 + mI;
    const finMin = hF * 60 + mF;
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();

    this.estaAbiertoAhora = ahoraMin >= inicioMin && ahoraMin < finMin;
  }

  copiarTelefono() {
    const tel = this.configuracion?.telefono || '';
    if (!tel) return;

    navigator.clipboard.writeText(tel).then(
      () => {
        this.telefonoCopiado = true;
        this.cdr.markForCheck();
        if (this.timeoutCopiado) clearTimeout(this.timeoutCopiado);
        this.timeoutCopiado = setTimeout(() => {
          this.telefonoCopiado = false;
          this.cdr.markForCheck();
        }, 2000);
      },
      () => {
        // Fallback silencioso si clipboard no está disponible
      },
    );
  }

  /**
   * Construye las líneas de horario agrupando días con el mismo horario.
   * Ejemplo: Lun-Vie 9:00-18:00, Sáb 10:00-14:00, Dom Cerrado
   */
  private calcularLineasHorario() {
    const agenda = this.configuracion?.agenda;
    if (!agenda?.diasSemana?.length) {
      this.lineasHorario = [];
      return;
    }

    const horaGlobalInicio = agenda.horaInicio || '09:00';
    const horaGlobalFin = agenda.horaFin || '18:00';

    // Normalizar cada día con su horario efectivo
    const dias = agenda.diasSemana.map((d: any) => ({
      nombre: d.nombre,
      abrev: d.abrev,
      activo: d.activo,
      horaInicio: d.activo ? (d.horaInicio || horaGlobalInicio) : '',
      horaFin: d.activo ? (d.horaFin || horaGlobalFin) : '',
    }));

    // Agrupar días consecutivos con el mismo horario
    const grupos: Array<{
      dias: typeof dias;
      horaInicio: string;
      horaFin: string;
      activo: boolean;
    }> = [];

    let grupoActual: any = null;
    for (const dia of dias) {
      const clave = dia.activo ? `${dia.horaInicio}-${dia.horaFin}` : 'cerrado';
      const claveActual = grupoActual
        ? (grupoActual.activo ? `${grupoActual.horaInicio}-${grupoActual.horaFin}` : 'cerrado')
        : null;

      if (grupoActual && claveActual === clave) {
        grupoActual.dias.push(dia);
      } else {
        grupoActual = {
          dias: [dia],
          horaInicio: dia.horaInicio,
          horaFin: dia.horaFin,
          activo: dia.activo,
        };
        grupos.push(grupoActual);
      }
    }

    // Formatear cada grupo como línea de horario
    this.lineasHorario = grupos.map((g) => {
      const etiqueta =
        g.dias.length === 1
          ? g.dias[0].abrev
          : `${g.dias[0].abrev} – ${g.dias[g.dias.length - 1].abrev}`;

      return {
        etiqueta,
        valor: g.activo ? `${g.horaInicio} – ${g.horaFin}` : 'Cerrado',
        cerrado: !g.activo,
      };
    });
  }
}
