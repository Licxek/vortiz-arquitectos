import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InicioService, CitaBackend, ProyectoBackend } from '../../../core/services/inicio.service'; // ⚠️ ajusta la ruta
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import {
  ReportesService,
  CitasPorMes,
  CategoriaServicio,
  ActividadDia,
  ClienteNuevo,
  HeatmapData,
  HeatmapSerie,
  FunnelData,
} from '../../../core/services/reportes.service';
import {
  GraficaDashboardComponent,
  PuntoGrafica,
} from '../../../shared/grafica-dashboard/grafica-dashboard.component';
import { HeatmapHorariosComponent } from '../../../shared/heatmap-horarios/heatmap-horarios.component';
import { FunnelConversionComponent } from '../../../shared/funnel-conversion/funnel-conversion.component';

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

interface Notificacion {
  id: number;
  tipo: 'cita' | 'consulta' | 'confirmacion' | 'cancelacion' | 'mensaje';
  titulo: string;
  descripcion: string;
  tiempo: string;
  leida: boolean;
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

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ImageUploadComponent,
    SkeletonComponent,
    GraficaDashboardComponent,
    HeatmapHorariosComponent,
    FunnelConversionComponent,
  ],
  templateUrl: './inicio.component.html',
})
export class InicioComponent implements OnInit {
  // ============ DATOS GENERALES ============
  fechaHoy = '';

  // ============ FILTRO TEMPORAL Y STATS ============
  periodoActivo: 'hoy' | 'semana' | 'mes' | 'año' = 'mes';

  // Detalle de notificación
  notificacionSeleccionada: Notificacion | null = null;

  // Detalle de cita
  citaSeleccionada: Cita | null = null;

  stats: StatCard[] = [];

  // ============ ESTADOS DE LOADING ============
  cargandoStats = true;
  cargandoAgenda = true;
  cargandoConsultas = true;
  cargandoProyectosRecientes = true;
  cargandoTodosProyectos = false; // arranca false; se activa al abrir el modal

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
  estadosProyecto = ['En diseño', 'En proceso', 'En revisión', 'Pausado', 'Finalizado'];
  categoriasProyecto = [
    'corporativo',
    'industrial',
    'comercial',
    'residencial',
    'infraestructura',
    'institucional',
  ];

  proyectosRecientes: Proyecto[] = [];
  todosLosProyectos: Proyecto[] = [];

  proyectosPublicos: any[] = [];

  // ============ PROYECTOS: FILTROS Y ESTADOS ============
  busquedaProyectos = '';
  filtroEstadoProyectos:
    | 'todos'
    | 'En diseño'
    | 'En proceso'
    | 'En revisión'
    | 'Pausado'
    | 'Finalizado' = 'todos';

  proyectoSeleccionado: Proyecto | null = null;
  mostrarTodosProyectos = false;
  mostrarEditarProyecto = false;
  proyectoEditando: Proyecto | null = null;
  estadoOriginal = '';
  esNuevoProyecto = false;
  mostrarConfirmarFinalizado = false;
  mostrarAgregarPublico = false;

  formPublico = {
    titulo: '',
    descripcion: '',
    imagenUrl: '',
    categoria: 'Residencial',
  };

  // Navegación entre modales de proyectos
  volverATodos = false;
  volverATodosDesdeEditar = false;
  volverADetalleDesdeEditar = false;
  volverATodosDespuesDeDetalle = false;
  proyectoDetalleAnterior: Proyecto | null = null;

