import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Cita {
  id: number;
  cliente: string;
  fecha: Date;
  hora: string;
  duracion: number;
  tipo: 'consulta' | 'proyecto';
  estado: 'confirmada' | 'pendiente' | 'cancelada';
  servicio?: string;
  notas?: string;
  telefono?: string;
  correo?: string;
}

interface DiaCalendario {
  fecha: Date;
  diaMes: number;
  esMesActual: boolean;
  esHoy: boolean;
  citas: Cita[];
}

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './citas.component.html',
})
export class CitasComponent implements OnInit {
  vista: 'lista' | 'calendario' = 'lista';
  filtroEstado: 'todas' | 'confirmada' | 'pendiente' | 'cancelada' = 'todas';
  busqueda = '';
  menuAbiertoId: number | null = null;
  citaSeleccionada: Cita | null = null;
  filtroEstadoAbierto = false

  mesActual = new Date();
  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  citas: Cita[] = [
    { id: 1, cliente: 'Juan Alfonso Méndez', fecha: this.fechaHoy(), hora: '10:00', duracion: 60, tipo: 'consulta', estado: 'confirmada', servicio: 'Diseño residencial', telefono: '618-123-4567', correo: 'juan@example.com' },
    { id: 2, cliente: 'María González', fecha: this.fechaHoy(), hora: '12:30', duracion: 90, tipo: 'proyecto', estado: 'confirmada', servicio: 'Remodelación de oficinas', telefono: '618-234-5678', correo: 'maria@example.com' },
    { id: 3, cliente: 'Carlos Hernández', fecha: this.fechaHoy(), hora: '15:00', duracion: 45, tipo: 'consulta', estado: 'pendiente', servicio: 'Consulta general', telefono: '618-345-6789', correo: 'carlos@example.com' },
    { id: 4, cliente: 'Ana Martínez', fecha: this.fechaMañana(), hora: '09:00', duracion: 60, tipo: 'proyecto', estado: 'confirmada', servicio: 'Diseño comercial', telefono: '618-456-7890', correo: 'ana@example.com' },
    { id: 5, cliente: 'Sebastián López', fecha: this.fechaMañana(), hora: '11:30', duracion: 60, tipo: 'consulta', estado: 'pendiente', servicio: 'Asesoría', telefono: '618-567-8901', correo: 'sebastian@example.com' },
    { id: 6, cliente: 'Daniela Ramos', fecha: this.fechaEnDias(3), hora: '14:00', duracion: 90, tipo: 'proyecto', estado: 'confirmada', servicio: 'Supervisión de obra', telefono: '618-678-9012', correo: 'daniela@example.com' },
    { id: 7, cliente: 'Roberto Silva', fecha: this.fechaEnDias(5), hora: '16:30', duracion: 60, tipo: 'consulta', estado: 'cancelada', servicio: 'Consulta cancelada', telefono: '618-789-0123', correo: 'roberto@example.com' },
    { id: 8, cliente: 'Patricia Vargas', fecha: this.fechaEnDias(7), hora: '10:30', duracion: 60, tipo: 'proyecto', estado: 'confirmada', servicio: 'Proyecto residencial', telefono: '618-890-1234', correo: 'patricia@example.com' },
  ];

  // Nueva propiedad para el modo del calendario
  modoCalendario: 'mes' | 'semana' | 'dia' = 'mes';

  // Para el selector rápido de mes/año
  selectorMesAbierto = false;
  anioSeleccionado = new Date().getFullYear();

