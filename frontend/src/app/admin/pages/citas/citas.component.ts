import { Component, OnInit, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService, Cita as CitaBackend } from '../../../core/services/citas.service'; // ⚠️ ajusta la ruta
import { CatalogoService, Servicio } from '../../../core/services/catalogo.service'; // ⚠️ ajusta la ruta
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';

interface Cita {
  id: number;
  cliente: string;
  fecha: Date;
  hora: string;
  duracion: number;
  tipo: 'consulta' | 'proyecto';
  estado: 'confirmada' | 'pendiente' | 'cancelada' | 'completada';
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
  imports: [CommonModule, FormsModule,SkeletonComponent],
  templateUrl: './citas.component.html',
})
export class CitasComponent implements OnInit {
  private citasService = inject(CitasService);
  private catalogo = inject(CatalogoService);

  vista: 'lista' | 'calendario' = 'lista';
  filtroEstado: 'todas' | 'confirmada' | 'pendiente' | 'cancelada' = 'todas';
  busqueda = '';
  menuAbiertoId: number | null = null;
  citaSeleccionada: Cita | null = null;
  filtroEstadoAbierto = false;
  cargando = signal(true);

  mesActual = new Date();
  meses = [
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
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Empieza vacío; se carga desde el backend en ngOnInit
  citas = signal<Cita[]>([]);

  modoCalendario: 'mes' | 'semana' | 'dia' = 'mes';
  selectorMesAbierto = false;
  anioSeleccionado = new Date().getFullYear();

  horasDia: string[] = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
  ];

  // Nueva cita
  mostrarNuevaCita = false;
  nuevaCita = {
    cliente: '',
    correo: '',
    telefono: '',
    fecha: '',
    hora: '',
    duracion: 60,
    tipo: 'consulta' as 'consulta' | 'proyecto',
    servicioId: null as number | null,
    servicio: '',
    notas: '',
  };

  // Confirmación de cancelación
  mostrarConfirmarCancelar = false;
  citaACancelar: Cita | null = null;

  mostrarHistorial = false;

  // Catálogo real (señal del CatalogoService — antes era una lista hardcodeada)
  serviciosDisponibles = this.catalogo.servicios;

