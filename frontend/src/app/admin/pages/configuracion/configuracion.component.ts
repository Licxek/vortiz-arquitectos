import { Component, OnInit, HostListener, ChangeDetectorRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfiguracionService } from '../../../core/services/configuracion.service'; // ajusta la ruta si tu carpeta es distinta
import { forkJoin } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service'; // ajusta la ruta
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import { ActivatedRoute } from '@angular/router';
import { combineLatest } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';

interface DiaSemana {
  nombre: string;
  abrev: string;
  activo: boolean;
}

interface DiaFeriado {
  id: number;
  fecha: string;
  motivo: string;
}

interface RedSocial {
  nombre: string;
  icono: string;
  url: string;
  activa: boolean;
  color: string;
  personalizada?: boolean;
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent, SkeletonComponent,SafeUrlPipe],
  templateUrl: './configuracion.component.html',
})
export class ConfiguracionComponent implements OnInit {
  constructor(
    private configuracionService: ConfiguracionService,
    private theme: ThemeService,
    private cdr: ChangeDetectorRef,
  ) {}
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  // Tab activa
  tabActiva:
    | 'negocio'
    | 'contacto'
    | 'agenda'
    | 'apariencia'
    | 'notificaciones'
    | 'seo'
    | 'mantenimiento' = 'negocio';

  // Mensaje de éxito flotante
  mensajeExito = '';
  guardando = false;
  cargando = signal(true);
  confirmacionAbierta = false;
  seccionARestaurar = '';
  confirmacionGuardarAbierta = false;
  seccionAGuardar = '';

  // =========== NEGOCIO ===========
  negocio = {
    nombre: 'Vortiz Arquitectos',
    eslogan: 'Diseñamos espacios, construimos confianza.',
    direccion: 'Milpillas 101, La Forestal',
    ciudad: 'Durango',
    estado: 'Dgo.',
    codigoPostal: '34217',
    rfc: 'VOR000000-001',
    mapaUrl: '', // 👈 NUEVO
  };

  // =========== CONTACTO ===========
  contacto = {
    telefono: '+52 618 000 0000',
    whatsapp: '618 000 0000',
    correoPublico: 'contacto@vortizarquitectos.com',
    correoNotificaciones: 'alertas@vortizarquitectos.com',
  };

  redes: RedSocial[] = [
    {
      nombre: 'Instagram',
      icono: 'instagram',
      url: 'https://www.instagram.com/vortizarquitectos',
      activa: true,
      color: 'pink',
    },
    {
      nombre: 'Facebook',
      icono: 'facebook',
      url: 'https://www.facebook.com/vortizarquitectos',
      activa: true,
      color: 'blue',
    },
    {
      nombre: 'LinkedIn',
      icono: 'linkedin',
      url: 'https://www.linkedin.com/in/vortizarquitectos',
      activa: true,
      color: 'sky',
    },
    { nombre: 'Twitter / X', icono: 'twitter', url: '', activa: false, color: 'gray' },
    { nombre: 'YouTube', icono: 'youtube', url: '', activa: false, color: 'red' },
    {
      nombre: 'WhatsApp',
      icono: 'whatsapp',
      url: 'https://wa.me/526180000000',
      activa: true,
      color: 'green',
    },
  ];

  // =========== AGENDA ===========
  diasSemana: DiaSemana[] = [
    { nombre: 'Lunes', abrev: 'Lun', activo: true },
    { nombre: 'Martes', abrev: 'Mar', activo: true },
    { nombre: 'Miércoles', abrev: 'Mié', activo: true },
    { nombre: 'Jueves', abrev: 'Jue', activo: true },
    { nombre: 'Viernes', abrev: 'Vie', activo: true },
    { nombre: 'Sábado', abrev: 'Sáb', activo: false },
    { nombre: 'Domingo', abrev: 'Dom', activo: false },
  ];

  agenda = {
    horaInicio: '09:00',
    horaFin: '18:00',
    duracionCita: 60,
    tiempoEntreCitas: 15,
    limiteDiario: 8,
  };

  diasFeriados: DiaFeriado[] = [
    { id: 1, fecha: '2026-12-25', motivo: 'Navidad' },
    { id: 2, fecha: '2026-01-01', motivo: 'Año nuevo' },
    { id: 3, fecha: '2026-12-12', motivo: 'Día de la Virgen de Guadalupe' },
  ];
  nuevoFeriado = { fecha: '', motivo: '' };

