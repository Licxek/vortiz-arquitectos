import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InicioService, CitaBackend, ProyectoBackend } from '../../../core/services/inicio.service'; // ⚠️ ajusta la ruta
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import {
  ReportesService,
  HeatmapData,
  HeatmapSerie,
} from '../../../core/services/reportes.service';
import {
  GraficaDashboardComponent,
  PuntoGrafica,
} from '../../../shared/grafica-dashboard/grafica-dashboard.component';
import { HeatmapHorariosComponent } from '../../../shared/heatmap-horarios/heatmap-horarios.component';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { forkJoin, of } from 'rxjs';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { ImageCarouselComponent } from '../../../shared/image-carousel/image-carousel.component';
import { takeUntil } from 'rxjs/operators'; // ← agregar takeUntil
import { Subject } from 'rxjs';

// ============ INTERFACES ============
interface StatCard {
  label: string;
  value: number;
  cambioValor: number;
  cambioTipo: 'positive' | 'negative' | 'neutral';
  cambioEtiqueta: string;
  icon: string;
  color: string;
}

interface ConsultaPendiente {
  id: number;
  nombre: string;
  correo: string;
  asunto: string;
  mensaje: string;
  fecha: string;
  urgente: boolean;
}

interface Proyecto {
  id: number;
  nombre: string;
  estado: string;
  fecha: string;
  imagen: string;
  imagenes: string[];
  cliente?: string;
  ubicacion?: string;
  superficie?: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaEntrega?: string;
  progreso?: number;
}

interface Cita {
  hora: string;
  cliente: string;
  tipo: string;
  estado: 'confirmada' | 'pendiente';
}

interface ConsultaPendiente {
  id: number;
  nombre: string;
  correo: string;
  telefono: string; // 👈 NUEVO
  asunto: string;
  mensaje: string;
  fecha: string; // tiempo relativo de creación
  fechaCita: string; // 👈 NUEVO — fecha solicitada por el cliente, formateada
  horaCita: string; // 👈 NUEVO
  urgente: boolean;
}

interface AccionSugerida {
  tipo: 'urgente' | 'info' | 'exito';
  icono: 'alerta' | 'calendario' | 'mensaje' | 'check';
  titulo: string;
  mensaje: string;
  textoAccion?: string;
  accion?: () => void;
}

interface Tip {
  icono: string;
  texto: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SkeletonComponent,
    GraficaDashboardComponent,
    //HeatmapHorariosComponent,
    RouterLink,
    //ImageCarouselComponent, // 👈 AGREGAR
  ],
  templateUrl: './inicio.component.html',
})
export class InicioComponent implements OnInit, OnDestroy {
  // ============ DATOS GENERALES ============
  fechaHoy = '';

  // ============ FILTRO TEMPORAL Y STATS ============
  periodoActivo: 'hoy' | 'semana' | 'mes' | 'año' = 'mes';

  // Detalle de cita
  citaSeleccionada: Cita | null = null;

  // ============ MODAL DETALLE GA ============

  modoFocus = false;
  private analyticsService = inject(AnalyticsService);

  toggleFocus() {
    this.modoFocus = !this.modoFocus;
  }

  private destroy$ = new Subject<void>();
  private accionEjecutada = new Set<string>();
  stats: StatCard[] = [];

  gaConectado = false; // 🔧 cambia a true cuando esté integrado
  mostrarInfoGA = false;

  private agendaRaw: CitaBackend[] = [];
  private consultasRaw: CitaBackend[] = [];
  private route = inject(ActivatedRoute);
  // ============ ESTADOS DE LOADING ============
  cargandoStats = true;
  cargandoAgenda = true;
  cargandoConsultas = true;
  cargandoProyectosRecientes = true;

