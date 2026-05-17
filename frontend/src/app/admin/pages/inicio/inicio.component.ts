import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  statsPorPeriodo: Record<'hoy' | 'semana' | 'mes' | 'año', StatCard[]> = {
    hoy: [
      { label: 'Citas hoy', value: 5, cambioValor: 2, cambioTipo: 'neutral', cambioEtiqueta: 'pendientes', icon: 'calendar', color: 'orange' },
      { label: 'Consultas hoy', value: 3, cambioValor: 50, cambioTipo: 'positive', cambioEtiqueta: 'vs ayer', icon: 'chat', color: 'green' },
      { label: 'Visitas hoy', value: 142, cambioValor: 12, cambioTipo: 'positive', cambioEtiqueta: 'vs ayer', icon: 'eye', color: 'purple' },
      { label: 'Proyectos activos', value: 10, cambioValor: 0, cambioTipo: 'neutral', cambioEtiqueta: 'en curso', icon: 'projects', color: 'blue' },
    ],
    semana: [
      { label: 'Citas semana', value: 28, cambioValor: 12, cambioTipo: 'positive', cambioEtiqueta: 'vs semana anterior', icon: 'calendar', color: 'orange' },
      { label: 'Consultas semana', value: 12, cambioValor: 18, cambioTipo: 'positive', cambioEtiqueta: 'vs semana anterior', icon: 'chat', color: 'green' },
      { label: 'Visitas semana', value: 432, cambioValor: 8, cambioTipo: 'positive', cambioEtiqueta: 'vs semana anterior', icon: 'eye', color: 'purple' },
      { label: 'Proyectos activos', value: 10, cambioValor: 25, cambioTipo: 'positive', cambioEtiqueta: 'vs semana anterior', icon: 'projects', color: 'blue' },
    ],
    mes: [
      { label: 'Citas mes', value: 87, cambioValor: 15, cambioTipo: 'positive', cambioEtiqueta: 'vs mes anterior', icon: 'calendar', color: 'orange' },
      { label: 'Consultas mes', value: 28, cambioValor: 18, cambioTipo: 'positive', cambioEtiqueta: 'vs mes anterior', icon: 'chat', color: 'green' },
      { label: 'Visitas mes', value: 1245, cambioValor: -8, cambioTipo: 'negative', cambioEtiqueta: 'vs mes anterior', icon: 'eye', color: 'purple' },
      { label: 'Proyectos activos', value: 10, cambioValor: 25, cambioTipo: 'positive', cambioEtiqueta: 'vs mes anterior', icon: 'projects', color: 'blue' },
    ],
    año: [
      { label: 'Citas año', value: 542, cambioValor: 28, cambioTipo: 'positive', cambioEtiqueta: 'vs año anterior', icon: 'calendar', color: 'orange' },
      { label: 'Consultas año', value: 187, cambioValor: 42, cambioTipo: 'positive', cambioEtiqueta: 'vs año anterior', icon: 'chat', color: 'green' },
      { label: 'Visitas año', value: 18400, cambioValor: 15, cambioTipo: 'positive', cambioEtiqueta: 'vs año anterior', icon: 'eye', color: 'purple' },
      { label: 'Proyectos del año', value: 42, cambioValor: 35, cambioTipo: 'positive', cambioEtiqueta: 'vs año anterior', icon: 'projects', color: 'blue' },
    ]
  };

  // ============ PROYECTOS: DATOS ============
  estadosProyecto = ['En diseño', 'En proceso', 'En revisión', 'Pausado', 'Finalizado'];
  categoriasProyecto = ['Residencial', 'Comercial', 'Industrial', 'Remodelación'];

  proyectosRecientes: Proyecto[] = [
    { id: 1, nombre: 'Residencia Las Flores', estado: 'En proceso', fecha: '15 May 2026', imagen: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400', cliente: 'Juan Alfonso Méndez', ubicacion: 'La Forestal, Durango', superficie: '320 m²', descripcion: 'Residencia moderna de dos niveles con acabados premium, jardín interior y alberca.', fechaInicio: '01 Mar 2026', fechaEntrega: '15 Oct 2026', progreso: 45 },
    { id: 2, nombre: 'Edificio Corporativo Centro', estado: 'En diseño', fecha: '20 May 2026', imagen: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400', cliente: 'Inmobiliaria del Norte', ubicacion: 'Centro Histórico, Durango', superficie: '1,500 m²', descripcion: 'Edificio de oficinas de 5 niveles con áreas comunes y estacionamiento subterráneo.', fechaInicio: '15 May 2026', fechaEntrega: '20 Dic 2026', progreso: 15 },
    { id: 3, nombre: 'Villa Costanera', estado: 'En proceso', fecha: '25 May 2026', imagen: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400', cliente: 'Familia Rodríguez', ubicacion: 'Mazatlán, Sinaloa', superficie: '480 m²', descripcion: 'Casa de playa con vista al mar, terrazas amplias y diseño contemporáneo.', fechaInicio: '10 Feb 2026', fechaEntrega: '30 Sep 2026', progreso: 60 },
    { id: 4, nombre: 'Centro Comercial Plaza', estado: 'En revisión', fecha: '01 Jun 2026', imagen: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400', cliente: 'Grupo Constructor RJV', ubicacion: 'Av. 20 de Noviembre, Durango', superficie: '4,200 m²', descripcion: 'Centro comercial de dos niveles con 32 locales, food court y cines.', fechaInicio: '20 Abr 2026', fechaEntrega: '15 Feb 2027', progreso: 5 },
  ];

  todosLosProyectos: Proyecto[] = [
    ...this.proyectosRecientes,
    { id: 5, nombre: 'Casa Loma del Parque', estado: 'Finalizado', fecha: '10 Mar 2026', imagen: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400', cliente: 'María González', ubicacion: 'Loma Dorada', superficie: '280 m²', descripcion: 'Casa familiar con diseño minimalista.', progreso: 100 },
    { id: 6, nombre: 'Oficinas Tecnológica', estado: 'Finalizado', fecha: '05 Feb 2026', imagen: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400', cliente: 'Tech Solutions SA', ubicacion: 'Zona Industrial', superficie: '850 m²', descripcion: 'Oficinas modernas con espacios colaborativos.', progreso: 100 },
    { id: 7, nombre: 'Loft Industrial', estado: 'Pausado', fecha: '20 Ene 2026', imagen: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400', cliente: 'Carlos Vega', ubicacion: 'Centro Durango', superficie: '180 m²', descripcion: 'Remodelación tipo loft con vigas expuestas.', progreso: 30 },
    { id: 8, nombre: 'Clínica Vida', estado: 'En proceso', fecha: '12 Abr 2026', imagen: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400', cliente: 'Dr. Ramírez', ubicacion: 'Col. Médicos', superficie: '600 m²', descripcion: 'Clínica de especialidades con 8 consultorios.', progreso: 75 },
  ];

  proyectosPublicos: any[] = [];

  // ============ PROYECTOS: FILTROS Y ESTADOS ============
  busquedaProyectos = '';
  filtroEstadoProyectos: 'todos' | 'En diseño' | 'En proceso' | 'En revisión' | 'Pausado' | 'Finalizado' = 'todos';

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
    categoria: 'Residencial'
  };

  // Navegación entre modales de proyectos
  volverATodos = false;
  volverATodosDesdeEditar = false;
  volverADetalleDesdeEditar = false;
  volverATodosDespuesDeDetalle = false;
  proyectoDetalleAnterior: Proyecto | null = null;

  // ============ AGENDA: CITAS DE HOY ============
  citasHoy: Cita[] = [
    { hora: '10:00', cliente: 'Juan Alfonso', tipo: 'Consulta', estado: 'confirmada' },
    { hora: '12:30', cliente: 'María González', tipo: 'Proyecto', estado: 'confirmada' },
    { hora: '15:00', cliente: 'Carlos Méndez', tipo: 'Consulta', estado: 'pendiente' },
    { hora: '17:30', cliente: 'Ana Martínez', tipo: 'Proyecto', estado: 'pendiente' },
  ];

  // ============ NOTIFICACIONES ============
  notificaciones: Notificacion[] = [
    { id: 1, tipo: 'cita', titulo: 'Nueva cita agendada', descripcion: 'Juan Alfonso reservó una consulta para mañana', tiempo: 'Hace 15 min', leida: false },
    { id: 2, tipo: 'consulta', titulo: 'Nueva consulta recibida', descripcion: 'María González preguntó sobre remodelación', tiempo: 'Hace 1 hora', leida: false },
    { id: 3, tipo: 'confirmacion', titulo: 'Cita confirmada', descripcion: 'Carlos Méndez confirmó su cita del jueves', tiempo: 'Hace 2 horas', leida: false },
    { id: 4, tipo: 'mensaje', titulo: 'Comentario en proyecto', descripcion: 'Ana Martínez dejó comentarios en el proyecto Villa Costanera', tiempo: 'Hace 4 horas', leida: true },
    { id: 5, tipo: 'cancelacion', titulo: 'Cita cancelada', descripcion: 'Roberto Silva canceló su cita del viernes', tiempo: 'Ayer', leida: true },
  ];

  // ============ CONSULTAS: DATOS Y ESTADOS ============
  consultasPendientes: ConsultaPendiente[] = [
    { id: 1, nombre: 'Patricia Vargas', correo: 'patricia@example.com', asunto: 'Cotización para residencia', mensaje: 'Hola, me gustaría obtener una cotización para una residencia de 200m² en La Forestal. Estoy buscando un diseño moderno con tres habitaciones, dos baños y jardín. ¿Podrían darme una idea del costo y tiempos de entrega? Mi presupuesto aproximado es de 4 millones de pesos. Quedo atenta a sus comentarios.', fecha: 'Hace 2 horas', urgente: true },
    { id: 2, nombre: 'Diego Hernández', correo: 'diego@example.com', asunto: 'Consulta sobre servicios', mensaje: 'Buen día, quisiera saber si manejan proyectos comerciales y cuál sería el costo aproximado para una tienda de 80m². También quisiera saber si incluyen la supervisión de obra. Gracias.', fecha: 'Hace 5 horas', urgente: false },
    { id: 3, nombre: 'Lucía Ramírez', correo: 'lucia@example.com', asunto: 'Información sobre remodelación', mensaje: 'Estoy interesada en una remodelación completa de mi local comercial. ¿Podrían enviarme información sobre sus servicios?', fecha: 'Ayer', urgente: false },
  ];

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
  graficaSeleccionada: 'proyectos-mes' | 'tipos-proyectos' | 'actividad-citas' | 'clientes-nuevos' | null = null;

  // ============ CONSTRUCTOR Y LIFECYCLE ============
  constructor(private router: Router) {}

  ngOnInit() {
    const hoy = new Date();
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    this.fechaHoy = `${dias[hoy.getDay()]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  }

  // ============ GETTERS ============
  get stats(): StatCard[] {
    return this.statsPorPeriodo[this.periodoActivo];
  }

  get notificacionesNoLeidas(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  get totalConsultasPendientes(): number {
    return this.consultasPendientes.length;
  }

  get proyectosFiltrados() {
    let resultado = this.todosLosProyectos;
    if (this.filtroEstadoProyectos !== 'todos') {
      resultado = resultado.filter(p => p.estado === this.filtroEstadoProyectos);
    }
    if (this.busquedaProyectos.trim()) {
      const q = this.busquedaProyectos.toLowerCase();
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.cliente?.toLowerCase().includes(q) ||
        p.ubicacion?.toLowerCase().includes(q)
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
  }

  // ============ NOTIFICACIONES ============
  marcarTodasLeidas() {
    this.notificaciones.forEach(n => n.leida = true);
  }

  // ============ GRÁFICAS ============
  abrirGrafica(grafica: 'proyectos-mes' | 'tipos-proyectos' | 'actividad-citas' | 'clientes-nuevos') {
    this.graficaSeleccionada = grafica;
  }

  cerrarGrafica() {
    this.graficaSeleccionada = null;
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
  }

  cerrarTodosProyectos() {
    this.mostrarTodosProyectos = false;
  }

  // ============ PROYECTOS: NUEVO Y EDITAR ============
  nuevoProyecto() {
    this.proyectoEditando = {
      id: Date.now(),
      nombre: '',
      estado: 'En diseño',
      fecha: new Date().toLocaleDateString('es-MX'),
      imagen: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
      cliente: '',
      ubicacion: '',
      superficie: '',
      descripcion: '',
      progreso: 0
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

    if (this.esNuevoProyecto) {
      this.todosLosProyectos.unshift({ ...this.proyectoEditando });
      this.proyectosRecientes.unshift({ ...this.proyectoEditando });
      if (this.proyectosRecientes.length > 4) this.proyectosRecientes.pop();
    } else {
      const idx1 = this.todosLosProyectos.findIndex(p => p.id === this.proyectoEditando!.id);
      if (idx1 >= 0) this.todosLosProyectos[idx1] = { ...this.proyectoEditando };

      const idx2 = this.proyectosRecientes.findIndex(p => p.id === this.proyectoEditando!.id);
      if (idx2 >= 0) this.proyectosRecientes[idx2] = { ...this.proyectoEditando };
    }

    if (this.proyectoEditando.estado === 'Finalizado' && this.estadoOriginal !== 'Finalizado') {
      this.mostrarConfirmarFinalizado = true;
      this.volverATodosDesdeEditar = false;
      this.volverADetalleDesdeEditar = false;
      this.proyectoDetalleAnterior = null;
    } else {
      this.cerrarEditarProyecto();
    }
  }

  // ============ PROYECTOS: FINALIZAR Y PUBLICAR ============
  terminarProyecto(proyecto: Proyecto) {
    proyecto.estado = 'Finalizado';
    proyecto.progreso = 100;

    const idx1 = this.todosLosProyectos.findIndex(p => p.id === proyecto.id);
    if (idx1 >= 0) this.todosLosProyectos[idx1] = { ...proyecto };

    const idx2 = this.proyectosRecientes.findIndex(p => p.id === proyecto.id);
    if (idx2 >= 0) this.proyectosRecientes[idx2] = { ...proyecto };

    this.proyectoEditando = { ...proyecto };
    this.estadoOriginal = 'En proceso';
    this.mostrarConfirmarFinalizado = true;
  }

  confirmarFinalizado(agregarAPublico: boolean) {
    this.mostrarConfirmarFinalizado = false;

    if (agregarAPublico && this.proyectoEditando) {
      this.formPublico = {
        titulo: this.proyectoEditando.nombre,
        descripcion: this.proyectoEditando.descripcion || '',
        imagenUrl: this.proyectoEditando.imagen,
        categoria: 'Residencial'
      };
      this.mostrarAgregarPublico = true;
    } else {
      this.cerrarEditarProyecto();
    }
  }

  guardarProyectoPublico() {
    if (!this.formPublico.titulo.trim()) return;

    this.proyectosPublicos.push({
      id: Date.now(),
      titulo: this.formPublico.titulo,
      descripcion: this.formPublico.descripcion,
      imagenUrl: this.formPublico.imagenUrl,
      categoria: this.formPublico.categoria,
      proyectoOriginalId: this.proyectoEditando?.id
    });

    this.cerrarAgregarPublico();
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

    this.consultasPendientes = this.consultasPendientes.filter(c => c.id !== this.consultaSeleccionada?.id);

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
}