  horasDisponibles = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
  ];

  mostrarSelectorServicioNueva = false;

  ngOnInit() {
    this.cargarCitas();
  }

  // ====== Carga y mapeo desde backend ======
  private cargarCitas() {
    this.cargando.set(true);
    this.citasService.listar().subscribe({
      next: (lista) => {
        this.citas.set(lista.map((c) => this.mapearCita(c))); // 👈 .set
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      },
    });
  }

  private mapearCita(c: CitaBackend): Cita {
    return {
      id: c.id,
      cliente: c.nombre,
      correo: c.correo,
      telefono: c.telefono,
      fecha: new Date(c.fecha + 'T00:00:00'), // local, sin offset UTC
      hora: c.hora,
      duracion: c.duracion,
      tipo: c.tipo,
      estado: c.estado,
      servicio:
        c.servicio?.titulo ||
        (c.tipo === 'consulta' ? 'Consulta general' : 'Proyecto sin servicio'),
      notas: c.motivo,
    };
  }

  // ====== Helpers de fecha ======
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

  // ====== Lista (sin cambios) ======
  get citasFiltradas(): Cita[] {
    let resultado = this.citas();
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      resultado = resultado.filter(
        (c) => c.cliente.toLowerCase().includes(q) || c.servicio?.toLowerCase().includes(q),
      );
    }
    if (this.filtroEstado !== 'todas') {
      resultado = resultado.filter((c) => c.estado === this.filtroEstado);
    }
    return resultado.sort(
      (a, b) => a.fecha.getTime() - b.fecha.getTime() || a.hora.localeCompare(b.hora),
    );
  }

  get citasAgrupadas() {
    const grupos: { [key: string]: Cita[] } = {};
    this.citasFiltradas.forEach((cita) => {
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
    if (diff > 0 && diff < 7) return 'Esta semana';
    return f.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  // ====== Stats ======
  get citasHoy(): number {
    const hoy = this.fechaHoy();
    return this.citas().filter(
      (c) => c.fecha.getTime() === hoy.getTime() && c.estado !== 'cancelada',
    ).length;
  }

  get citasSemana(): number {
    const hoy = this.fechaHoy();
    const finSemana = new Date(hoy);
    finSemana.setDate(hoy.getDate() + 7);
    return this.citas().filter(
      (c) => c.fecha >= hoy && c.fecha <= finSemana && c.estado !== 'cancelada',
    ).length;
  }

  get citasPendientes(): number {
    return this.citas().filter((c) => c.estado === 'pendiente').length;
  }

  get citasConfirmadas(): number {
    return this.citas().filter((c) => c.estado === 'confirmada').length;
  }

  // ====== Calendario (sin cambios) ======
  get diasMes(): DiaCalendario[] {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const hoy = this.fechaHoy();
    const dias: DiaCalendario[] = [];

    const diaSemanaInicio = primerDia.getDay();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const fecha = new Date(año, mes, -i);
      fecha.setHours(0, 0, 0, 0);
      dias.push({
        fecha,
        diaMes: fecha.getDate(),
        esMesActual: false,
        esHoy: fecha.getTime() === hoy.getTime(),
        citas: this.citas().filter((c) => c.fecha.getTime() === fecha.getTime()),
      });
    }
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      const fecha = new Date(año, mes, i);
      fecha.setHours(0, 0, 0, 0);
      dias.push({
        fecha,
        diaMes: i,
        esMesActual: true,
        esHoy: fecha.getTime() === hoy.getTime(),
        citas: this.citas().filter((c) => c.fecha.getTime() === fecha.getTime()),
      });
    }
    let diaSiguiente = 1;
    while (dias.length < 42) {
      const fecha = new Date(año, mes + 1, diaSiguiente);
      fecha.setHours(0, 0, 0, 0);
      dias.push({
        fecha,
        diaMes: diaSiguiente,
        esMesActual: false,
        esHoy: fecha.getTime() === hoy.getTime(),
        citas: this.citas().filter((c) => c.fecha.getTime() === fecha.getTime()),
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

  // ====== Acciones que llegan al backend ======
  confirmarCita(cita: Cita) {
    this.citasService.cambiarEstado(cita.id, 'confirmada').subscribe({
      next: () => {
        cita.estado = 'confirmada';
        this.citas.update((arr) => [...arr]); // 👈 dispara la detección
        this.menuAbiertoId = null;
      },
      error: () => alert('No se pudo confirmar la cita. Intenta de nuevo.'),
    });
  }

  cancelarCita(cita: Cita) {
    this.citasService.cambiarEstado(cita.id, 'cancelada').subscribe({
      next: () => {
        cita.estado = 'cancelada';
        this.citas.update((arr) => [...arr]); // 👈 dispara la detección
        this.menuAbiertoId = null;
      },
      error: () => alert('No se pudo cancelar la cita. Intenta de nuevo.'),
    });
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
        citas: this.citas().filter((c) => c.fecha.getTime() === fecha.getTime()),
      });
    }
    return dias;
  }

  get diaActual(): DiaCalendario {
    const fecha = new Date(this.mesActual);
    fecha.setHours(0, 0, 0, 0);
    const hoy = this.fechaHoy();
    return {
      fecha,
      diaMes: fecha.getDate(),
      esMesActual: true,
      esHoy: fecha.getTime() === hoy.getTime(),
      citas: this.citas().filter((c) => c.fecha.getTime() === fecha.getTime()),
    };
  }

  calcularTop(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return (h - 8) * 60 + m;
  }

  calcularAltura(duracion: number): number {
    return duracion;
  }

  calcularTopDia(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return (h - 8) * 80 + (m / 60) * 80;
  }

  calcularAlturaDia(duracion: number): number {
    return duracion * (80 / 60);
  }

  get tituloEncabezado(): string {
    if (this.modoCalendario === 'mes') {
      return `${this.meses[this.mesActual.getMonth()]} ${this.mesActual.getFullYear()}`;
    } else if (this.modoCalendario === 'semana') {
      const inicio = this.diasSemanaActual[0].fecha;
      const fin = this.diasSemanaActual[6].fecha;
      return `${inicio.getDate()} ${this.meses[inicio.getMonth()].slice(0, 3)} - ${fin.getDate()} ${this.meses[fin.getMonth()].slice(0, 3)} ${fin.getFullYear()}`;
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
    this.mostrarSelectorServicioNueva = false;
  }

  opcionesEstado = [
    { value: 'todas' as const, label: 'Todos los estados', color: 'gray' },
    { value: 'confirmada' as const, label: 'Confirmadas', color: 'green' },
    { value: 'pendiente' as const, label: 'Pendientes', color: 'orange' },
    { value: 'cancelada' as const, label: 'Canceladas', color: 'red' },
  ];

  get filtroEstadoActual() {
    return this.opcionesEstado.find((o) => o.value === this.filtroEstado);
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
    if (dia.citas.length > 0) this.diaSeleccionado = dia;
  }

  cerrarDia() {
    this.diaSeleccionado = null;
  }

  // ====== Nueva cita (admin) ======
  abrirNuevaCita() {
    this.mostrarNuevaCita = true;
    this.nuevaCita = {
      cliente: '',
      correo: '',
      telefono: '',
      fecha: '',
      hora: '',
      duracion: 60,
      tipo: 'consulta',
      servicioId: null,
      servicio: '',
      notas: '',
    };
  }

  cerrarNuevaCita() {
    this.mostrarNuevaCita = false;
  }

  guardarNuevaCita() {
    if (!this.nuevaCitaValida) return;
    const payload = {
      nombre: this.nuevaCita.cliente.trim(),
      correo: this.nuevaCita.correo.trim(),
      telefono: this.nuevaCita.telefono.trim(),
      tipo: this.nuevaCita.tipo,
      servicioId: this.nuevaCita.tipo === 'consulta' ? null : this.nuevaCita.servicioId,
      motivo: this.nuevaCita.notas?.trim() || '',
      fecha: this.nuevaCita.fecha,
      hora: this.nuevaCita.hora,
    };
    this.citasService.crear(payload).subscribe({
      next: (creada) => {
        this.citas.update((arr) => [this.mapearCita(creada), ...arr]); // 👈
        this.cerrarNuevaCita();
      },
      error: (err) =>
        alert(
          err?.error?.message ||
            'No se pudo guardar la cita. Revisa los campos e intenta de nuevo.',
        ),
    });
  }

  // ====== Confirmar cancelación ======
  solicitarCancelarCita(cita: Cita, event?: Event) {
    if (event) event.stopPropagation();
    this.citaACancelar = cita;
    this.mostrarConfirmarCancelar = true;
  }

  confirmarCancelacion() {
    if (this.citaACancelar) this.cancelarCita(this.citaACancelar);
    this.cerrarConfirmarCancelar();
  }

  cerrarConfirmarCancelar() {
    this.mostrarConfirmarCancelar = false;
    this.citaACancelar = null;
  }

  // Confirmación al aprobar cita
  mostrarDialogoConfirmar = false;
  citaAConfirmar: Cita | null = null;

  solicitarConfirmarCita(cita: Cita, event?: Event) {
    if (event) event.stopPropagation();
    this.citaAConfirmar = cita;
    this.mostrarDialogoConfirmar = true;
  }

  aceptarConfirmar() {
    if (this.citaAConfirmar) this.confirmarCita(this.citaAConfirmar);
    this.cerrarDialogoConfirmar();
  }

  cerrarDialogoConfirmar() {
    this.mostrarDialogoConfirmar = false;
    this.citaAConfirmar = null;
  }

  // ====== Historial ======
  toggleHistorial() {
    this.mostrarHistorial = !this.mostrarHistorial;
  }

  esCitaPasada(cita: Cita): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaCita = new Date(cita.fecha);
    fechaCita.setHours(0, 0, 0, 0);
    return fechaCita < hoy;
  }

  get citasFuturas() {
    return this.citas().filter((c) => !this.esCitaPasada(c));
  }

  get citasPasadas() {
    return this.citas().filter((c) => this.esCitaPasada(c));
  }

  // ====== Validación nueva cita ======
  get nuevaCitaValida(): boolean {
    if (!this.nuevaCita.cliente.trim()) return false;
    if (!this.nuevaCita.correo.trim()) return false;
    if (!this.nuevaCita.telefono.trim()) return false;
    if (!this.nuevaCita.fecha) return false;
    if (!this.nuevaCita.hora) return false;
    if (this.nuevaCita.tipo === 'proyecto' && !this.nuevaCita.servicioId) return false;
    return true;
  }

  get servicioNuevaCitaSeleccionado(): Servicio | null {
    return this.nuevaCita.servicioId
      ? this.serviciosDisponibles().find((s) => s.id === this.nuevaCita.servicioId) || null
      : null;
  }

  seleccionarTipoNuevaCita(tipo: 'consulta' | 'proyecto') {
    this.nuevaCita.tipo = tipo;
    if (tipo === 'consulta') {
      this.nuevaCita.servicioId = null;
      this.nuevaCita.servicio = '';
    }
  }

  toggleSelectorServicioNueva(event: Event) {
    event.stopPropagation();
    this.mostrarSelectorServicioNueva = !this.mostrarSelectorServicioNueva;
  }

  seleccionarServicioNueva(s: Servicio) {
    this.nuevaCita.servicioId = s.id;
    this.nuevaCita.servicio = s.titulo;
    this.mostrarSelectorServicioNueva = false;
  }
}