  // =========== APARIENCIA ===========
  apariencia = {
    logoUrl: '/assets/img/logo.png',
    logoFooterUrl: '/assets/img/logo_vortiz.png',
    faviconUrl: '/assets/img/logo.ico',
    colorPrimario: '#0a4d7a',
    colorSecundario: '#0a1f3d',
    colorTextoNav: '#ffffff',
    colorTextoFooter: '#ffffff',
    degradadoInicio: '#000000',
    degradadoFin: '#0a1f3d',
  };

  // =========== NOTIFICACIONES ===========
  notificaciones = {
    nuevaCita: true,
    nuevaConsulta: true,
    resumenDiario: false,
    resumenSemanal: true,
    recordatorio24h: true,
    recordatorio1h: false,
    canalRecordatorio: 'email' as 'email' | 'whatsapp' | 'ambos',
  };

  // =========== SEO ===========
  seo = {
    metaTitle: 'Vortiz Arquitectos - Diseño y construcción profesional en Durango',
    metaDescription:
      'Firma de arquitectura en Durango especializada en proyectos residenciales, comerciales e industriales. Diseñamos espacios, construimos confianza.',
    keywords: 'arquitectos durango, diseño residencial, proyectos comerciales, construcción',
    ogImageUrl: '/assets/img/og-image.png',
    siteUrl: 'https://vortizarquitectos.com.mx', // 👈 NUEVO
  };

  mantenimiento = {
    activo: false,
    mensaje: 'Estamos haciendo mejoras en el sitio. Volveremos muy pronto.',
    fechaEstimada: '',
  };

  ngOnInit() {
    for (let h = 6; h <= 23; h++) {
      this.horasDisponibles.push(`${h.toString().padStart(2, '0')}:00`);
      this.horasDisponibles.push(`${h.toString().padStart(2, '0')}:30`);
    }

    this.configuracionService.obtenerCompleta().subscribe({
      next: (c) => {
        if (c.negocio) this.negocio = { ...this.negocio, ...c.negocio };
        if (c.contacto) this.contacto = { ...this.contacto, ...c.contacto };
        if (c.redes?.length) this.redes = c.redes;
        if (c.agenda) {
          const { diasSemana, diasFeriados, ...scalars } = c.agenda;
          this.agenda = { ...this.agenda, ...scalars };
          if (diasSemana?.length) this.diasSemana = diasSemana;
          if (diasFeriados) this.diasFeriados = diasFeriados;
        }
        if (c.apariencia) this.apariencia = { ...this.apariencia, ...c.apariencia };
        if (c.notificaciones) this.notificaciones = { ...this.notificaciones, ...c.notificaciones };
        if (c.seo) this.seo = { ...this.seo, ...c.seo };
        if (c.mantenimiento) {
          this.mantenimiento = { ...this.mantenimiento, ...c.mantenimiento };
        }
        this.capturarTodosLosSnapshots();
        this.cargando.set(false); // 👈 NUEVO
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando.set(false); // 👈 NUEVO: aunque falle, sale del skeleton
        this.cdr.markForCheck();
      },
    });

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.aplicarTabYFragment());