  // ============ AGENDA: CITAS DE HOY ============
  citasHoy: Cita[] = [];
  consultasPendientes: ConsultaPendiente[] = [];
  // ============ NOTIFICACIONES ============
  notificaciones: Notificacion[] = [
    {
      id: 1,
      tipo: 'cita',
      titulo: 'Nueva cita agendada',
      descripcion: 'Juan Alfonso reservó una consulta para mañana',
      tiempo: 'Hace 15 min',
      leida: false,
    },
    {
      id: 2,
      tipo: 'consulta',
      titulo: 'Nueva consulta recibida',
      descripcion: 'María González preguntó sobre remodelación',
      tiempo: 'Hace 1 hora',
      leida: false,
    },
    {
      id: 3,
      tipo: 'confirmacion',
      titulo: 'Cita confirmada',
      descripcion: 'Carlos Méndez confirmó su cita del jueves',
      tiempo: 'Hace 2 horas',
      leida: false,
    },
    {
      id: 4,
      tipo: 'mensaje',
      titulo: 'Comentario en proyecto',
      descripcion: 'Ana Martínez dejó comentarios en el proyecto Villa Costanera',
      tiempo: 'Hace 4 horas',
      leida: true,
    },
    {
      id: 5,
      tipo: 'cancelacion',
      titulo: 'Cita cancelada',
      descripcion: 'Roberto Silva canceló su cita del viernes',
      tiempo: 'Ayer',
      leida: true,
    },
  ];

  // ============ CONSULTAS: DATOS Y ESTADOS ============

  consultaSeleccionada: ConsultaPendiente | null = null;
  mostrarRespuesta = false;
  mostrarTodasConsultas = false;
  respuestaTexto = '';

  // Navegación entre modales de consultas
  volverATodasDesdeConsulta = false;
  volverATodasDesdeRespuesta = false;
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
  clientesNuevos: PuntoGrafica[] = [];
  heatmapHorarios: HeatmapSerie[] = [];
  heatmapInsights: HeatmapData['insights'] | null = null;
  cargandoHeatmap = true;
  funnelData: FunnelData | null = null;
  cargandoFunnel = true;

  cargandoCitasPorMes = true;
  cargandoCategorias = true;
  cargandoActividad = true;
  cargandoClientes = true;