  // Horas para vistas semana y día
  horasDia: string[] = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ];

  ngOnInit() {}

  fechaHoy(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  fechaMañana(): Date {
    const d = this.fechaHoy();
    d.setDate(d.getDate() + 1);
    return d;
  }

  fechaEnDias(dias: number): Date {
    const d = this.fechaHoy();
    d.setDate(d.getDate() + dias);
    return d;
  }

  get citasFiltradas(): Cita[] {
    let resultado = this.citas;

    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      resultado = resultado.filter(c =>
        c.cliente.toLowerCase().includes(q) ||
        c.servicio?.toLowerCase().includes(q)
      );
    }

    if (this.filtroEstado !== 'todas') {
      resultado = resultado.filter(c => c.estado === this.filtroEstado);
    }

    return resultado.sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.hora.localeCompare(b.hora));
  }

  // Agrupar citas por fecha para vista lista
  get citasAgrupadas() {
    const grupos: { [key: string]: Cita[] } = {};

    this.citasFiltradas.forEach(cita => {
      const key = this.formatearFechaGrupo(cita.fecha);
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(cita);
    });

    return Object.entries(grupos).map(([titulo, citas]) => ({ titulo, citas }));
  }

  formatearFechaGrupo(fecha: Date): string {
    const hoy = this.fechaHoy();
    const mañana = this.fechaMañana();
    const f = new Date(fecha);
    f.setHours(0, 0, 0, 0);

    if (f.getTime() === hoy.getTime()) return 'Hoy';
    if (f.getTime() === mañana.getTime()) return 'Mañana';

    const diff = Math.floor((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0 && diff < 7) return `Esta semana`;

    return f.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Stats
  get citasHoy(): number {
    const hoy = this.fechaHoy();
    return this.citas.filter(c => c.fecha.getTime() === hoy.getTime() && c.estado !== 'cancelada').length;
  }

  get citasSemana(): number {
    const hoy = this.fechaHoy();
    const finSemana = new Date(hoy);
    finSemana.setDate(hoy.getDate() + 7);
    return this.citas.filter(c => c.fecha >= hoy && c.fecha <= finSemana && c.estado !== 'cancelada').length;
  }

  get citasPendientes(): number {
    return this.citas.filter(c => c.estado === 'pendiente').length;
  }

  get citasConfirmadas(): number {
    return this.citas.filter(c => c.estado === 'confirmada').length;
  }

  // Calendario
  get diasMes(): DiaCalendario[] {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const hoy = this.fechaHoy();

    const dias: DiaCalendario[] = [];

    // Días del mes anterior
    const diaSemanaInicio = primerDia.getDay();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const fecha = new Date(año, mes, -i);
      fecha.setHours(0, 0, 0, 0);
      dias.push({
        fecha,
        diaMes: fecha.getDate(),
        esMesActual: false,
        esHoy: fecha.getTime() === hoy.getTime(),
        citas: this.citas.filter(c => c.fecha.getTime() === fecha.getTime())
      });
    }

    // Días del mes actual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      const fecha = new Date(año, mes, i);
      fecha.setHours(0, 0, 0, 0);
      dias.push({
        fecha,
        diaMes: i,
        esMesActual: true,
        esHoy: fecha.getTime() === hoy.getTime(),
        citas: this.citas.filter(c => c.fecha.getTime() === fecha.getTime())
      });
    }

    // Completar con días del mes siguiente hasta llenar 6 semanas
    let diaSiguiente = 1;
    while (dias.length < 42) {
      const fecha = new Date(año, mes + 1, diaSiguiente);
      fecha.setHours(0, 0, 0, 0);
      dias.push({
        fecha,
        diaMes: diaSiguiente,
        esMesActual: false,
        esHoy: fecha.getTime() === hoy.getTime(),
        citas: this.citas.filter(c => c.fecha.getTime() === fecha.getTime())
      });
      diaSiguiente++;
    }

    return dias;
  }

  mesAnterior() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
  }

  mesSiguiente() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
  }

  irHoy() {
    this.mesActual = new Date();
  }

  toggleMenu(event: Event, id: number) {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === id ? null : id;
  }

  abrirDetalle(cita: Cita) {
    this.citaSeleccionada = cita;
  }

  cerrarDetalle() {
    this.citaSeleccionada = null;
  }

  confirmarCita(cita: Cita) {
    cita.estado = 'confirmada';
    this.menuAbiertoId = null;
  }

  cancelarCita(cita: Cita) {
    cita.estado = 'cancelada';
    this.menuAbiertoId = null;
  }

  // Selector rápido
  toggleSelectorMes(event: Event) {
    event.stopPropagation();
    this.selectorMesAbierto = !this.selectorMesAbierto;
    this.anioSeleccionado = this.mesActual.getFullYear();
  }

  seleccionarMes(indice: number) {
    this.mesActual = new Date(this.anioSeleccionado, indice, 1);
    this.selectorMesAbierto = false;
  }

  cambiarAnio(delta: number) {
    this.anioSeleccionado += delta;
  }

  // Navegación según el modo
  navegarAnterior() {
    if (this.modoCalendario === 'mes') {
      this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    } else if (this.modoCalendario === 'semana') {
      const nueva = new Date(this.mesActual);
      nueva.setDate(nueva.getDate() - 7);
      this.mesActual = nueva;
    } else {
      const nueva = new Date(this.mesActual);
      nueva.setDate(nueva.getDate() - 1);
      this.mesActual = nueva;
    }
  }

  navegarSiguiente() {
    if (this.modoCalendario === 'mes') {
      this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    } else if (this.modoCalendario === 'semana') {
      const nueva = new Date(this.mesActual);
      nueva.setDate(nueva.getDate() + 7);
      this.mesActual = nueva;
    } else {
      const nueva = new Date(this.mesActual);
      nueva.setDate(nueva.getDate() + 1);
      this.mesActual = nueva;
    }
  }

  // Para vista semana
  get diasSemanaActual(): DiaCalendario[] {
    const inicio = new Date(this.mesActual);
    inicio.setDate(inicio.getDate() - inicio.getDay());
    inicio.setHours(0, 0, 0, 0);
    const hoy = this.fechaHoy();

    const dias: DiaCalendario[] = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + i);
      fecha.setHours(0, 0, 0, 0);
      dias.push({
        fecha,
        diaMes: fecha.getDate(),
        esMesActual: fecha.getMonth() === this.mesActual.getMonth(),
        esHoy: fecha.getTime() === hoy.getTime(),
        citas: this.citas.filter(c => c.fecha.getTime() === fecha.getTime())
      });
    }
    return dias;
  }

  // Para vista día
  get diaActual(): DiaCalendario {
    const fecha = new Date(this.mesActual);
    fecha.setHours(0, 0, 0, 0);
    const hoy = this.fechaHoy();
    return {
      fecha,
      diaMes: fecha.getDate(),
      esMesActual: true,
      esHoy: fecha.getTime() === hoy.getTime(),
      citas: this.citas.filter(c => c.fecha.getTime() === fecha.getTime())
    };
  }

  // Calcular posición vertical de una cita según la hora
  calcularTop(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    const horaBase = 8;
    return ((h - horaBase) * 60 + m) * (60 / 60); // 60px por hora
  }

  calcularAltura(duracion: number): number {
    return duracion * (60 / 60);
  }

  calcularTopDia(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    const horaBase = 8;
    // 80px por hora en vista día
    return (h - horaBase) * 80 + (m / 60) * 80;
  }

  calcularAlturaDia(duracion: number): number {
    return duracion * (80 / 60);
  }
  // Título del encabezado según modo
  get tituloEncabezado(): string {
    if (this.modoCalendario === 'mes') {
      return `${this.meses[this.mesActual.getMonth()]} ${this.mesActual.getFullYear()}`;
    } else if (this.modoCalendario === 'semana') {
      const inicio = this.diasSemanaActual[0].fecha;
      const fin = this.diasSemanaActual[6].fecha;
      return `${inicio.getDate()} ${this.meses[inicio.getMonth()].slice(0,3)} - ${fin.getDate()} ${this.meses[fin.getMonth()].slice(0,3)} ${fin.getFullYear()}`;
    } else {
      const f = this.mesActual;
      return `${this.diasSemana[f.getDay()]}, ${f.getDate()} ${this.meses[f.getMonth()]} ${f.getFullYear()}`;
    }
  }

  @HostListener('document:click')
  cerrarMenus() {
    this.menuAbiertoId = null;
    this.filtroEstadoAbierto = false;
    this.selectorMesAbierto = false;
  }
  opcionesEstado = [
    { value: 'todas' as const, label: 'Todos los estados', color: 'gray' },
    { value: 'confirmada' as const, label: 'Confirmadas', color: 'green' },
    { value: 'pendiente' as const, label: 'Pendientes', color: 'orange' },
    { value: 'cancelada' as const, label: 'Canceladas', color: 'red' }
  ];

  get filtroEstadoActual() {
    return this.opcionesEstado.find(o => o.value === this.filtroEstado);
  }

  toggleFiltroEstado(event: Event) {
    event.stopPropagation();
    this.filtroEstadoAbierto = !this.filtroEstadoAbierto;
  }

  seleccionarFiltro(valor: 'todas' | 'confirmada' | 'pendiente' | 'cancelada') {
    this.filtroEstado = valor;
    this.filtroEstadoAbierto = false;
  }

  diaSeleccionado: DiaCalendario | null = null;

  abrirDia(dia: DiaCalendario) {
    if (dia.citas.length > 0) {
      this.diaSeleccionado = dia;
    }
  }

  cerrarDia() {
    this.diaSeleccionado = null;
  }
}