  private readonly placeholderImagen =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">' +
        '<rect width="400" height="250" fill="#f3f4f6"/>' +
        '<g transform="translate(168, 60)" fill="#d1d5db">' +
        '<g transform="scale(2.67)">' +
        '<path d="M21 5v6.59l-3-3.01-4 4.01-4-4-4 4-3-3.01V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2zm-3 6.42l3 3.01V19c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-6.58l3 2.99 4-4 4 4 4-3.99z"/>' +
        '</g>' +
        '</g>' +
        '<text x="200" y="195" text-anchor="middle" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="14" font-weight="500">Sin imagen</text>' +
        '</svg>',
    );

  // ============ PROYECTOS: DATOS ============
  // En la clase:
  tips: Tip[] = [
    {
      icono: '⚡',
      texto: 'Responde consultas urgentes en menos de 2 horas para mejorar la conversión a citas.',
    },
    {
      icono: '📱',
      texto: 'Confirma las citas el día anterior por WhatsApp para reducir cancelaciones.',
    },
    {
      icono: '📸',
      texto: 'Sube fotos de tus proyectos finalizados al sitio público para atraer más clientes.',
    },
    { icono: '⏰', texto: 'Mantén actualizada tu disponibilidad horaria desde Configuración.' },
    { icono: '✨', texto: 'Marca como urgentes las consultas que pidan cita para hoy o mañana.' },
    { icono: '🎯', texto: 'Usa la tecla N para crear un proyecto nuevo rápidamente.' },
    {
      icono: '📊',
      texto: 'Revisa el reporte semanal para ver tendencias de citas y servicios populares.',
    },
  ];

  tipActual = 0;
  private intervaloTips: any;

  proyectosRecientes: Proyecto[] = [];

  // ============ AGENDA: CITAS DE HOY ============
  citasHoy: Cita[] = [];
  consultasPendientes: ConsultaPendiente[] = [];
  // ============ NOTIFICACIONES ============

  // Navegación entre modales de consultas
  volverATodasDesdeConsulta = false;
  volverADetalleDesdeRespuesta = false;
  volverATodasDespuesDeRespuesta = false;

  // ============ GRÁFICAS ============
  graficaSeleccionada:
    | 'proyectos-mes'
    | 'tipos-proyectos'
    | 'actividad-citas'
    | 'clientes-nuevos'
    | null = null;

  citasPorMes: PuntoGrafica[] = [];
  categoriasServicios: PuntoGrafica[] = [];
  actividadSemanal: PuntoGrafica[] = [];
  visitasPorMes: PuntoGrafica[] = [];
  heatmapHorarios: HeatmapSerie[] = [];
  heatmapInsights: HeatmapData['insights'] | null = null;
  cargandoHeatmap = true;

  cargandoCitasPorMes = true;
  cargandoCategorias = true;
  cargandoActividad = true;
  cargandoVisitasPorMes = true;

  // ============ CONSTRUCTOR Y LIFECYCLE ============
  constructor(private router: Router) {}
  private inicioService = inject(InicioService);
  private cdr = inject(ChangeDetectorRef);
  private reportesService = inject(ReportesService);
  private authService = inject(AuthService);

  ngOnInit() {
    const hoy = new Date();
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    this.actualizarFechaHoy();
    this.programarActualizacionFecha();

    this.analyticsService.estado().subscribe((estado) => {
      this.gaConectado = estado.configurado;
      if (this.gaConectado) {
        this.cargarStats();
        this.cargarVisitasPorMes(); // 👈 AGREGAR
      }
      this.cdr.detectChanges();
    });
    this.cargarStats(); // 👈 agregar esta línea
    this.cargarAgenda();
    this.cargarConsultas();
    this.cargarProyectosRecientes(); // 👈 nuevo
    this.cargarGraficas();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.aplicarParamsDeUrl());

    this.aplicarParamsDeUrl();
    this.iniciarRotacionTips();
    this.iniciarRefreshAutomatico(); // 👈 NUEVA línea 1
    this.ultimaActualizacion = new Date();
  }

  // ============ GETTERS ============

  get totalConsultasPendientes(): number {
    return this.consultasPendientes.length;
  }

  // ============ NAVEGACIÓN GENERAL ============
  irACitas() {
    this.router.navigate(['/admin/citas']);
  }

  irAConfiguracion() {
    this.router.navigate(['/admin/configuracion']);
  }

  irAPaginas() {
    this.router.navigate(['/admin/paginas']);
  }

  // ============ FILTRO TEMPORAL ============
  cambiarPeriodo(periodo: 'hoy' | 'semana' | 'mes' | 'año') {
    this.periodoActivo = periodo;
    this.cargarStats();
  }

  private cargarStats() {
    this.cargandoStats = true;

    forkJoin({
      stats: this.inicioService.obtenerStats(this.periodoActivo),
      visitas: this.gaConectado
        ? this.analyticsService.obtenerVisitas(this.periodoActivo)
        : of({ valor: 0, cambio: 0 }),
    }).subscribe({
      next: ({ stats, visitas }) => {
        const dataMerged = { ...stats, visitas };
        this.stats = this.construirStats(dataMerged, this.periodoActivo);
        this.cargandoStats = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.stats = [];
        this.cargandoStats = false;
        this.cdr.detectChanges();
      },
    });
  }

  private construirStats(data: any, periodo: 'hoy' | 'semana' | 'mes' | 'año'): StatCard[] {
    const etiquetaCambio = {
      hoy: 'vs ayer',
      semana: 'vs semana anterior',
      mes: 'vs mes anterior',
      año: 'vs año anterior',
    }[periodo];

    const tipoDe = (cambio: number): 'positive' | 'negative' | 'neutral' => {
      if (cambio > 0) return 'positive';
      if (cambio < 0) return 'negative';
      return 'neutral';
    };

    return [
      {
        label: `Citas ${periodo}`,
        value: data.citas?.valor ?? 0,
        cambioValor: data.citas?.cambio ?? 0,
        cambioTipo: tipoDe(data.citas?.cambio ?? 0),
        cambioEtiqueta: etiquetaCambio,
        icon: 'calendar',
        color: 'orange',
      },
      {
        label: `Consultas ${periodo}`,
        value: data.consultas?.valor ?? 0,
        cambioValor: data.consultas?.cambio ?? 0,
        cambioTipo: tipoDe(data.consultas?.cambio ?? 0),
        cambioEtiqueta: etiquetaCambio,
        icon: 'chat',
        color: 'green',
      },
      {
        label: `Visitas ${periodo}`,
        value: this.gaConectado ? (data.visitas?.valor ?? 0) : 0,
        cambioValor: this.gaConectado ? (data.visitas?.cambio ?? 0) : 0,
        cambioTipo: this.gaConectado ? tipoDe(data.visitas?.cambio ?? 0) : 'neutral',
        cambioEtiqueta: this.gaConectado ? etiquetaCambio : 'Conecta Google Analytics',
        icon: 'eye',
        color: 'purple',
      },
      {
        label: 'Proyectos',
        value: data.proyectos?.valor ?? 0,
        cambioValor: 0,
        cambioTipo: 'neutral',
        cambioEtiqueta: 'en total',
        icon: 'projects',
        color: 'blue',
      },
    ];
  }

  // ============ GRÁFICAS ============
  private cargarGraficas() {
    this.cargarCitasPorMes();
    this.cargarCategoriasServicios();
    this.cargarActividadSemanal();
    this.cargarVisitasPorMes();
    this.cargarHeatmapHorarios();
  }

  private cargarHeatmapHorarios() {
    this.cargandoHeatmap = true;
    this.reportesService.obtenerHeatmapHorarios().subscribe({
      next: (data) => {
        this.heatmapHorarios = data.series;
        this.heatmapInsights = data.insights;
        this.cargandoHeatmap = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.heatmapHorarios = [];
        this.heatmapInsights = null;
        this.cargandoHeatmap = false;
        this.cdr.detectChanges();
      },
    });
  }

  private cargarCitasPorMes() {
    this.cargandoCitasPorMes = true;
    this.reportesService.obtenerCitasPorMes().subscribe({
      next: (data) => {
        this.citasPorMes = data.map((d) => ({ label: d.label, valor: d.valor }));
        this.cargandoCitasPorMes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.citasPorMes = [];
        this.cargandoCitasPorMes = false;
        this.cdr.detectChanges();
      },
    });
  }

  private cargarCategoriasServicios() {
    this.cargandoCategorias = true;
    this.reportesService.obtenerCategoriasServicios().subscribe({
      next: (data) => {
        this.categoriasServicios = data.map((d) => ({ label: d.label, valor: d.valor }));
        this.cargandoCategorias = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.categoriasServicios = [];
        this.cargandoCategorias = false;
        this.cdr.detectChanges();
      },
    });
  }

  private cargarActividadSemanal() {
    this.cargandoActividad = true;
    this.reportesService.obtenerActividadSemanal().subscribe({
      next: (data) => {
        this.actividadSemanal = data.map((d) => ({ label: d.label, valor: d.valor }));
        this.cargandoActividad = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.actividadSemanal = [];
        this.cargandoActividad = false;
        this.cdr.detectChanges();
      },
    });
  }

  private cargarVisitasPorMes() {
    if (!this.gaConectado) {
      this.visitasPorMes = [];
      this.cargandoVisitasPorMes = false;
      this.cdr.detectChanges();
      return;
    }

    this.cargandoVisitasPorMes = true;
    this.analyticsService.obtenerVisitasPorMes().subscribe({
      next: (data) => {
        this.visitasPorMes = data;
        this.cargandoVisitasPorMes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.visitasPorMes = [];
        this.cargandoVisitasPorMes = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ============ PROYECTOS: DETALLE ============
  abrirProyecto(proyecto: Proyecto) {
    this.router.navigate(['/admin/proyectos', proyecto.id]);
  }

  // ============ PROYECTOS: VER TODOS ============
  abrirTodosProyectos() {
    this.router.navigate(['/admin/proyectos']);
  }

  // ============ PROYECTOS: NUEVO Y EDITAR ============
  nuevoProyecto() {
    this.router.navigate(['/admin/proyectos', 'nuevo']);
  }

  // ============ CONSULTAS: VER TODAS ============
  abrirTodasConsultas() {
    this.router.navigate(['/admin/consultas']);
  }

  // ============ AGENDA: DETALLE DE CITA ============
  abrirCita(cita: Cita) {
    this.citaSeleccionada = cita;
  }
  cerrarCita() {
    this.citaSeleccionada = null;
  }
  confirmarCita() {
    if (this.citaSeleccionada) {
      this.citaSeleccionada.estado = 'confirmada';
      this.cerrarCita();
    }
  }

  private cargarAgenda() {
    this.cargandoAgenda = true;
    this.inicioService.obtenerAgenda().subscribe({
      next: (lista) => {
        this.agendaRaw = lista;
        this.citasHoy = lista
          .filter((c) => c.estado === 'confirmada' || c.estado === 'pendiente')
          .map((c) => this.mapearCita(c));

        this.cargandoAgenda = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.agendaRaw = [];
        this.citasHoy = [];
        this.cargandoAgenda = false;
        this.cdr.detectChanges();
      },
    });
  }

  private cargarConsultas() {
    this.cargandoConsultas = true;
    this.inicioService.obtenerConsultas().subscribe({
      next: (lista) => {
        const vigentes = lista.filter((c) => this.esFechaVigente(c.fecha));
        this.consultasRaw = vigentes;
        this.consultasPendientes = vigentes.map((c) => this.mapearConsulta(c));

        this.cargandoConsultas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.consultasRaw = [];
        this.consultasPendientes = [];
        this.cargandoConsultas = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapearCita(c: CitaBackend): Cita {
    return {
      hora: c.hora,
      cliente: c.nombre,
      tipo: c.tipo === 'consulta' ? 'Consulta' : 'Proyecto',
      estado: (c.estado === 'confirmada' ? 'confirmada' : 'pendiente') as
        | 'confirmada'
        | 'pendiente',
    };
  }

  private mapearConsulta(c: CitaBackend): ConsultaPendiente {
    return {
      id: c.id,
      nombre: c.nombre,
      correo: c.correo,
      telefono: c.telefono,
      asunto: c.servicio?.titulo || (c.tipo === 'consulta' ? 'Consulta general' : 'Proyecto'),
      mensaje: c.motivo || '(Sin mensaje)',
      fecha: this.tiempoRelativo(c.createdAt),
      fechaCita: this.formatearFechaCita(c.fecha),
      horaCita: c.hora,
      urgente: this.esCitaUrgente(c.fecha),
    };
  }

  private formatearFechaCita(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  private tiempoRelativo(iso: string): string {
    const ahora = Date.now();
    const fecha = new Date(iso).getTime();
    const diffMs = ahora - fecha;
    const minutos = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMs / 3600000);
    const dias = Math.floor(diffMs / 86400000);

    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    return new Date(iso).toLocaleDateString('es-MX');
  }

  private esCitaUrgente(fechaCita: string): boolean {
    if (!fechaCita) return false;
    const cita = new Date(fechaCita + 'T00:00:00');
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    const diffDias = (cita.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24);
    return diffDias <= 1; // hoy, mañana o ya pasada
  }

  private cargarProyectosRecientes() {
    this.cargandoProyectosRecientes = true;
    this.inicioService.obtenerProyectosRecientes().subscribe({
      next: (lista) => {
        this.proyectosRecientes = lista.map((p) => this.mapearProyecto(p));
        this.cargandoProyectosRecientes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.proyectosRecientes = [];
        this.cargandoProyectosRecientes = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapearProyecto(p: ProyectoBackend): Proyecto {
    // Si llega array, usar array; si llega solo imagen single, convertir a array
    const imagenes =
      Array.isArray(p.imagenes) && p.imagenes.length > 0 ? p.imagenes : p.imagen ? [p.imagen] : [];
    return {
      id: p.id,
      nombre: p.nombre,
      estado: this.estadoLabel(p.estado),
      fecha: this.formatearFechaCorta(p.updatedAt),
      imagen: p.imagen || '',
      imagenes, // 👈 NUEVO
      cliente: p.cliente,
      ubicacion: p.ubicacion,
      superficie: p.superficie,
      descripcion: p.descripcion,
      fechaInicio: p.fechaInicio || '', // raw YYYY-MM-DD
      fechaEntrega: p.fechaEntrega || '', // raw YYYY-MM-DD
      progreso: p.progreso,
    };
  }

  private estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      en_diseno: 'En diseño',
      en_proceso: 'En proceso',
      en_revision: 'En revisión',
      pausado: 'Pausado',
      finalizado: 'Finalizado',
    };
    return map[estado] || estado;
  }

  formatearFechaCorta(iso?: string | Date | null): string {
    if (!iso) return '—';
    const d = typeof iso === 'string' ? new Date(iso.includes('T') ? iso : iso + 'T00:00:00') : iso;
    if (isNaN(d.getTime())) return '—';
    const meses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  }

  imagenDeProyecto(p: Proyecto): string {
    return p.imagen || this.placeholderImagen;
  }

  imagenesDeProyecto(p: Proyecto): string[] {
    if (p.imagenes && p.imagenes.length > 0) return p.imagenes;
    if (p.imagen) return [p.imagen];
    return [];
  }

  private aplicarParamsDeUrl() {
    const accion = this.route.snapshot.queryParamMap.get('accion');

    // Guard: solo ejecutar la acción UNA vez
    if (accion && !this.accionEjecutada.has(accion)) {
      this.accionEjecutada.add(accion);

      if (accion === 'nuevo-proyecto') {
        // replaceUrl para que la URL del historial sea limpia y no haya loop
        this.router.navigate(['/admin/proyectos', 'nuevo'], {
          replaceUrl: true,
        });
        return;
      }
    }

    // Scroll al fragment si existe (#vision-general, etc.)
    // Scroll al fragment si existe (#vision-general, etc.)
    const fragment = this.route.snapshot.fragment;
    if (fragment && !this.accionEjecutada.has(`fragment-${fragment}`)) {
      this.accionEjecutada.add(`fragment-${fragment}`);
      setTimeout(() => {
        const el = document.getElementById(fragment);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('vortiz-highlight-flash');
          setTimeout(() => el.classList.remove('vortiz-highlight-flash'), 2000);

          // 👇 LIMPIAR el fragment de la URL para que al volver no se vuelva a hacer scroll
          this.router.navigate([], {
            relativeTo: this.route,
            fragment: undefined,
            replaceUrl: true,
          });
        }
      }, 600);
    }
  }
  /** Banner inteligente: evalúa el estado actual y sugiere acciones prioritarias */
  get accionSugerida(): AccionSugerida | null {
    // 🔴 Prioridad 1: consultas urgentes pendientes
    // 🔴 Prioridad 1: consultas urgentes pendientes
    const urgentes = this.consultasPendientes.filter((c) => c.urgente).length;
    if (urgentes > 0) {
      return {
        tipo: 'urgente',
        icono: 'alerta',
        titulo:
          urgentes === 1 ? 'Tienes 1 consulta urgente' : `Tienes ${urgentes} consultas urgentes`,
        mensaje:
          'Estos clientes solicitan cita para hoy o mañana. Revisa tu agenda para responder con disponibilidad real.',
        textoAccion: 'Ir a citas',
        accion: () => this.irACitas(), // 👈 cambio: ahora va a citas
      };
    }

    // 🟠 Prioridad 2: citas pendientes de confirmar de hoy
    const pendientesHoy = this.citasHoy.filter((c) => c.estado === 'pendiente').length;
    if (pendientesHoy > 0) {
      return {
        tipo: 'info',
        icono: 'calendario',
        titulo:
          pendientesHoy === 1
            ? 'Tienes 1 cita pendiente de confirmar'
            : `Tienes ${pendientesHoy} citas pendientes de confirmar`,
        mensaje: 'Confirma las citas de hoy para evitar empalmes y avisar a tus clientes.',
        textoAccion: 'Ir al calendario',
        accion: () => this.irACitas(),
      };
    }

    // 🟡 Prioridad 3: consultas sin urgencia pero pendientes
    if (this.consultasPendientes.length > 0) {
      return {
        tipo: 'info',
        icono: 'mensaje',
        titulo:
          this.consultasPendientes.length === 1
            ? 'Tienes 1 consulta esperando respuesta'
            : `Tienes ${this.consultasPendientes.length} consultas esperando respuesta`,
        mensaje: 'Mantener tiempos de respuesta cortos mejora la conversión de citas.',
        textoAccion: 'Responder',
        accion: () => this.abrirTodasConsultas(),
      };
    }

    // 🟢 Estado: todo al día
    if (this.citasHoy.length > 0) {
      return {
        tipo: 'exito',
        icono: 'check',
        titulo: '¡Todo al día!',
        mensaje: `Tienes ${this.citasHoy.length} ${this.citasHoy.length === 1 ? 'cita confirmada' : 'citas confirmadas'} para hoy. Buen trabajo.`,
      };
    }

    // 🟢 Estado: día tranquilo
    return {
      tipo: 'exito',
      icono: 'check',
      titulo: 'Día tranquilo',
      mensaje:
        'No tienes citas ni consultas pendientes. Buen momento para revisar proyectos o publicar nuevos.',
      textoAccion: 'Ver proyectos',
      accion: () => this.abrirTodosProyectos(),
    };
  }

  ejecutarAccionSugerida() {
    this.accionSugerida?.accion?.();
  }

  /** Devuelve la posición temporal de una cita respecto a la hora actual */
  estadoTemporalCita(cita: Cita): 'ahora' | 'proxima' | 'pasada' | 'futura' {
    if (!cita.hora) return 'futura';

    // Parsear hora "HH:MM"
    const [horas, minutos] = cita.hora.split(':').map(Number);
    if (isNaN(horas) || isNaN(minutos)) return 'futura';

    const ahora = new Date();
    const inicio = new Date();
    inicio.setHours(horas, minutos, 0, 0);
    const fin = new Date(inicio);
    fin.setHours(fin.getHours() + 1); // asume 1h por cita

    const diffMin = (inicio.getTime() - ahora.getTime()) / 60000;

    if (ahora >= inicio && ahora <= fin) return 'ahora';
    if (diffMin > 0 && diffMin <= 30) return 'proxima';
    if (diffMin < 0) return 'pasada';
    return 'futura';
  }

  /** Texto auxiliar bajo la hora ("en 15 min", "hace 1h", etc) */
  textoTemporalCita(cita: Cita): string {
    if (!cita.hora) return '';
    const [horas, minutos] = cita.hora.split(':').map(Number);
    if (isNaN(horas)) return '';

    const ahora = new Date();
    const inicio = new Date();
    inicio.setHours(horas, minutos, 0, 0);

    const diffMin = Math.round((inicio.getTime() - ahora.getTime()) / 60000);

    if (Math.abs(diffMin) < 1) return 'ahora';
    if (diffMin > 0 && diffMin <= 60) return `en ${diffMin} min`;
    if (diffMin > 60 && diffMin < 1440) {
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return m === 0 ? `en ${h}h` : `en ${h}h ${m}m`;
    }
    if (diffMin < 0 && diffMin > -60) return `hace ${Math.abs(diffMin)} min`;
    if (diffMin < -60) return `hace ${Math.floor(Math.abs(diffMin) / 60)}h`;
    return '';
  }

  abrirInfoGA() {
    this.mostrarInfoGA = true;
  }

  cerrarInfoGA() {
    this.mostrarInfoGA = false;
  }

  @HostListener('document:keydown', ['$event'])
  manejarAtajos(event: KeyboardEvent) {
    // No activar si está escribiendo en input/textarea
    const target = event.target as HTMLElement;
    const editando =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable;

    // Esc: cerrar el modal activo (funciona incluso si está escribiendo)
    if (event.key === 'Escape') {
      this.cerrarModalActivo();
      return;
    }

    // Si está editando, no activamos atajos sin modificador
    if (editando) return;

    // Si hay un modal abierto, no activamos atajos
    if (this.hayModalAbierto()) return;

    const key = event.key.toLowerCase();

    if (key === 'r') {
      event.preventDefault();
      this.refrescarManual();
      return;
    }

    // N: nuevo proyecto (sin modificador, estilo Linear/Notion)
    if (key === 'n') {
      event.preventDefault();
      this.nuevoProyecto();
      return;
    }
  }

  private hayModalAbierto(): boolean {
    return !!(this.citaSeleccionada || this.mostrarInfoGA);
  }

  private cerrarModalActivo() {
    if (this.mostrarInfoGA) {
      this.cerrarInfoGA();
    } else if (this.citaSeleccionada) {
      this.cerrarCita();
    }
  }

  get etiquetaPeriodo(): string {
    const map: Record<typeof this.periodoActivo, string> = {
      hoy: 'Hoy',
      semana: 'Esta semana',
      mes: 'Este mes',
      año: 'Este año',
    };
    return map[this.periodoActivo];
  }
  get saludo(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get nombreCorto(): string {
    const u = this.authService.getUser();
    return u?.nombre?.split(' ')[0] || 'Bienvenido';
  }

  get resumenDelDia(): string {
    const citasConfirmadas = this.citasHoy.filter((c) => c.estado === 'confirmada').length;
    const pendientes = this.citasHoy.filter((c) => c.estado === 'pendiente').length;
    const consultas = this.consultasPendientes.length;

    const partes: string[] = [];
    if (citasConfirmadas > 0) {
      partes.push(
        `${citasConfirmadas} ${citasConfirmadas === 1 ? 'cita confirmada' : 'citas confirmadas'}`,
      );
    }
    if (pendientes > 0) {
      partes.push(`${pendientes} por confirmar`);
    }
    if (consultas > 0) {
      partes.push(`${consultas} ${consultas === 1 ? 'consulta' : 'consultas'} pendientes`);
    }

    if (partes.length === 0) return 'No tienes pendientes hoy. ¡Día tranquilo!';

    // Unir con comas y "y" antes del último
    if (partes.length === 1) return `Hoy tienes ${partes[0]}.`;
    if (partes.length === 2) return `Hoy tienes ${partes[0]} y ${partes[1]}.`;
    return `Hoy tienes ${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}.`;
  }

  get diaActual(): number {
    return new Date().getDate();
  }

  get mesActualCorto(): string {
    const meses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return meses[new Date().getMonth()];
  }

  get diaSemanaCorto(): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[new Date().getDay()];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.intervaloTips) clearInterval(this.intervaloTips);
    if (this.intervalRefresh) clearInterval(this.intervalRefresh);
    if (this.intervalTexto) clearInterval(this.intervalTexto);
    if (this.timeoutFecha) clearTimeout(this.timeoutFecha);
  }
  get tip(): Tip {
    return this.tips[this.tipActual];
  }

  iniciarRotacionTips() {
    // Empezar con tip aleatorio
    this.tipActual = Math.floor(Math.random() * this.tips.length);
    this.intervaloTips = setInterval(() => {
      this.tipActual = (this.tipActual + 1) % this.tips.length;
      this.cdr.detectChanges();
    }, 10000); // rota cada 10s
  }

  siguienteTip() {
    this.tipActual = (this.tipActual + 1) % this.tips.length;
    // Reiniciar timer para que dé 10s desde el clic
    if (this.intervaloTips) clearInterval(this.intervaloTips);
    this.intervaloTips = setInterval(() => {
      this.tipActual = (this.tipActual + 1) % this.tips.length;
      this.cdr.detectChanges();
    }, 10000);
  }

  private intervalRefresh: any;
  private intervalTexto: any;
  ultimaActualizacion: Date | null = null;
  ultimaActualizacionTexto = 'Cargando...';

  private iniciarRefreshAutomatico() {
    // Refrescar cada 30s si la pestaña está visible
    this.intervalRefresh = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.refrescarDatos();
      }
    }, 30000); // 30 segundos

    // Actualizar el texto "Hace Xs" cada 5s
    this.intervalTexto = setInterval(() => {
      this.actualizarTextoActualizacion();
    }, 5000);
  }

  private refrescarDatos() {
    this.ultimaActualizacion = new Date(); // 👈 mover ARRIBA
    this.actualizarTextoActualizacion();
    this.cargarAgenda();
    this.cargarConsultas();
    this.cargarStats();
  }

  private actualizarTextoActualizacion() {
    if (!this.ultimaActualizacion) {
      this.ultimaActualizacionTexto = 'Cargando...';
      return;
    }
    const diffSeg = Math.floor((Date.now() - this.ultimaActualizacion.getTime()) / 1000);
    if (diffSeg < 10) this.ultimaActualizacionTexto = 'En vivo';
    else if (diffSeg < 60) this.ultimaActualizacionTexto = `Hace ${diffSeg}s`;
    else this.ultimaActualizacionTexto = `Hace ${Math.floor(diffSeg / 60)}m`;
    this.cdr.detectChanges();
  }

  refrescando = false;

  refrescarManual() {
    if (this.refrescando) return;
    this.refrescando = true;
    this.refrescarDatos();
    setTimeout(() => {
      this.refrescando = false;
      this.cdr.detectChanges();
    }, 800);
  }
  private timeoutFecha: any;

  private actualizarFechaHoy() {
    const hoy = new Date();
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    this.fechaHoy = `${dias[hoy.getDay()]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  }

  private programarActualizacionFecha() {
    const ahora = new Date();
    const proximaMedianoche = new Date(ahora);
    proximaMedianoche.setDate(proximaMedianoche.getDate() + 1);
    proximaMedianoche.setHours(0, 0, 0, 0);
    const msHastaMedianoche = proximaMedianoche.getTime() - ahora.getTime() + 1000; // +1s margen

    this.timeoutFecha = setTimeout(() => {
      this.actualizarFechaHoy();
      this.cdr.detectChanges();
      this.programarActualizacionFecha(); // re-programar para la siguiente medianoche
    }, msHastaMedianoche);
  }
  /** Devuelve true si la fecha es hoy o futura */
  private esFechaVigente(fechaCita: string): boolean {
    if (!fechaCita) return false;
    const cita = new Date(fechaCita + 'T00:00:00');
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    return cita.getTime() >= ahora.getTime();
  }
}