  // ============ CONSTRUCTOR Y LIFECYCLE ============
  constructor(private router: Router) {}
  private inicioService = inject(InicioService);
  private cdr = inject(ChangeDetectorRef);
  private reportesService = inject(ReportesService);

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
    this.fechaHoy = `${dias[hoy.getDay()]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;

    this.cargarStats(); // 👈 agregar esta línea
    this.cargarAgenda();
    this.cargarConsultas();
    this.cargarProyectosRecientes(); // 👈 nuevo
    this.cargarGraficas();
  }

  // ============ GETTERS ============

  get notificacionesNoLeidas(): number {
    return this.notificaciones.filter((n) => !n.leida).length;
  }

  get totalConsultasPendientes(): number {
    return this.consultasPendientes.length;
  }

  get proyectosFiltrados() {
    let resultado = this.todosLosProyectos;
    if (this.filtroEstadoProyectos !== 'todos') {
      resultado = resultado.filter((p) => p.estado === this.filtroEstadoProyectos);
    }
    if (this.busquedaProyectos.trim()) {
      const q = this.busquedaProyectos.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.cliente?.toLowerCase().includes(q) ||
          p.ubicacion?.toLowerCase().includes(q),
      );
    }
    return resultado;
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
    this.inicioService.obtenerStats(this.periodoActivo).subscribe({
      next: (data) => {
        this.stats = this.construirStats(data, this.periodoActivo);
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
        value: data.visitas?.valor ?? 0,
        cambioValor: 0,
        cambioTipo: 'neutral',
        cambioEtiqueta: 'próximamente',
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

  // ============ NOTIFICACIONES ============
  marcarTodasLeidas() {
    this.notificaciones.forEach((n) => (n.leida = true));
  }

  // ============ GRÁFICAS ============
  private cargarGraficas() {
    this.cargarCitasPorMes();
    this.cargarCategoriasServicios();
    this.cargarActividadSemanal();
    this.cargarClientesNuevos();
    this.cargarHeatmapHorarios();
    this.cargarFunnelConversion();
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

  private cargarClientesNuevos() {
    this.cargandoClientes = true;
    this.reportesService.obtenerClientesNuevos().subscribe({
      next: (data) => {
        this.clientesNuevos = data.map((d) => ({ label: d.label, valor: d.valor }));
        this.cargandoClientes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.clientesNuevos = [];
        this.cargandoClientes = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ============ PROYECTOS: DETALLE ============
  abrirProyecto(proyecto: Proyecto) {
    this.proyectoSeleccionado = proyecto;
  }

  abrirProyectoDesdeTodos(proyecto: Proyecto) {
    this.proyectoSeleccionado = proyecto;
    this.mostrarTodosProyectos = false;
    this.volverATodos = true;
  }

  cerrarProyecto() {
    this.proyectoSeleccionado = null;
    if (this.volverATodos) {
      this.mostrarTodosProyectos = true;
      this.volverATodos = false;
    }
  }

  // ============ PROYECTOS: VER TODOS ============
  abrirTodosProyectos() {
    this.mostrarTodosProyectos = true;
    this.cargarTodosProyectos(); // 👈 nuevo
  }

  cerrarTodosProyectos() {
    this.mostrarTodosProyectos = false;
  }

  // ============ PROYECTOS: NUEVO Y EDITAR ============
  nuevoProyecto() {
    this.proyectoEditando = {
      id: 0, // se asigna al crear
      nombre: '',
      estado: 'En diseño',
      fecha: '',
      imagen: '',
      cliente: '',
      ubicacion: '',
      superficie: '',
      descripcion: '',
      fechaEntrega: '',
      progreso: 0,
    };
    this.estadoOriginal = '';
    this.esNuevoProyecto = true;
    this.mostrarEditarProyecto = true;
  }

  abrirNuevoDesdeTodos() {
    this.mostrarTodosProyectos = false;
    this.volverATodosDesdeEditar = true;
    this.nuevoProyecto();
  }

  abrirEditarProyecto(proyecto: Proyecto) {
    this.proyectoDetalleAnterior = { ...proyecto };
    this.proyectoEditando = { ...proyecto };
    this.estadoOriginal = proyecto.estado;
    this.esNuevoProyecto = false;
    this.mostrarEditarProyecto = true;
    this.volverADetalleDesdeEditar = true;
    this.volverATodosDespuesDeDetalle = this.volverATodos;
    this.volverATodos = false;
    this.proyectoSeleccionado = null;
  }

  abrirEditarProyectoDesdeTodos(proyecto: Proyecto) {
    this.proyectoEditando = { ...proyecto };
    this.estadoOriginal = proyecto.estado;
    this.esNuevoProyecto = false;
    this.mostrarEditarProyecto = true;
    this.mostrarTodosProyectos = false;
    this.volverATodosDesdeEditar = true;
  }

  cerrarEditarProyecto() {
    this.mostrarEditarProyecto = false;
    this.proyectoEditando = null;
    this.esNuevoProyecto = false;

    if (this.volverATodosDesdeEditar) {
      this.mostrarTodosProyectos = true;
      this.volverATodosDesdeEditar = false;
      this.proyectoDetalleAnterior = null;
      this.volverATodosDespuesDeDetalle = false;
    } else if (this.volverADetalleDesdeEditar && this.proyectoDetalleAnterior) {
      this.proyectoSeleccionado = this.proyectoDetalleAnterior;
      this.volverADetalleDesdeEditar = false;
      this.proyectoDetalleAnterior = null;
      this.volverATodos = this.volverATodosDespuesDeDetalle;
      this.volverATodosDespuesDeDetalle = false;
    }
  }

  guardarEdicion() {
    if (!this.proyectoEditando) return;
    const payload = this.armarPayloadBackend(this.proyectoEditando);

    if (this.esNuevoProyecto) {
      this.inicioService.crearProyecto(payload).subscribe({
        next: (creado) => {
          const mapeado = this.mapearProyecto(creado);
          this.todosLosProyectos.unshift(mapeado);
          this.proyectosRecientes.unshift(mapeado);
          if (this.proyectosRecientes.length > 4) this.proyectosRecientes.pop();
          this.cerrarEditarProyecto();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al crear proyecto', err);
          this.cdr.detectChanges();
        },
      });
    } else {
      this.inicioService.actualizarProyecto(this.proyectoEditando.id, payload).subscribe({
        next: (actualizado) => {
          const mapeado = this.mapearProyecto(actualizado);
          this.actualizarEnArreglos(mapeado);

          if (this.volverADetalleDesdeEditar) {
            this.proyectoDetalleAnterior = mapeado;
          }

          // Si pasó a Finalizado, abrir modal de confirmación para publicar
          if (mapeado.estado === 'Finalizado' && this.estadoOriginal !== 'Finalizado') {
            this.proyectoEditando = mapeado;
            this.mostrarConfirmarFinalizado = true;
            this.volverATodosDesdeEditar = false;
            this.volverADetalleDesdeEditar = false;
            this.proyectoDetalleAnterior = null;
          } else {
            this.cerrarEditarProyecto();
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al actualizar proyecto', err);
          this.cdr.detectChanges();
        },
      });
    }
  }

  // ============ PROYECTOS: FINALIZAR Y PUBLICAR ============
  terminarProyecto(proyecto: Proyecto) {
    this.inicioService
      .actualizarProyecto(proyecto.id, { estado: 'finalizado', progreso: 100 })
      .subscribe({
        next: (actualizado) => {
          const mapeado = this.mapearProyecto(actualizado);
          this.actualizarEnArreglos(mapeado);

          this.proyectoEditando = mapeado;
          this.estadoOriginal = 'En proceso';
          this.mostrarConfirmarFinalizado = true;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al finalizar proyecto', err);
          this.cdr.detectChanges();
        },
      });
  }

  confirmarFinalizado(agregarAPublico: boolean) {
    this.mostrarConfirmarFinalizado = false;

    if (agregarAPublico && this.proyectoEditando) {
      this.formPublico = {
        titulo: this.proyectoEditando.nombre,
        descripcion: this.proyectoEditando.descripcion || '',
        imagenUrl: '', // 👈 vacío para que ponga el logo público (no la foto interna)
        categoria: 'residencial',
      };
      this.mostrarAgregarPublico = true;
    } else {
      this.cerrarEditarProyecto();
    }
  }

  guardarProyectoPublico() {
    if (!this.formPublico.titulo.trim() || !this.proyectoEditando) return;

    const payload: Partial<ProyectoBackend> = {
      nombre: this.formPublico.titulo.trim(),
      descripcion: this.formPublico.descripcion.trim(),
      logoUrl: this.formPublico.imagenUrl.trim(), // 👈 el icono para el catálogo público
      categoria: this.formPublico.categoria,
      publicado: true,
    };

    this.inicioService.actualizarProyecto(this.proyectoEditando.id, payload).subscribe({
      next: (actualizado) => {
        const mapeado = this.mapearProyecto(actualizado);
        this.actualizarEnArreglos(mapeado);
        this.cerrarAgregarPublico();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al publicar proyecto', err);
        this.cdr.detectChanges();
      },
    });
  }

  cerrarAgregarPublico() {
    this.mostrarAgregarPublico = false;
    this.cerrarEditarProyecto();
  }

  // ============ CONSULTAS: DETALLE ============
  abrirConsulta(consulta: ConsultaPendiente) {
    this.consultaSeleccionada = consulta;
  }

  abrirConsultaDesdeTodas(consulta: ConsultaPendiente) {
    this.consultaSeleccionada = consulta;
    this.mostrarTodasConsultas = false;
    this.volverATodasDesdeConsulta = true;
  }

  cerrarConsulta() {
    this.consultaSeleccionada = null;
    if (this.volverATodasDesdeConsulta) {
      this.mostrarTodasConsultas = true;
      this.volverATodasDesdeConsulta = false;
    }
  }

  // ============ CONSULTAS: VER TODAS ============
  abrirTodasConsultas() {
    this.mostrarTodasConsultas = true;
  }

  cerrarTodasConsultas() {
    this.mostrarTodasConsultas = false;
  }

  // ============ CONSULTAS: RESPONDER ============
  responderConsulta(consulta: ConsultaPendiente) {
    this.consultaSeleccionada = consulta;
    this.mostrarRespuesta = true;
    this.respuestaTexto = '';

    // Limpiar todos los flags porque viene del dashboard (sin contexto previo)
    this.volverADetalleDesdeRespuesta = false;
    this.volverATodasDesdeRespuesta = false;
    this.volverATodasDespuesDeRespuesta = false;
    this.volverATodasDesdeConsulta = false;
  }

  responderDesdeDetalle() {
    if (!this.consultaSeleccionada) return;
    this.mostrarRespuesta = true;
    this.respuestaTexto = '';
    this.volverADetalleDesdeRespuesta = true;
    this.volverATodasDespuesDeRespuesta = this.volverATodasDesdeConsulta;
    this.volverATodasDesdeConsulta = false;
  }

  responderConsultaDesdeTodas(consulta: ConsultaPendiente) {
    this.consultaSeleccionada = consulta;
    this.mostrarRespuesta = true;
    this.respuestaTexto = '';
    this.mostrarTodasConsultas = false;
    this.volverATodasDesdeRespuesta = true;
  }

  enviarRespuesta() {
    if (!this.respuestaTexto.trim()) return;

    this.consultasPendientes = this.consultasPendientes.filter(
      (c) => c.id !== this.consultaSeleccionada?.id,
    );

    const reabrirTodas = this.volverATodasDesdeRespuesta || this.volverATodasDespuesDeRespuesta;

    this.mostrarRespuesta = false;
    this.consultaSeleccionada = null;
    this.respuestaTexto = '';
    this.volverADetalleDesdeRespuesta = false;
    this.volverATodasDesdeRespuesta = false;
    this.volverATodasDesdeConsulta = false;
    this.volverATodasDespuesDeRespuesta = false;

    if (reabrirTodas) {
      this.mostrarTodasConsultas = true;
    }
  }

  cerrarRespuesta() {
    this.mostrarRespuesta = false;
    this.respuestaTexto = '';

    if (this.volverATodasDesdeRespuesta) {
      this.consultaSeleccionada = null;
      this.mostrarTodasConsultas = true;
      this.volverATodasDesdeRespuesta = false;
    } else if (this.volverADetalleDesdeRespuesta) {
      this.volverADetalleDesdeRespuesta = false;
      this.volverATodasDesdeConsulta = this.volverATodasDespuesDeRespuesta;
      this.volverATodasDespuesDeRespuesta = false;
    } else {
      this.consultaSeleccionada = null;
    }
  }

  // ============ NOTIFICACIÓN: DETALLE ============
  abrirNotificacion(notif: Notificacion) {
    notif.leida = true;
    this.notificacionSeleccionada = notif;
  }
  cerrarNotificacion() {
    this.notificacionSeleccionada = null;
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

  // Helpers para clasificar tipos de notificación
  esTipoCita(tipo: string): boolean {
    return ['cita', 'confirmacion', 'cancelacion'].includes(tipo);
  }

  esTipoConsulta(tipo: string): boolean {
    return ['consulta', 'mensaje'].includes(tipo);
  }

  tipoNotifLabel(tipo: string): string {
    const map: Record<string, string> = {
      cita: 'Cita agendada',
      confirmacion: 'Cita confirmada',
      cancelacion: 'Cita cancelada',
      consulta: 'Nueva consulta',
      mensaje: 'Nuevo mensaje',
    };
    return map[tipo] || tipo;
  }

  // Navegación desde el modal
  irACitasDesdeNotif() {
    this.notificacionSeleccionada = null;
    this.irACitas();
  }

  verConsultasDesdeNotif() {
    this.notificacionSeleccionada = null;
    this.abrirTodasConsultas();
  }

  private cargarAgenda() {
    this.cargandoAgenda = true;
    this.inicioService.obtenerAgenda().subscribe({
      next: (lista) => {
        this.citasHoy = lista
          .filter((c) => c.estado === 'confirmada' || c.estado === 'pendiente')
          .map((c) => this.mapearCita(c));
        this.cargandoAgenda = false;
        this.cdr.detectChanges();
      },
      error: () => {
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
        this.consultasPendientes = lista.map((c) => this.mapearConsulta(c));
        this.cargandoConsultas = false;
        this.cdr.detectChanges();
      },
      error: () => {
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

  private cargarTodosProyectos() {
    this.cargandoTodosProyectos = true;
    this.inicioService.obtenerProyectosAdmin().subscribe({
      next: (lista) => {
        this.todosLosProyectos = lista.map((p) => this.mapearProyecto(p));
        this.cargandoTodosProyectos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.todosLosProyectos = [];
        this.cargandoTodosProyectos = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapearProyecto(p: ProyectoBackend): Proyecto {
    return {
      id: p.id,
      nombre: p.nombre,
      estado: this.estadoLabel(p.estado),
      fecha: this.formatearFechaCorta(p.updatedAt),
      imagen: p.imagen || '',
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

  etiquetaCategoria(cat: string): string {
    const map: Record<string, string> = {
      corporativo: 'Corporativo',
      industrial: 'Industrial',
      comercial: 'Comercial',
      residencial: 'Residencial',
      infraestructura: 'Infraestructura',
      institucional: 'Institucional',
    };
    return map[cat] || cat;
  }

  private estadoBackend(label: string): string {
    const map: Record<string, string> = {
      'En diseño': 'en_diseno',
      'En proceso': 'en_proceso',
      'En revisión': 'en_revision',
      Pausado: 'pausado',
      Finalizado: 'finalizado',
    };
    return map[label] || 'en_diseno';
  }

  private armarPayloadBackend(p: Proyecto): Partial<ProyectoBackend> {
    return {
      nombre: (p.nombre || '').trim(),
      estado: this.estadoBackend(p.estado),
      cliente: (p.cliente || '').trim(),
      ubicacion: (p.ubicacion || '').trim(),
      superficie: (p.superficie || '').trim(),
      descripcion: (p.descripcion || '').trim(),
      progreso: Number(p.progreso) || 0,
      fechaInicio: (p as any).fechaInicio || null,
      fechaEntrega: (p as any).fechaEntrega || null,
      imagen: (p.imagen || '').trim(),
    };
  }

  private actualizarEnArreglos(mapeado: Proyecto) {
    const idx1 = this.todosLosProyectos.findIndex((p) => p.id === mapeado.id);
    if (idx1 >= 0) this.todosLosProyectos[idx1] = mapeado;

    const idx2 = this.proyectosRecientes.findIndex((p) => p.id === mapeado.id);
    if (idx2 >= 0) this.proyectosRecientes[idx2] = mapeado;
  }

  imagenDeProyecto(p: Proyecto): string {
    return p.imagen || this.placeholderImagen;
  }
  private cargarFunnelConversion() {
    this.cargandoFunnel = true;
    this.reportesService.obtenerFunnelConversion().subscribe({
      next: (data) => {
        this.funnelData = data;
        this.cargandoFunnel = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.funnelData = null;
        this.cargandoFunnel = false;
        this.cdr.detectChanges();
      },
    });
  }
}