    this.aplicarTabYFragment();
  }

  cambiarTab(tab: typeof this.tabActiva): void {
    if (tab === this.tabActiva) return;

    // Si la tab actual tiene cambios sin guardar, pedir confirmación
    if (this.hayCambiosEn(this.tabActiva)) {
      this.tabPendiente = tab;
      this.mostrarConfirmarCambioTab = true;
      return;
    }

    this.tabActiva = tab;
  }

  toggleDia(dia: DiaSemana) {
    dia.activo = !dia.activo;
    // No requiere ajuste numérico, pero recalcula coherencia
  }

  toggleRed(red: RedSocial) {
    red.activa = !red.activa;
  }

  agregarRed() {
    this.redes.push({
      nombre: '',
      icono: 'generico',
      url: '',
      activa: true,
      color: 'gray',
      personalizada: true,
    });
  }

  private detectarIcono(nombre: string): string {
    const n = (nombre || '').toLowerCase().trim();
    if (n.includes('instagram') || n.includes('insta')) return 'instagram';
    if (n.includes('facebook') || n.includes('face')) return 'facebook';
    if (n.includes('linkedin')) return 'linkedin';
    if (n.includes('whatsapp') || n.includes('whats')) return 'whatsapp';
    if (n.includes('youtube')) return 'youtube';
    if (n.includes('tiktok') || n.includes('tik tok')) return 'tiktok';
    if (n.includes('pinterest')) return 'pinterest';
    if (n.includes('telegram')) return 'telegram';
    if (n.includes('twitter') || n === 'x') return 'twitter';
    return 'generico';
  }

  actualizarIcono(red: RedSocial) {
    red.icono = this.detectarIcono(red.nombre);
  }

  eliminarRed(red: RedSocial) {
    this.redes = this.redes.filter((r) => r !== red);
  }

  get redesActivas() {
    return this.redes.filter((r) => r.activa).length;
  }

  agregarFeriado() {
    if (this.nuevoFeriado.fecha && this.nuevoFeriado.motivo) {
      this.diasFeriados.push({
        id: Date.now(),
        fecha: this.nuevoFeriado.fecha,
        motivo: this.nuevoFeriado.motivo,
      });
      this.nuevoFeriado = { fecha: '', motivo: '' };
    }
  }

  eliminarFeriado(id: number) {
    this.diasFeriados = this.diasFeriados.filter((f) => f.id !== id);
  }

  guardarCambios(seccion: string) {
    const cambios: { key: string; datos: any }[] = [];

    switch (seccion) {
      case 'Negocio':
        cambios.push({ key: 'negocio', datos: this.negocio });
        break;
      case 'Contacto':
        cambios.push({ key: 'contacto', datos: this.contacto });
        cambios.push({ key: 'redes', datos: this.redes });
        break;
      case 'Agenda':
        cambios.push({
          key: 'agenda',
          datos: {
            ...this.agenda,
            diasSemana: this.diasSemana,
            diasFeriados: this.diasFeriados,
          },
        });
        break;
      case 'Apariencia':
        cambios.push({ key: 'apariencia', datos: this.apariencia });
        break;
      case 'Notificaciones':
        cambios.push({ key: 'notificaciones', datos: this.notificaciones });
        break;
      case 'SEO':
        cambios.push({ key: 'seo', datos: this.seo });
        break;
      case 'Mantenimiento':
        cambios.push({ key: 'mantenimiento', datos: this.mantenimiento });
        break;
    }

    this.guardando = true;
    forkJoin(
      cambios.map((c) => this.configuracionService.guardarSeccion(c.key, c.datos)),
    ).subscribe({
      next: () => {
        this.guardando = false;
        this.configuracionService.cargarPublica();
        const mapInverso: Record<string, string> = {
          Negocio: 'negocio',
          Contacto: 'contacto',
          Agenda: 'agenda',
          Apariencia: 'apariencia',
          Notificaciones: 'notificaciones',
          SEO: 'seo',
          Mantenimiento: 'mantenimiento',
        };
        if (mapInverso[seccion]) this.capturarSnapshot(mapInverso[seccion]);
        this.mensajeExito = `Cambios de "${seccion}" guardados correctamente`;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.mensajeExito = '';
          this.cdr.markForCheck();
        }, 3000);
      },
      error: () => {
        this.guardando = false;
        this.mensajeExito = 'Error al guardar. Intenta de nuevo.';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.mensajeExito = '';
          this.cdr.markForCheck();
        }, 3000);
      },
    });
  }

  pedirGuardar(seccion: string) {
    // ✅ Convertir 'negocio' → 'Negocio' usando el mapa
    this.seccionAGuardar = this.MAP_TAB_LABEL[seccion] || seccion;
    this.confirmacionGuardarAbierta = true;
  }

  cancelarGuardado() {
    this.confirmacionGuardarAbierta = false;
    this.seccionAGuardar = '';
  }

  confirmarGuardado() {
    const seccion = this.seccionAGuardar;
    this.confirmacionGuardarAbierta = false;
    this.seccionAGuardar = '';
    this.guardarCambios(seccion);
  }

  // Selectores personalizados de la pestaña Agenda
  horasDisponibles: string[] = [];
  selectorHoraInicioAbierto = false;
  selectorHoraFinAbierto = false;
  selectorDuracionAbierto = false;
  selectorTiempoEntreAbierto = false;

  opcionesDuracion = [
    { value: 30, label: '30 minutos' },
    { value: 45, label: '45 minutos' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1 hora 30 min' },
    { value: 120, label: '2 horas' },
  ];

  opcionesTiempoEntre = [
    { value: 0, label: 'Sin descanso' },
    { value: 10, label: '10 minutos' },
    { value: 15, label: '15 minutos' },
    { value: 30, label: '30 minutos' },
  ];

  toggleSelectorHora(tipo: 'inicio' | 'fin', event: Event) {
    event.stopPropagation();
    this.cerrarTodos();
    if (tipo === 'inicio') this.selectorHoraInicioAbierto = true;
    else this.selectorHoraFinAbierto = true;
  }

  seleccionarHora(tipo: 'inicio' | 'fin', hora: string) {
    if (tipo === 'inicio') this.agenda.horaInicio = hora;
    else this.agenda.horaFin = hora;
    this.cerrarTodos();
    this.ajustarCoherencia(tipo === 'inicio' ? 'horaInicio' : 'horaFin'); // 👈 NUEVO
  }

  toggleSelectorDuracion(event: Event) {
    event.stopPropagation();
    const estado = this.selectorDuracionAbierto;
    this.cerrarTodos();
    this.selectorDuracionAbierto = !estado;
  }

  seleccionarDuracion(valor: number) {
    this.agenda.duracionCita = valor;
    this.cerrarTodos();
    this.ajustarCoherencia('duracion'); // 👈 NUEVO
  }

  get duracionLabel() {
    return this.opcionesDuracion.find((o) => o.value === this.agenda.duracionCita)?.label || '';
  }

  toggleSelectorTiempoEntre(event: Event) {
    event.stopPropagation();
    const estado = this.selectorTiempoEntreAbierto;
    this.cerrarTodos();
    this.selectorTiempoEntreAbierto = !estado;
  }

  seleccionarTiempoEntre(valor: number) {
    this.agenda.tiempoEntreCitas = valor;
    this.cerrarTodos();
    this.ajustarCoherencia('buffer'); // 👈 NUEVO
  }

  get tiempoEntreLabel() {
    return (
      this.opcionesTiempoEntre.find((o) => o.value === this.agenda.tiempoEntreCitas)?.label || ''
    );
  }

  private cerrarTodos() {
    this.selectorHoraInicioAbierto = false;
    this.selectorHoraFinAbierto = false;
    this.selectorDuracionAbierto = false;
    this.selectorTiempoEntreAbierto = false;
  }

  @HostListener('document:click')
  cerrarSelectoresPorDocumento() {
    this.cerrarTodos();
  }

  restaurar(seccion: string) {
    // ✅ Mismo fix
    this.seccionARestaurar = this.MAP_TAB_LABEL[seccion] || seccion;
    this.confirmacionAbierta = true;
  }

  cancelarRestauracion() {
    this.confirmacionAbierta = false;
    this.seccionARestaurar = '';
  }

  confirmarRestauracion() {
    const seccion = this.seccionARestaurar;
    this.confirmacionAbierta = false;
    this.seccionARestaurar = '';

    switch (seccion) {
      case 'Negocio':
        this.negocio = {
          nombre: 'Vortiz Arquitectos',
          eslogan: 'Diseñamos espacios, construimos confianza.',
          direccion: 'Milpillas 101, La Forestal',
          ciudad: 'Durango',
          estado: 'Dgo.',
          codigoPostal: '34217',
          rfc: 'VOR000000-001',
          mapaUrl: '', // 👈 NUEVO
        };
        break;
      case 'Contacto':
        this.contacto = {
          telefono: '+52 618 000 0000',
          whatsapp: '618 000 0000',
          correoPublico: 'contacto@vortizarquitectos.com',
          correoNotificaciones: 'alertas@vortizarquitectos.com',
        };
        this.redes = [
          {
            nombre: 'Instagram',
            icono: 'instagram',
            url: 'https://www.instagram.com/vortizarquitectos',
            activa: true,
            color: 'pink',
          },
          {
            nombre: 'Facebook',
            icono: 'facebook',
            url: 'https://www.facebook.com/vortizarquitectos',
            activa: true,
            color: 'blue',
          },
          {
            nombre: 'LinkedIn',
            icono: 'linkedin',
            url: 'https://www.linkedin.com/in/vortizarquitectos',
            activa: true,
            color: 'sky',
          },
          { nombre: 'Twitter / X', icono: 'twitter', url: '', activa: false, color: 'gray' },
          { nombre: 'YouTube', icono: 'youtube', url: '', activa: false, color: 'red' },
          {
            nombre: 'WhatsApp',
            icono: 'whatsapp',
            url: 'https://wa.me/526180000000',
            activa: true,
            color: 'green',
          },
        ];
        break;
      case 'Agenda':
        this.diasSemana = [
          { nombre: 'Lunes', abrev: 'Lun', activo: true },
          { nombre: 'Martes', abrev: 'Mar', activo: true },
          { nombre: 'Miércoles', abrev: 'Mié', activo: true },
          { nombre: 'Jueves', abrev: 'Jue', activo: true },
          { nombre: 'Viernes', abrev: 'Vie', activo: true },
          { nombre: 'Sábado', abrev: 'Sáb', activo: false },
          { nombre: 'Domingo', abrev: 'Dom', activo: false },
        ];
        this.agenda = {
          horaInicio: '09:00',
          horaFin: '18:00',
          duracionCita: 60,
          tiempoEntreCitas: 15,
          limiteDiario: 8,
        };
        this.diasFeriados = [
          { id: 1, fecha: '2026-12-25', motivo: 'Navidad' },
          { id: 2, fecha: '2026-01-01', motivo: 'Año nuevo' },
          { id: 3, fecha: '2026-12-12', motivo: 'Día de la Virgen de Guadalupe' },
        ];
        break;
      case 'Apariencia':
        this.apariencia = {
          logoUrl: '/assets/img/logo.png',
          logoFooterUrl: '/assets/img/logo_vortiz.png',
          faviconUrl: '/assets/img/logo.ico',
          colorPrimario: '#0a4d7a',
          colorSecundario: '#0a1f3d',
          colorTextoNav: '#ffffff',
          colorTextoFooter: '#ffffff',
          degradadoInicio: '#000000',
          degradadoFin: '#0a1f3d',
        };
        break;
      case 'Notificaciones':
        this.notificaciones = {
          nuevaCita: true,
          nuevaConsulta: true,
          resumenDiario: false,
          resumenSemanal: true,
          recordatorio24h: true,
          recordatorio1h: false,
          canalRecordatorio: 'email' as 'email' | 'whatsapp' | 'ambos',
        };
        break;
      case 'SEO':
        this.seo = {
          metaTitle: 'Vortiz Arquitectos - Diseño y construcción profesional en Durango',
          metaDescription:
            'Firma de arquitectura en Durango especializada en proyectos residenciales, comerciales e industriales. Diseñamos espacios, construimos confianza.',
          keywords: 'arquitectos durango, diseño residencial, proyectos comerciales, construcción',
          ogImageUrl: '/assets/img/og-image.png',
          siteUrl: 'https://vortizarquitectos.com.mx', // 👈 NUEVO
        };
        break;
    }

    this.guardarCambios(seccion);
  }

  async setMantenimiento(nuevoEstado: boolean) {
    if (this.mantenimiento.activo === nuevoEstado || this.guardando) return;

    this.guardando = true;
    this.cdr.markForCheck();

    const payload = {
      activo: nuevoEstado,
      mensaje: this.mantenimiento.mensaje,
      fechaEstimada: this.mantenimiento.fechaEstimada,
    };

    this.configuracionService.guardarSeccion('mantenimiento', payload).subscribe({
      next: (res) => {
        this.mantenimiento.activo = nuevoEstado;
        this.capturarSnapshot('mantenimiento');
        this.configuracionService.cargarPublica();
        this.guardando = false;
        this.mensajeExito = nuevoEstado
          ? '🛠️ Modo mantenimiento ACTIVADO'
          : '✅ Sitio público restaurado';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.mensajeExito = '';
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (err) => {
        this.guardando = false;
        this.mensajeExito = 'Error al cambiar el modo. Intenta de nuevo.';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.mensajeExito = '';
          this.cdr.markForCheck();
        }, 3000);
      },
    });
  }

  // Método nuevo en la clase:
  private aplicarTabYFragment() {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    const fragment = this.route.snapshot.fragment;
    const tabsValidas = [
      'negocio',
      'contacto',
      'agenda',
      'apariencia',
      'notificaciones',
      'seo',
      'mantenimiento',
    ];

    if (tab && tabsValidas.includes(tab)) {
      this.tabActiva = tab as any;
    }
    if (fragment) {
      setTimeout(() => {
        const el = document.getElementById(fragment);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('vortiz-highlight-flash');
          setTimeout(() => el.classList.remove('vortiz-highlight-flash'), 2000);
        }
      }, 400);
    }
  }
  // ====== Cálculo de coherencia de Agenda ======

  /** Minutos totales de horario laboral */
  get minutosLaborales(): number {
    if (!this.agenda.horaInicio || !this.agenda.horaFin) return 0;
    const [hI, mI] = this.agenda.horaInicio.split(':').map(Number);
    const [hF, mF] = this.agenda.horaFin.split(':').map(Number);
    const total = hF * 60 + mF - (hI * 60 + mI);
    return Math.max(0, total);
  }

  /** Horas laborales formateadas (ej: "9 h" o "8.5 h") */
  get horasLaboralesLabel(): string {
    const min = this.minutosLaborales;
    const h = min / 60;
    return h === Math.floor(h) ? `${h} h` : `${h.toFixed(1)} h`;
  }

  /** Cuántas citas físicamente caben con la config actual */
  get capacidadDiariaCalculada(): number {
    const total = this.minutosLaborales;
    if (total === 0) return 0;
    const duracion = this.agenda.duracionCita || 60;
    const buffer = this.agenda.tiempoEntreCitas || 0;
    if (duracion > total) return 0;
    const slot = duracion + buffer;
    // El último slot no necesita buffer después
    return Math.floor((total - duracion) / slot) + 1;
  }

  /** Límite efectivo (min entre capacidad física y limiteDiario) */
  get limiteEfectivo(): number {
    const cap = this.capacidadDiariaCalculada;
    if (!this.agenda.limiteDiario || this.agenda.limiteDiario <= 0) return cap;
    return Math.min(cap, this.agenda.limiteDiario);
  }

  /** Estado de coherencia: errores duros + advertencias suaves */
  get coherenciaAgenda(): { advertencias: string[] } {
    const advertencias: string[] = [];

    const diasActivos = this.diasSemana.filter((d) => d.activo).length;
    if (diasActivos === 0) {
      advertencias.push(
        'No tienes días laborales activos. Activa al menos uno para recibir citas.',
      );
    }

    return { advertencias };
  }
  /**
   * Auto-ajusta los valores de agenda cuando cambia cualquier parámetro,
   * para mantener todo coherente sin necesidad de bloquear al usuario.
   */
  ajustarCoherencia(
    campoCambiado: 'horaInicio' | 'horaFin' | 'duracion' | 'buffer' | 'limite' | 'dia' = 'limite',
  ) {
    // 1. Hora fin debe ser posterior a hora inicio
    if (this.minutosLaborales <= 0) {
      const [hI, mI] = this.agenda.horaInicio.split(':').map(Number);
      const [hF, mF] = this.agenda.horaFin.split(':').map(Number);
      const inicioMin = hI * 60 + mI;
      const finMin = hF * 60 + mF;

      if (campoCambiado === 'horaInicio') {
        // El usuario movió inicio: bajamos inicio si excedió fin
        const nuevoInicio = Math.max(0, finMin - 60);
        this.agenda.horaInicio = this.minToHHMM(nuevoInicio);
      } else {
        // Caso general: empujamos fin hacia adelante 1h
        const nuevoFin = Math.min(23 * 60 + 59, inicioMin + 60);
        this.agenda.horaFin = this.minToHHMM(nuevoFin);
      }
    }

    // 2. Duración válida y cabe en el horario
    if (this.agenda.duracionCita <= 0) {
      this.agenda.duracionCita = 30;
    }
    const total = this.minutosLaborales;
    if (this.agenda.duracionCita > total && total > 0) {
      // Bajar a un múltiplo de 15 que sí entre
      const max = Math.floor(total / 15) * 15;
      this.agenda.duracionCita = Math.max(15, max);
    }

    // 3. Buffer no negativo
    if (this.agenda.tiempoEntreCitas < 0) {
      this.agenda.tiempoEntreCitas = 0;
    }
    // Si el buffer es tan grande que no caben ni 2 citas, reducirlo
    if (this.agenda.tiempoEntreCitas + this.agenda.duracionCita > total && total > 0) {
      this.agenda.tiempoEntreCitas = Math.max(0, total - this.agenda.duracionCita);
    }

    // 4. Límite diario coherente con capacidad
    const cap = this.capacidadDiariaCalculada;
    if (this.agenda.limiteDiario > cap && cap > 0) {
      this.agenda.limiteDiario = cap;
    }
    if (this.agenda.limiteDiario < 1) {
      this.agenda.limiteDiario = 1;
    }
  }

  private minToHHMM(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Sistema de cambios sin guardar
  private snapshots: Record<string, string> = {};
  private tabPendiente: typeof this.tabActiva | null = null;
  mostrarConfirmarCambioTab = false;

  private readonly TABS_VALIDAS = [
    'negocio',
    'contacto',
    'agenda',
    'apariencia',
    'notificaciones',
    'seo',
    'mantenimiento',
  ] as const;

  readonly MAP_TAB_LABEL: Record<string, string> = {
    negocio: 'Negocio',
    contacto: 'Contacto',
    agenda: 'Agenda',
    apariencia: 'Apariencia',
    notificaciones: 'Notificaciones',
    seo: 'SEO',
    mantenimiento: 'Mantenimiento',
  };

  /** Serializa el estado actual de una sección */
  private serializarSeccion(seccion: string): string {
    switch (seccion) {
      case 'negocio':
        return JSON.stringify(this.negocio);
      case 'contacto':
        return JSON.stringify({ contacto: this.contacto, redes: this.redes });
      case 'agenda':
        return JSON.stringify({
          ...this.agenda,
          diasSemana: this.diasSemana,
          diasFeriados: this.diasFeriados,
        });
      case 'apariencia':
        return JSON.stringify(this.apariencia);
      case 'notificaciones':
        return JSON.stringify(this.notificaciones);
      case 'seo':
        return JSON.stringify(this.seo);
      case 'mantenimiento':
        return JSON.stringify(this.mantenimiento);
      default:
        return '';
    }
  }

  /** Captura snapshot del estado actual */
  private capturarSnapshot(seccion: string): void {
    this.snapshots[seccion] = this.serializarSeccion(seccion);
  }

  /** Captura snapshots de TODAS las secciones */
  private capturarTodosLosSnapshots(): void {
    this.TABS_VALIDAS.forEach((s) => this.capturarSnapshot(s));
  }

  /** Verifica si una sección tiene cambios sin guardar */
  hayCambiosEn(seccion: string): boolean {
    if (!this.snapshots[seccion]) return false;
    return this.serializarSeccion(seccion) !== this.snapshots[seccion];
  }

  /** Restaura el estado de una sección desde su snapshot */
  private restaurarDesdeSnapshot(seccion: string): void {
    const snap = this.snapshots[seccion];
    if (!snap) return;
    const datos = JSON.parse(snap);
    switch (seccion) {
      case 'negocio':
        this.negocio = datos;
        break;
      case 'contacto':
        this.contacto = datos.contacto;
        this.redes = datos.redes;
        break;
      case 'agenda':
        const { diasSemana, diasFeriados, ...scalars } = datos;
        this.agenda = scalars;
        this.diasSemana = diasSemana;
        this.diasFeriados = diasFeriados;
        break;
      case 'apariencia':
        this.apariencia = datos;
        break;
      case 'notificaciones':
        this.notificaciones = datos;
        break;
      case 'seo':
        this.seo = datos;
        break;
      case 'mantenimiento':
        this.mantenimiento = datos;
        break;
    }
  }

  descartarCambiosYCambiarTab(): void {
    this.restaurarDesdeSnapshot(this.tabActiva);
    this.mostrarConfirmarCambioTab = false;
    if (this.tabPendiente) {
      this.tabActiva = this.tabPendiente;
      this.tabPendiente = null;
    }
    this.cdr.markForCheck();
  }

  cancelarCambioTab(): void {
    this.mostrarConfirmarCambioTab = false;
    this.tabPendiente = null;
  }

  guardarYCambiarTab(): void {
    const tabActual = this.tabActiva;
    const label = this.MAP_TAB_LABEL[tabActual];
    this.guardarCambios(label);
    this.mostrarConfirmarCambioTab = false;
    if (this.tabPendiente) {
      this.tabActiva = this.tabPendiente;
      this.tabPendiente = null;
    }
  }
}
