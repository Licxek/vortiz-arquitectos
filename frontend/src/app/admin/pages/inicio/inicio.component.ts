import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, Usuario } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './inicio.component.html',
})
export class InicioComponent implements OnInit {
  usuario: Usuario | null = null;
  fechaHoy = '';

  stats: StatCard[] = [
    {
      label: 'Proyectos Activos',
      value: 10,
      cambioValor: 25,
      cambioTipo: 'positive',
      cambioEtiqueta: 'vs mes anterior',
      icon: 'projects',
      color: 'blue'
    },
    {
      label: 'Citas Hoy',
      value: 5,
      cambioValor: 2,
      cambioTipo: 'neutral',
      cambioEtiqueta: 'pendientes',
      icon: 'calendar',
      color: 'orange'
    },
    {
      label: 'Consultas',
      value: 28,
      cambioValor: 18,
      cambioTipo: 'positive',
      cambioEtiqueta: 'vs semana anterior',
      icon: 'chat',
      color: 'green'
    },
    {
      label: 'Visitas al sitio',
      value: 1245,
      cambioValor: -8,
      cambioTipo: 'negative',
      cambioEtiqueta: 'vs mes anterior',
      icon: 'eye',
      color: 'purple'
    }
  ];

  proyectosRecientes: Proyecto[] = [
    { id: 1, nombre: 'Residencia Las Flores', estado: 'En proceso', fecha: '15 May 2026', imagen: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400', cliente: 'Juan Alfonso Méndez', ubicacion: 'La Forestal, Durango', superficie: '320 m²', descripcion: 'Residencia moderna de dos niveles con acabados premium, jardín interior y alberca.', fechaInicio: '01 Mar 2026', fechaEntrega: '15 Oct 2026', progreso: 45 },
    { id: 2, nombre: 'Edificio Corporativo Centro', estado: 'En diseño', fecha: '20 May 2026', imagen: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400', cliente: 'Inmobiliaria del Norte', ubicacion: 'Centro Histórico, Durango', superficie: '1,500 m²', descripcion: 'Edificio de oficinas de 5 niveles con áreas comunes y estacionamiento subterráneo.', fechaInicio: '15 May 2026', fechaEntrega: '20 Dic 2026', progreso: 15 },
    { id: 3, nombre: 'Villa Costanera', estado: 'En proceso', fecha: '25 May 2026', imagen: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400', cliente: 'Familia Rodríguez', ubicacion: 'Mazatlán, Sinaloa', superficie: '480 m²', descripcion: 'Casa de playa con vista al mar, terrazas amplias y diseño contemporáneo.', fechaInicio: '10 Feb 2026', fechaEntrega: '30 Sep 2026', progreso: 60 },
    { id: 4, nombre: 'Centro Comercial Plaza', estado: 'En revisión', fecha: '01 Jun 2026', imagen: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400', cliente: 'Grupo Constructor RJV', ubicacion: 'Av. 20 de Noviembre, Durango', superficie: '4,200 m²', descripcion: 'Centro comercial de dos niveles con 32 locales, food court y cines.', fechaInicio: '20 Abr 2026', fechaEntrega: '15 Feb 2027', progreso: 5 },
  ];

  // Más proyectos para "Ver todos"
  todosLosProyectos: Proyecto[] = [
    ...this.proyectosRecientes,
    { id: 5, nombre: 'Casa Loma del Parque', estado: 'Finalizado', fecha: '10 Mar 2026', imagen: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400', cliente: 'María González', ubicacion: 'Loma Dorada', superficie: '280 m²', descripcion: 'Casa familiar con diseño minimalista.', progreso: 100 },
    { id: 6, nombre: 'Oficinas Tecnológica', estado: 'Finalizado', fecha: '05 Feb 2026', imagen: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400', cliente: 'Tech Solutions SA', ubicacion: 'Zona Industrial', superficie: '850 m²', descripcion: 'Oficinas modernas con espacios colaborativos.', progreso: 100 },
    { id: 7, nombre: 'Loft Industrial', estado: 'Pausado', fecha: '20 Ene 2026', imagen: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400', cliente: 'Carlos Vega', ubicacion: 'Centro Durango', superficie: '180 m²', descripcion: 'Remodelación tipo loft con vigas expuestas.', progreso: 30 },
    { id: 8, nombre: 'Clínica Vida', estado: 'En proceso', fecha: '12 Abr 2026', imagen: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400', cliente: 'Dr. Ramírez', ubicacion: 'Col. Médicos', superficie: '600 m²', descripcion: 'Clínica de especialidades con 8 consultorios.', progreso: 75 },
  ];

  citasHoy: Cita[] = [
    { hora: '10:00', cliente: 'Juan Alfonso', tipo: 'Consulta', estado: 'confirmada' },
    { hora: '12:30', cliente: 'María González', tipo: 'Proyecto', estado: 'confirmada' },
    { hora: '15:00', cliente: 'Carlos Méndez', tipo: 'Consulta', estado: 'pendiente' },
    { hora: '17:30', cliente: 'Ana Martínez', tipo: 'Proyecto', estado: 'pendiente' },
  ];

  // Filtro temporal
  periodoActivo: 'hoy' | 'semana' | 'mes' | 'año' = 'mes';

  // Centro de actividad
  notificaciones: Notificacion[] = [
    { id: 1, tipo: 'cita', titulo: 'Nueva cita agendada', descripcion: 'Juan Alfonso reservó una consulta para mañana', tiempo: 'Hace 15 min', leida: false },
    { id: 2, tipo: 'consulta', titulo: 'Nueva consulta recibida', descripcion: 'María González preguntó sobre remodelación', tiempo: 'Hace 1 hora', leida: false },
    { id: 3, tipo: 'confirmacion', titulo: 'Cita confirmada', descripcion: 'Carlos Méndez confirmó su cita del jueves', tiempo: 'Hace 2 horas', leida: false },
    { id: 4, tipo: 'mensaje', titulo: 'Comentario en proyecto', descripcion: 'Ana Martínez dejó comentarios en el proyecto Villa Costanera', tiempo: 'Hace 4 horas', leida: true },
    { id: 5, tipo: 'cancelacion', titulo: 'Cita cancelada', descripcion: 'Roberto Silva canceló su cita del viernes', tiempo: 'Ayer', leida: true },
  ];

  // Consultas pendientes
  consultasPendientes: ConsultaPendiente[] = [
    { id: 1, nombre: 'Patricia Vargas', correo: 'patricia@example.com', asunto: 'Cotización para residencia', mensaje: 'Hola, me gustaría obtener una cotización para una residencia de 200m² en La Forestal. Estoy buscando un diseño moderno con tres habitaciones, dos baños y jardín. ¿Podrían darme una idea del costo y tiempos de entrega? Mi presupuesto aproximado es de 4 millones de pesos. Quedo atenta a sus comentarios.', fecha: 'Hace 2 horas', urgente: true },
    { id: 2, nombre: 'Diego Hernández', correo: 'diego@example.com', asunto: 'Consulta sobre servicios', mensaje: 'Buen día, quisiera saber si manejan proyectos comerciales y cuál sería el costo aproximado para una tienda de 80m². También quisiera saber si incluyen la supervisión de obra. Gracias.', fecha: 'Hace 5 horas', urgente: false },
    { id: 3, nombre: 'Lucía Ramírez', correo: 'lucia@example.com', asunto: 'Información sobre remodelación', mensaje: 'Estoy interesada en una remodelación completa de mi local comercial. ¿Podrían enviarme información sobre sus servicios?', fecha: 'Ayer', urgente: false },
  ];

  // Estados de modales
  proyectoSeleccionado: Proyecto | null = null;
  mostrarTodosProyectos = false;
  consultaSeleccionada: ConsultaPendiente | null = null;
  mostrarRespuesta = false;
  mostrarTodasConsultas = false;
  graficaSeleccionada: 'proyectos-mes' | 'tipos-proyectos' | 'actividad-citas' | 'clientes-nuevos' | null = null;

  // Respuesta a consulta
  respuestaTexto = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.usuario = this.authService.getUser();

    const hoy = new Date();
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    this.fechaHoy = `${dias[hoy.getDay()]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  }

  get notificacionesNoLeidas(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  get totalConsultasPendientes(): number {
    return this.consultasPendientes.length;
  }

  marcarTodasLeidas() {
    this.notificaciones.forEach(n => n.leida = true);
  }

  cambiarPeriodo(periodo: 'hoy' | 'semana' | 'mes' | 'año') {
    this.periodoActivo = periodo;
    // Aquí se recargarían los datos según el periodo
  }

  // Proyectos
  abrirProyecto(proyecto: Proyecto) {
    this.proyectoSeleccionado = proyecto;
  }
  cerrarProyecto() {
    this.proyectoSeleccionado = null;
  }
  abrirTodosProyectos() {
    this.mostrarTodosProyectos = true;
  }
  cerrarTodosProyectos() {
    this.mostrarTodosProyectos = false;
  }

  // Consultas
  abrirConsulta(consulta: ConsultaPendiente) {
    this.consultaSeleccionada = consulta;
  }
  cerrarConsulta() {
    this.consultaSeleccionada = null;
  }
  responderConsulta(consulta: ConsultaPendiente) {
    this.consultaSeleccionada = consulta;
    this.mostrarRespuesta = true;
    this.respuestaTexto = '';
  }
  enviarRespuesta() {
    if (this.respuestaTexto.trim()) {
      this.consultasPendientes = this.consultasPendientes.filter(c => c.id !== this.consultaSeleccionada?.id);
      this.cerrarRespuesta();
    }
  }
  cerrarRespuesta() {
    this.mostrarRespuesta = false;
    this.consultaSeleccionada = null;
    this.respuestaTexto = '';
  }
  abrirTodasConsultas() {
    this.mostrarTodasConsultas = true;
  }
  cerrarTodasConsultas() {
    this.mostrarTodasConsultas = false;
  }

  // Gráficas
  abrirGrafica(grafica: 'proyectos-mes' | 'tipos-proyectos' | 'actividad-citas' | 'clientes-nuevos') {
    this.graficaSeleccionada = grafica;
  }
  cerrarGrafica() {
    this.graficaSeleccionada = null;
  }
}
