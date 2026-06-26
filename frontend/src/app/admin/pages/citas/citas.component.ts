import { Component, OnInit, HostListener, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService, Cita as CitaBackend } from '../../../core/services/citas.service'; // ⚠️ ajusta la ruta
import { CatalogoService, Servicio } from '../../../core/services/catalogo.service'; // ⚠️ ajusta la ruta
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ConfiguracionService } from '../../../core/services/configuracion.service'; // 👈 NUEVO
import { TelefonoInputComponent } from '../../../shared/telefono-input/telefono-input.component';
import { EstadoCita } from '../../../core/services/citas.service';

interface Cita {
  id: number;
  cliente: string;
  fecha: Date;
  hora: string;
  duracion: number;
  tipo: 'consulta' | 'proyecto';
  estado: 'confirmada' | 'pendiente' | 'cancelada' | 'completada' | 'no_asistio'; // 👈 actualizado
  servicio?: string;
  servicioId?: number; // 👈 NUEVO
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

interface GrupoCitas {
  key: string;
  titulo: string;
  subtitulo: string;
  citas: Cita[];
}

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, TelefonoInputComponent],
  templateUrl: './citas.component.html',
})
export class CitasComponent implements OnInit {
  private citasService = inject(CitasService);
  private catalogo = inject(CatalogoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private configuracionService = inject(ConfiguracionService);

  vista: 'lista' | 'calendario' | 'historial' = 'lista';
  filtroEstado: 'todas' | 'confirmada' | 'pendiente' | 'cancelada' = 'todas';
  busqueda = '';
  menuAbiertoId: number | null = null;
  citaSeleccionada: Cita | null = null;
  filtroEstadoAbierto = false;
  cargando = signal(true);
  private cdr = inject(ChangeDetectorRef);
  errorEmpalme = '';
  mostrarAtajos = false;

  // Configuración de agenda (cargada del backend)
  configAgenda: any = {
    horaInicio: '09:00',
    horaFin: '18:00',
    duracionCita: 60,
    tiempoEntreCitas: 15,
    diasSemana: [],
    diasFeriados: [],
  };

  // Advertencia de fecha inválida en modal nueva cita
  advertenciaFecha = '';

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
    estado: 'confirmada' as EstadoCita, // 👈 NUEVO
  };

  // Confirmación de cancelación
  mostrarConfirmarCancelar = false;
  citaACancelar: Cita | null = null;

  // Catálogo real (señal del CatalogoService — antes era una lista hardcodeada)
  serviciosDisponibles = this.catalogo.servicios;

  // 👇 Slots y ocupadas vienen del backend (igual que en formulario público)
  horasDisponibles = signal<string[]>([]);
  horasOcupadasAdmin = signal<string[]>([]);
  cargandoHorasAdmin = signal(false);

  /** Carga slots y ocupadas para la fecha seleccionada en nueva cita */
  private cargarSlotsAdmin(fecha: string) {
    if (!fecha) {
      this.horasDisponibles.set([]);
      this.horasOcupadasAdmin.set([]);
      return;
    }
    this.cargandoHorasAdmin.set(true);
    this.citasService.obtenerHorariosOcupados(fecha).subscribe({
      next: ({ todas, ocupadas }) => {
        this.horasDisponibles.set(todas);
        this.horasOcupadasAdmin.set(ocupadas);
        this.cargandoHorasAdmin.set(false);
        // Si la hora seleccionada ya no existe o está ocupada, deseleccionarla
        if (this.nuevaCita.hora) {
          const existe = todas.includes(this.nuevaCita.hora);
          const ocupada = ocupadas.includes(this.nuevaCita.hora);
          if (!existe || ocupada) {
            this.nuevaCita.hora = '';
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoHorasAdmin.set(false);
        this.horasDisponibles.set([]);
        this.horasOcupadasAdmin.set([]);
      },
    });
  }

  mostrarSelectorServicioNueva = false;

  ngOnInit() {
    this.cargarConfig();
    this.cargarCitas();
    // Escuchar navegación para reaccionar a queryParams del buscador
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.aplicarParamsDeUrl());

    // Primera carga
    this.aplicarParamsDeUrl();
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
      servicioId: c.servicio?.id,
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
    const hayBusqueda = !!this.busqueda.trim();

    // ⚠️ Si hay búsqueda, mostramos TODAS las citas (incluso pasadas/canceladas/completadas)
    // Si NO hay búsqueda, excluimos las que ya no necesitan atención
    // Solo aplica el filtro default si no hay búsqueda Y el filtro está en "todas"
    if (!hayBusqueda && this.filtroEstado === 'todas') {
      resultado = resultado.filter(
        (c) =>
          !this.esCitaPasada(c) &&
          c.estado !== 'completada' &&
          c.estado !== 'cancelada' &&
          !this.requiereCompletarUrgente(c),
      );
    }

    // Búsqueda por nombre, servicio, correo o teléfono
    if (hayBusqueda) {
      const q = this.busqueda.toLowerCase();
      resultado = resultado.filter(
        (c) =>
          c.cliente.toLowerCase().includes(q) ||
          c.servicio?.toLowerCase().includes(q) ||
          c.correo?.toLowerCase().includes(q) ||
          c.telefono?.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
          c.notas?.toLowerCase().includes(q),
      );
    }

    // Filtro de estado (siempre se aplica)
    if (this.filtroEstado !== 'todas') {
      resultado = resultado.filter((c) => c.estado === this.filtroEstado);
    }

    // Orden: cuando hay búsqueda, más recientes primero; sin búsqueda, próximas primero
    return resultado.sort((a, b) => {
      if (hayBusqueda) {
        return b.fecha.getTime() - a.fecha.getTime() || b.hora.localeCompare(a.hora);
      }
      return a.fecha.getTime() - b.fecha.getTime() || a.hora.localeCompare(b.hora);
    });
  }

  get citasAgrupadas(): GrupoCitas[] {
    // 🔍 Si hay búsqueda → un solo grupo "Resultados"
    if (this.busqueda.trim()) {
      const resultados = this.citasFiltradas;
      if (resultados.length === 0) return [];
      return [
        {
          key: 'resultados',
          titulo: 'Resultados de búsqueda',
          subtitulo: `${resultados.length} cita${resultados.length > 1 ? 's' : ''} con "${this.busqueda}"`,
          citas: resultados,
        },
      ];
    }

    // Lógica normal (sin búsqueda) — esto queda igual que ya tienes
    const hoy = this.fechaHoy();
    const manana = this.fechaMañana();
    const finSemana = new Date(hoy);
    finSemana.setDate(hoy.getDate() + 7);
    const finProximaSemana = new Date(hoy);
    finProximaSemana.setDate(hoy.getDate() + 14);

    const buckets = {
      hoy: [] as Cita[],
      manana: [] as Cita[],
      semana: [] as Cita[],
      proxSemana: [] as Cita[],
      futuro: [] as Cita[],
    };

    const idsPorConfirmar = new Set(this.citasPorConfirmar.map((c) => c.id));

    this.citasFiltradas.forEach((cita) => {
      // Saltar las que ya están en "Por confirmar"
      if (idsPorConfirmar.has(cita.id)) return;

      const f = new Date(cita.fecha);
      f.setHours(0, 0, 0, 0);

      if (f.getTime() === hoy.getTime()) buckets.hoy.push(cita);
      else if (f.getTime() === manana.getTime()) buckets.manana.push(cita);
      else if (f.getTime() <= finSemana.getTime()) buckets.semana.push(cita);
      else if (f.getTime() <= finProximaSemana.getTime()) buckets.proxSemana.push(cita);
      else buckets.futuro.push(cita);
    });

    const grupos: GrupoCitas[] = [];

    // 👇 NUEVO: Pendientes por confirmar (hoy/mañana o vencidas)
    const porConfirmar = this.citasPorConfirmar;
    if (porConfirmar.length > 0) {
      grupos.push({
        key: 'por_confirmar',
        titulo: 'Por confirmar',
        subtitulo: `${porConfirmar.length} cita${porConfirmar.length > 1 ? 's' : ''} pendiente${porConfirmar.length > 1 ? 's' : ''} de hoy/mañana`,
        citas: porConfirmar,
      });
    }

    const urgentes = this.citasPorCompletar;
    if (urgentes.length > 0) {
      grupos.push({
        key: 'urgentes',
        titulo: 'Acción requerida',
        subtitulo: `${urgentes.length} cita${urgentes.length > 1 ? 's' : ''} sin marcar como completada${urgentes.length > 1 ? 's' : ''}`,
        citas: urgentes,
      });
    }

    if (buckets.hoy.length)
      grupos.push({
        key: 'hoy',
        titulo: 'Hoy',
        subtitulo: this.subtituloFecha(hoy),
        citas: buckets.hoy,
      });

    if (buckets.manana.length)
      grupos.push({
        key: 'manana',
        titulo: 'Mañana',
        subtitulo: this.subtituloFecha(manana),
        citas: buckets.manana,
      });

    if (buckets.semana.length)
      grupos.push({
        key: 'semana',
        titulo: 'Esta semana',
        subtitulo: 'Próximos 7 días',
        citas: buckets.semana,
      });

    if (buckets.proxSemana.length)
      grupos.push({
        key: 'proxSemana',
        titulo: 'Próxima semana',
        subtitulo: 'En 1–2 semanas',
        citas: buckets.proxSemana,
      });

    if (buckets.futuro.length)
      grupos.push({
        key: 'futuro',
        titulo: 'Más adelante',
        subtitulo: 'Citas a futuro',
        citas: buckets.futuro,
      });

    return grupos;
  }

  private subtituloFecha(d: Date): string {
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
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
    return this.citas().filter(
      (c) => c.estado === 'confirmada' && !this.requiereCompletarUrgente(c),
    ).length;
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

  cerrarDetalle(event?: Event) {
    if (event) event.stopPropagation();
    this.citaSeleccionada = null;
  }

  // ====== Acciones que llegan al backend ======
  confirmarCita(cita: Cita) {
    this.citasService.cambiarEstado(cita.id, 'confirmada').subscribe({
      next: () => {
        cita.estado = 'confirmada';
        if (this.citaSeleccionada?.id === cita.id) {
          this.citaSeleccionada = { ...cita };
        }
        this.menuAbiertoId = null;
        this.refrescarVistas(); // 👈 reemplaza citas.update + cdr.detectChanges
      },
      error: () => alert('No se pudo confirmar la cita. Intenta de nuevo.'),
    });
  }

  cancelarCita(cita: Cita) {
    this.citasService.cambiarEstado(cita.id, 'cancelada').subscribe({
      next: () => {
        cita.estado = 'cancelada';
        if (this.citaSeleccionada?.id === cita.id) {
          this.citaSeleccionada = { ...cita };
        }
        this.menuAbiertoId = null;
        this.refrescarVistas();
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

  @HostListener('document:keydown', ['$event'])
  manejarAtajos(event: KeyboardEvent) {
    // No interferir si está escribiendo en input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return;
    }

    // No interferir con combinaciones del SO (Ctrl, Cmd, Alt)
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // ESC: cerrar lo que esté abierto (en orden de prioridad)
    if (event.key === 'Escape') {
      if (this.mostrarConfirmarCancelar) {
        this.cerrarConfirmarCancelar();
        return;
      }
      if (this.mostrarDialogoConfirmar) {
        this.cerrarDialogoConfirmar();
        return;
      }
      if (this.mostrarConfirmarCompletar) {
        this.cerrarConfirmarCompletar();
        return;
      }
      if (this.mostrarConfirmarNoAsistio) {
        this.cerrarConfirmarNoAsistio();
        return;
      }
      if (this.mostrarNuevaCita) {
        this.cerrarNuevaCita();
        return;
      }
      if (this.diaSeleccionado) {
        this.cerrarDia();
        return;
      }
      if (this.citaSeleccionada) {
        this.cerrarDetalle();
        return;
      }
      if (this.mostrarAtajos) {
        this.mostrarAtajos = false;
        return;
      }
      return;
    }

    // Si hay modal abierto, ignorar el resto de atajos
    const hayModal =
      this.citaSeleccionada ||
      this.mostrarNuevaCita ||
      this.diaSeleccionado ||
      this.mostrarConfirmarCancelar ||
      this.mostrarDialogoConfirmar ||
      this.mostrarConfirmarCompletar ||
      this.mostrarConfirmarNoAsistio ||
      this.mostrarAtajos;
    if (hayModal) return;

    const k = event.key.toLowerCase();

    // ? o / → abrir panel de atajos
    if (event.key === '?' || event.key === '/') {
      event.preventDefault();
      this.mostrarAtajos = !this.mostrarAtajos;
      return;
    }

    // N → nueva cita (solo si no hay urgentes pendientes)
    if (k === 'n') {
      event.preventDefault();
      if (this.numPorCompletar === 0) this.abrirNuevaCita();
      return;
    }

    // T → ir a hoy (solo en calendario)
    if (k === 't' && this.vista === 'calendario') {
      event.preventDefault();
      this.irHoy();
      return;
    }

    // L → vista lista
    if (k === 'l') {
      event.preventDefault();
      this.vista = 'lista';
      return;
    }

    // C → vista calendario
    if (k === 'c') {
      event.preventDefault();
      this.vista = 'calendario';
      return;
    }

    // H → vista historial
    if (k === 'h') {
      event.preventDefault();
      this.vista = 'historial';
      return;
    }

    // 1/2/3 → modo del calendario (cambia a calendario si no estás ahí)
    if (k === '1') {
      event.preventDefault();
      this.vista = 'calendario';
      this.modoCalendario = 'mes';
      return;
    }
    if (k === '2') {
      event.preventDefault();
      this.vista = 'calendario';
      this.modoCalendario = 'semana';
      return;
    }
    if (k === '3') {
      event.preventDefault();
      this.vista = 'calendario';
      this.modoCalendario = 'dia';
      return;
    }

    // ← / → navegar en calendario
    if (event.key === 'ArrowLeft' && this.vista === 'calendario') {
      event.preventDefault();
      this.navegarAnterior();
      return;
    }
    if (event.key === 'ArrowRight' && this.vista === 'calendario') {
      event.preventDefault();
      this.navegarSiguiente();
      return;
    }
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
    if (this.citaSeleccionada) return; // 👈 ESTA LÍNEA es crítica
    this.diaSeleccionado = null;
  }

  // ====== Nueva cita (admin) ======
  abrirNuevaCita() {
    if (this.numPorCompletar > 0) return;

    this.nuevaCita = {
      cliente: '',
      correo: '',
      telefono: '',
      fecha: '',
      hora: '',
      duracion: this.configAgenda?.duracionCita || 60,
      tipo: 'consulta',
      servicioId: null,
      servicio: '',
      notas: '',
      estado: 'confirmada', // 👈 NUEVO
    };
    this.errorEmpalme = '';
    this.advertenciaFecha = '';
    this.mostrarNuevaCita = true;
  }

  cerrarNuevaCita() {
    this.mostrarNuevaCita = false;
  }

  guardarNuevaCita() {
    if (!this.nuevaCitaValida) return;

    // 🚫 Bloquear si hay citas urgentes sin resolver
    if (this.numPorCompletar > 0) {
      this.errorEmpalme = `Tienes ${this.numPorCompletar} cita${this.numPorCompletar > 1 ? 's' : ''} sin marcar. Resuélvelas antes de crear una nueva.`;
      this.cdr.detectChanges();
      return;
    }

    // 🗓️ Validar fecha (pasada, día laboral, feriado, límite diario)
    const errorFecha = this.validarFecha(this.nuevaCita.fecha);
    if (errorFecha) {
      this.advertenciaFecha = errorFecha;
      this.errorEmpalme = '';
      this.cdr.detectChanges();
      return;
    }
    this.advertenciaFecha = '';

    // 🚦 Validar empalme
    const conflicto = this.hayEmpalmeLocal(
      this.nuevaCita.fecha,
      this.nuevaCita.hora,
      this.nuevaCita.duracion,
    );
    if (conflicto) {
      const finCnf = this.calcularHoraFin(conflicto.hora, conflicto.duracion || 60);
      const buffer = this.configAgenda?.tiempoEntreCitas || 0;

      // Detectar si es solapamiento DIRECTO o solo problema de buffer
      const [hN, mN] = this.nuevaCita.hora.split(':').map(Number);
      const inicioNueva = hN * 60 + mN;
      const finNueva = inicioNueva + this.nuevaCita.duracion;
      const [hC, mC] = conflicto.hora.split(':').map(Number);
      const inicioExistente = hC * 60 + mC;
      const finExistente = inicioExistente + (conflicto.duracion || 60);
      const seSolapaDirecto = inicioNueva < finExistente && finNueva > inicioExistente;

      if (seSolapaDirecto) {
        this.errorEmpalme = `Se solapa con la cita de ${conflicto.cliente} (${conflicto.hora} – ${finCnf}). Elige un horario que no la pise.`;
      } else {
        this.errorEmpalme = `Faltan ${buffer} min de descanso entre citas. La cita de ${conflicto.cliente} termina a las ${finCnf}.`;
      }
      this.cdr.detectChanges();
      return;
    }
    this.errorEmpalme = '';

    const payload = {
      nombre: this.nuevaCita.cliente.trim(),
      correo: this.nuevaCita.correo.trim(),
      telefono: this.nuevaCita.telefono.trim(),
      tipo: this.nuevaCita.tipo,
      servicioId: this.nuevaCita.tipo === 'consulta' ? null : this.nuevaCita.servicioId,
      motivo: this.nuevaCita.notas?.trim() || '',
      fecha: this.nuevaCita.fecha,
      hora: this.nuevaCita.hora,
      duracion: this.nuevaCita.duracion,
      estado: this.nuevaCita.estado, // 👈 usa el estado seleccionado
    };
    this.citasService.crear(payload).subscribe({
      next: (creada) => {
        this.citas.update((arr) => [this.mapearCita(creada), ...arr]);
        this.cerrarNuevaCita();
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          'No se pudo guardar la cita. Revisa los campos e intenta de nuevo.';
        this.errorEmpalme = msg;
        this.cdr.detectChanges();
      },
    });
  }

  private calcularHoraFin(horaInicio: string, duracion: number): string {
    const [h, m] = horaInicio.split(':').map(Number);
    const total = h * 60 + m + duracion;
    const hF = Math.floor(total / 60);
    const mF = total % 60;
    return `${String(hF).padStart(2, '0')}:${String(mF).padStart(2, '0')}`;
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

  private aplicarParamsDeUrl() {
    const params = this.route.snapshot.queryParamMap;

    // Cambiar vista (lista / calendario)
    const vista = params.get('vista');
    if (vista === 'lista' || vista === 'calendario') {
      this.vista = vista;
    }

    // Cambiar modo del calendario (mes / semana / dia)
    const modo = params.get('modo');
    if (modo === 'mes' || modo === 'semana' || modo === 'dia') {
      this.modoCalendario = modo as any;
      // Si se pidió vista diaria, asegurar que se vea hoy
      if (modo === 'dia' && typeof this.irHoy === 'function') {
        this.irHoy();
      }
    }

    // Aplicar filtro de estado
    const estado = params.get('estado');
    if (estado && ['todas', 'pendiente', 'confirmada', 'cancelada'].includes(estado)) {
      this.filtroEstado = estado as any;
    }

    // Acciones especiales
    const accion = params.get('accion');
    if (accion === 'nueva') {
      setTimeout(() => {
        this.abrirNuevaCita();
        this.cdr.detectChanges(); // 👈 fuerza CD
      }, 400); // aumentado de 200 a 400
    } else if (accion === 'historial') {
      this.vista = 'historial';
    }

    //this.cdr.markForCheck();
  }

  // ====== Avatares con iniciales ======
  iniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  estiloAvatar(nombre: string): string {
    const gradientes = [
      'linear-gradient(135deg, #60a5fa, #2563eb)',
      'linear-gradient(135deg, #a78bfa, #7c3aed)',
      'linear-gradient(135deg, #f472b6, #db2777)',
      'linear-gradient(135deg, #fb923c, #ea580c)',
      'linear-gradient(135deg, #2dd4bf, #0d9488)',
      'linear-gradient(135deg, #818cf8, #4f46e5)',
      'linear-gradient(135deg, #34d399, #059669)',
      'linear-gradient(135deg, #fb7185, #e11d48)',
    ];
    let hash = 0;
    for (let i = 0; i < (nombre || '').length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradientes[Math.abs(hash) % gradientes.length];
  }

  // ====== Urgencia / proximidad ======
  esCitaUrgente(cita: Cita): boolean {
    // Pendiente que es hoy o mañana → necesita confirmación pronto
    if (cita.estado !== 'pendiente') return false;
    const hoy = this.fechaHoy();
    const f = new Date(cita.fecha);
    f.setHours(0, 0, 0, 0);
    const diffDias = (f.getTime() - hoy.getTime()) / 86400000;
    return diffDias >= 0 && diffDias <= 1;
  }

  esCitaProxima(cita: Cita): boolean {
    // Confirmada y faltan <60 minutos
    if (cita.estado !== 'confirmada') return false;
    const ahora = new Date();
    const f = new Date(cita.fecha);
    const [h, m] = (cita.hora || '00:00').split(':').map(Number);
    f.setHours(h, m, 0, 0);
    const diffMin = (f.getTime() - ahora.getTime()) / 60000;
    return diffMin > 0 && diffMin <= 60;
  }
  puedeCompletar(cita: Cita): boolean {
    // Solo confirmadas cuya hora de fin ya pasó
    if (cita.estado !== 'confirmada') return false;
    const ahora = new Date();
    const fechaFin = new Date(cita.fecha);
    const [h, m] = (cita.hora || '00:00').split(':').map(Number);
    fechaFin.setHours(h, m, 0, 0);
    fechaFin.setMinutes(fechaFin.getMinutes() + (cita.duracion || 60));
    return ahora.getTime() > fechaFin.getTime();
  }

  minutosHastaCita(cita: Cita): number {
    const ahora = new Date();
    const f = new Date(cita.fecha);
    const [h, m] = (cita.hora || '00:00').split(':').map(Number);
    f.setHours(h, m, 0, 0);
    return Math.round((f.getTime() - ahora.getTime()) / 60000);
  }

  trackByCitaId = (_: number, c: Cita) => c.id;
  trackByGrupoKey = (_: number, g: GrupoCitas) => g.key;

  // ====== Completar cita ======
  mostrarConfirmarCompletar = false;
  citaACompletar: Cita | null = null;

  solicitarCompletarCita(cita: Cita, event?: Event) {
    if (event) event.stopPropagation();
    this.citaACompletar = cita;
    this.mostrarConfirmarCompletar = true;
  }

  aceptarCompletar() {
    if (this.citaACompletar) this.completarCita(this.citaACompletar);
    this.cerrarConfirmarCompletar();
  }

  cerrarConfirmarCompletar() {
    this.mostrarConfirmarCompletar = false;
    this.citaACompletar = null;
  }

  completarCita(cita: Cita) {
    this.citasService.cambiarEstado(cita.id, 'completada').subscribe({
      next: () => {
        cita.estado = 'completada';
        if (this.citaSeleccionada?.id === cita.id) {
          this.citaSeleccionada = { ...cita };
        }
        this.menuAbiertoId = null;
        this.refrescarVistas();
      },
      error: () => alert('No se pudo marcar como completada. Intenta de nuevo.'),
    });
  }

  /**
   * Verifica si una cita propuesta choca con otra existente (frontend).
   * Solo para UX inmediata — el backend valida como fuente de verdad.
   */
  private hayEmpalmeLocal(
    fecha: string,
    hora: string,
    duracion: number,
    idIgnorar?: number,
  ): Cita | null {
    if (!fecha || !hora) return null;
    const buffer: number = this.configAgenda?.tiempoEntreCitas ?? 0;

    const [hN, mN] = hora.split(':').map(Number);
    const inicioNueva = hN * 60 + mN;
    const finNueva = inicioNueva + duracion;

    const fechaCita = new Date(fecha + 'T00:00:00');

    for (const c of this.citas()) {
      if (idIgnorar && c.id === idIgnorar) continue;
      if (c.estado === 'cancelada') continue;

      const fc = new Date(c.fecha);
      fc.setHours(0, 0, 0, 0);
      if (fc.getTime() !== fechaCita.getTime()) continue;

      const [hC, mC] = c.hora.split(':').map(Number);
      const inicioExistente = hC * 60 + mC;
      const finExistente = inicioExistente + (c.duracion || 60);

      if (inicioNueva - buffer < finExistente && finNueva + buffer > inicioExistente) {
        return c;
      }
    }
    return null;
  }

  /**
   * Valida si una fecha es válida según config (días laborales + feriados).
   * Devuelve mensaje vacío si es válida, o el motivo si no.
   */
  validarFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00');

    // 🔒 NUEVO: No permitir fechas pasadas
    const hoy = this.fechaHoy();
    if (d.getTime() < hoy.getTime()) {
      return `No puedes agendar citas en fechas pasadas. Elige hoy o un día futuro.`;
    }

    // Validar día de la semana
    const idx = d.getDay();
    const mapDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const nombreDia = mapDias[idx];
    const diaConfig = this.configAgenda?.diasSemana?.find((ds: any) => ds.nombre === nombreDia);
    if (diaConfig && !diaConfig.activo) {
      return `${nombreDia} no es día laboral. Cambia la fecha o ajusta tus días en Configuración → Agenda.`;
    }

    // Validar feriado (con soporte de recurrentes)
    const feriado = this.configAgenda?.diasFeriados?.find((f: any) => {
      if (f.recurrente) {
        // Comparar solo mes-día (MM-DD), ignorar el año
        return f.fecha?.substring(5) === fecha?.substring(5);
      }
      return f.fecha === fecha;
    });
    if (feriado) {
      const sufijo = feriado.recurrente ? ' (cada año)' : '';
      return `📅 ${feriado.motivo}${sufijo}. Si necesitas atender ese día, quita el feriado en Configuración → Agenda.`;
    }

    // 🔒 NUEVO: validar límite diario
    const limite = this.configAgenda?.limiteDiario || 0;
    if (limite > 0) {
      const numCitas = this.numCitasDelDia(fecha);
      if (numCitas >= limite) {
        return `Ya hay ${numCitas} citas ese día (límite: ${limite}). Elige otra fecha o ajusta el límite en Configuración → Agenda.`;
      }
    }

    return '';
  }

  // 👇 ESTE MÉTODO TIENE QUE ESTAR DENTRO DE LA CLASE
  private cargarConfig() {
    this.configuracionService.obtenerCompleta().subscribe({
      next: (c) => {
        if (c.agenda) {
          this.configAgenda = c.agenda;
          if (this.nuevaCita.duracion === 60 && c.agenda.duracionCita) {
            this.nuevaCita.duracion = c.agenda.duracionCita;
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Cita confirmada cuya hora fin + grace period ya pasó.
   * Debe completarse YA o se pierde el registro.
   */
  requiereCompletarUrgente(cita: Cita): boolean {
    if (cita.estado !== 'confirmada') return false;
    const grace = this.configAgenda?.tiempoEntreCitas ?? 0;
    const ahora = new Date();
    const fechaFin = new Date(cita.fecha);
    const [h, m] = (cita.hora || '00:00').split(':').map(Number);
    fechaFin.setHours(h, m, 0, 0);
    fechaFin.setMinutes(fechaFin.getMinutes() + (cita.duracion || 60) + grace);
    return ahora.getTime() > fechaFin.getTime();
  }

  /** Tiempo legible desde que terminó la cita */
  tiempoDesdeTermino(cita: Cita): string {
    const ahora = new Date();
    const fechaFin = new Date(cita.fecha);
    const [h, m] = (cita.hora || '00:00').split(':').map(Number);
    fechaFin.setHours(h, m, 0, 0);
    fechaFin.setMinutes(fechaFin.getMinutes() + (cita.duracion || 60));
    const diffMin = Math.round((ahora.getTime() - fechaFin.getTime()) / 60000);

    if (diffMin < 60) return `Terminó hace ${diffMin} min`;
    if (diffMin < 1440) {
      const horas = Math.round(diffMin / 60);
      return `Terminó hace ${horas} h`;
    }
    const dias = Math.round(diffMin / 1440);
    return `Terminó hace ${dias} día${dias > 1 ? 's' : ''}`;
  }

  get citasPorCompletar(): Cita[] {
    return this.citas().filter((c) => this.requiereCompletarUrgente(c));
  }
  /** Pendientes cuya fecha es hoy/mañana o ya pasó SIN confirmar */
  get citasPorConfirmar(): Cita[] {
    const hoy = this.fechaHoy();
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 1); // hoy + mañana

    return this.citas().filter((c) => {
      if (c.estado !== 'pendiente') return false;
      const fechaCita = new Date(c.fecha);
      fechaCita.setHours(0, 0, 0, 0);
      return fechaCita.getTime() <= limite.getTime();
    });
  }

  get numPorConfirmar(): number {
    return this.citasPorConfirmar.length;
  }

  get numPorCompletar(): number {
    return this.citasPorCompletar.length;
  }

  // ====== Marcar no asistió ======
  mostrarConfirmarNoAsistio = false;
  citaANoAsistio: Cita | null = null;

  solicitarNoAsistioCita(cita: Cita, event?: Event) {
    if (event) event.stopPropagation();
    this.citaANoAsistio = cita;
    this.mostrarConfirmarNoAsistio = true;
  }

  aceptarNoAsistio() {
    if (this.citaANoAsistio) this.marcarNoAsistio(this.citaANoAsistio);
    this.cerrarConfirmarNoAsistio();
  }

  cerrarConfirmarNoAsistio() {
    this.mostrarConfirmarNoAsistio = false;
    this.citaANoAsistio = null;
  }

  marcarNoAsistio(cita: Cita) {
    this.citasService.cambiarEstado(cita.id, 'no_asistio').subscribe({
      next: () => {
        cita.estado = 'no_asistio';
        if (this.citaSeleccionada?.id === cita.id) {
          this.citaSeleccionada = { ...cita };
        }
        this.menuAbiertoId = null;
        this.refrescarVistas();
      },
      error: () => alert('No se pudo marcar como no asistió. Intenta de nuevo.'),
    });
  }

  /** Cuenta citas activas (no canceladas) en una fecha */
  numCitasDelDia(fecha: string): number {
    if (!fecha) return 0;
    const f = new Date(fecha + 'T00:00:00');
    f.setHours(0, 0, 0, 0);
    return this.citas().filter((c) => {
      const fc = new Date(c.fecha);
      fc.setHours(0, 0, 0, 0);
      return fc.getTime() === f.getTime() && c.estado !== 'cancelada';
    }).length;
  }

  /** Fecha de hoy en formato YYYY-MM-DD (para input type=date) */
  get hoyISO(): string {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  /** Solo los días del mes actual que tienen al menos 1 cita (para vista móvil) */
  get diasConCitasDelMes(): DiaCalendario[] {
    return this.diasMes.filter((d) => d.esMesActual && d.citas.length > 0);
  }

  // ====== Acciones rápidas en el modal de detalle ======

  /** URL de WhatsApp con mensaje pre-llenado */
  get whatsappUrl(): string {
    if (!this.citaSeleccionada?.telefono) return '';
    const tel = this.citaSeleccionada.telefono.replace(/\D/g, '');
    // Si son 10 dígitos, asumir México (lada 52)
    const numero = tel.length === 10 ? `52${tel}` : tel;
    const nombre = this.citaSeleccionada.cliente.split(' ')[0];
    const fechaStr = this.citaSeleccionada.fecha.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const mensaje = encodeURIComponent(
      `Hola ${nombre}, te escribo de Vortiz Arquitectos sobre tu cita del ${fechaStr} a las ${this.citaSeleccionada.hora}.`,
    );
    return `https://wa.me/${numero}?text=${mensaje}`;
  }

  /** URL para llamar */
  get telefonoUrl(): string {
    if (!this.citaSeleccionada?.telefono) return '';
    return `tel:${this.citaSeleccionada.telefono.replace(/\s/g, '')}`;
  }

  /** URL para email con subject pre-llenado */
  get emailUrl(): string {
    if (!this.citaSeleccionada?.correo) return '';
    const subject = encodeURIComponent(`Tu cita en Vortiz Arquitectos`);
    const fechaStr = this.citaSeleccionada!.fecha.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
    });
    const body = encodeURIComponent(
      `Hola ${this.citaSeleccionada!.cliente.split(' ')[0]},\n\nTe escribo respecto a tu cita del ${fechaStr} a las ${this.citaSeleccionada!.hora}.\n\nSaludos,\nVortiz Arquitectos`,
    );
    return `mailto:${this.citaSeleccionada.correo}?subject=${subject}&body=${body}`;
  }

  /** Otras citas del mismo cliente (por email o teléfono) */
  /** Normaliza un string para comparación: lowercase, sin acentos, sin espacios extras */
  private normalizar(s: string | null | undefined): string {
    if (!s) return '';
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Otras citas del mismo cliente (match estricto por nombre Y correo) */
  get otrasCitasDelCliente(): Cita[] {
    if (!this.citaSeleccionada) return [];
    const actual = this.citaSeleccionada;
    const nombreActual = this.normalizar(actual.cliente);
    const correoActual = this.normalizar(actual.correo);

    // Si falta alguno, no podemos relacionar con certeza
    if (!nombreActual || !correoActual) return [];

    return this.citas()
      .filter((c) => {
        if (c.id === actual.id) return false;
        return (
          this.normalizar(c.cliente) === nombreActual && this.normalizar(c.correo) === correoActual
        );
      })
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
      .slice(0, 4);
  }

  /** Label largo del estado para mostrar en modal */
  estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      confirmada: 'Confirmada',
      pendiente: 'Pendiente',
      cancelada: 'Cancelada',
      completada: 'Completada',
      no_asistio: 'No asistió',
    };
    return map[estado] || estado;
  }

  /** Color de fondo del badge según estado (para historial dentro del modal) */
  estadoBadgeClass(estado: string): string {
    const map: Record<string, string> = {
      confirmada: 'bg-green-100 text-green-700',
      pendiente: 'bg-orange-100 text-orange-700',
      cancelada: 'bg-red-100 text-red-700',
      completada: 'bg-gray-100 text-gray-700',
      no_asistio: 'bg-amber-100 text-amber-700',
    };
    return map[estado] || 'bg-gray-100 text-gray-700';
  }
  /** Clases para mini-pills del calendario (mes mobile/desktop) — bg fuerte + texto */
  clasesPillCita(cita: Cita) {
    const e = cita.estado;
    return {
      'bg-green-100 text-green-700': e === 'confirmada',
      'bg-orange-100 text-orange-700': e === 'pendiente',
      'bg-red-100 text-red-700': e === 'cancelada',
      'bg-blue-100 text-blue-700': e === 'completada',
      'bg-amber-100 text-amber-700': e === 'no_asistio',
    };
  }

  /** Clases para banners del calendario (semana/día) — bg suave + border lateral */
  clasesBannerCita(cita: Cita) {
    const e = cita.estado;
    return {
      'bg-green-50 border-green-500': e === 'confirmada',
      'bg-orange-50 border-orange-500': e === 'pendiente',
      'bg-red-50 border-red-500': e === 'cancelada',
      'bg-blue-50 border-blue-500': e === 'completada',
      'bg-amber-50 border-amber-500': e === 'no_asistio',
    };
  }

  /** Clases solo de texto (para títulos dentro de los banners) */
  claseTextoCita(cita: Cita) {
    const e = cita.estado;
    return {
      'text-green-700': e === 'confirmada',
      'text-orange-700': e === 'pendiente',
      'text-red-700': e === 'cancelada',
      'text-blue-700': e === 'completada',
      'text-amber-700': e === 'no_asistio',
    };
  }

  reagendarCita(cita: Cita) {
    this.nuevaCita = {
      cliente: cita.cliente,
      correo: cita.correo ?? '',
      telefono: cita.telefono ?? '',
      fecha: '',
      hora: '',
      duracion: cita.duracion || this.configAgenda?.duracionCita || 60,
      tipo: cita.tipo,
      servicioId: cita.servicioId ?? null,
      servicio: cita.servicio ?? '',
      notas: cita.notas ?? '',
      estado: 'confirmada' as EstadoCita, // 👈 AGREGAR ESTO
    };

    this.errorEmpalme = '';
    this.advertenciaFecha = '';
    this.cerrarDetalle();
    this.mostrarNuevaCita = true;
    this.cdr.detectChanges();
  }
  /**
   * Refresca todas las vistas donde puede aparecer una cita:
   * lista principal (signal) y modal del día (si está abierto).
   */
  private refrescarVistas() {
    // Refrescar lista principal (signal)
    this.citas.update((arr) => [...arr]);

    // Refrescar modal del día si está abierto
    if (this.diaSeleccionado) {
      this.diaSeleccionado = {
        ...this.diaSeleccionado,
        citas: [...this.diaSeleccionado.citas],
      };
    }

    this.cdr.detectChanges();
  }
  cerrarDiaSeguro() {
    if (this.citaSeleccionada) return; // Hay detalle abierto, no cerrar el día
    this.cerrarDia();
  }

  // ====== HISTORIAL MEJORADO ======

  /** Filtro del historial */
  filtroHistorial = signal<'todas' | 'completada' | 'cancelada' | 'no_asistio' | 'pasada'>('todas');

  cambiarFiltroHistorial(filtro: 'todas' | 'completada' | 'cancelada' | 'no_asistio' | 'pasada') {
    this.filtroHistorial.set(filtro);
  }

  /** Una cita está "archivada" si: canceladas/completadas/no_asistio O fecha pasada */
  esCitaArchivada(cita: Cita): boolean {
    return (
      this.esCitaPasada(cita) ||
      cita.estado === 'cancelada' ||
      cita.estado === 'completada' ||
      cita.estado === 'no_asistio'
    );
  }

  /** Todas las citas del historial (sin filtros aplicados) */
  get citasHistorial(): Cita[] {
    return this.citas().filter((c) => this.esCitaArchivada(c));
  }

  /** Stats del historial */
  get statsHistorial() {
    const h = this.citasHistorial;
    return {
      total: h.length,
      completadas: h.filter((c) => c.estado === 'completada').length,
      canceladas: h.filter((c) => c.estado === 'cancelada').length,
      noAsistio: h.filter((c) => c.estado === 'no_asistio').length,
      pasadas: h.filter(
        (c) => this.esCitaPasada(c) && (c.estado === 'confirmada' || c.estado === 'pendiente'),
      ).length,
    };
  }

  /** Citas del historial filtradas por búsqueda y filtro */
  get citasHistorialFiltradas(): Cita[] {
    let resultado = this.citasHistorial;

    // Filtro por tipo
    const filtro = this.filtroHistorial();
    if (filtro !== 'todas') {
      if (filtro === 'pasada') {
        resultado = resultado.filter(
          (c) => this.esCitaPasada(c) && (c.estado === 'confirmada' || c.estado === 'pendiente'),
        );
      } else {
        resultado = resultado.filter((c) => c.estado === filtro);
      }
    }

    // Búsqueda
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      resultado = resultado.filter(
        (c) =>
          c.cliente.toLowerCase().includes(q) ||
          c.servicio?.toLowerCase().includes(q) ||
          c.correo?.toLowerCase().includes(q) ||
          c.telefono?.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
          c.notas?.toLowerCase().includes(q),
      );
    }

    // Más recientes primero
    return resultado.sort(
      (a, b) => b.fecha.getTime() - a.fecha.getTime() || b.hora.localeCompare(a.hora),
    );
  }

  /** Citas del historial agrupadas por mes-año */
  get citasHistorialPorMes(): { mesAnio: string; citas: Cita[] }[] {
    const grupos = new Map<string, Cita[]>();

    for (const cita of this.citasHistorialFiltradas) {
      const mes = this.meses[cita.fecha.getMonth()];
      const anio = cita.fecha.getFullYear();
      const key = `${mes} ${anio}`;

      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(cita);
    }

    return Array.from(grupos.entries()).map(([mesAnio, citas]) => ({ mesAnio, citas }));
  }

  /** Fecha relativa corta */
  fechaRelativaCorta(fecha: Date): string {
    const hoy = this.fechaHoy();
    const f = new Date(fecha);
    f.setHours(0, 0, 0, 0);
    const diffDias = Math.floor((hoy.getTime() - f.getTime()) / 86400000);

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias === -1) return 'Mañana';
    if (diffDias > 1 && diffDias < 7) return `Hace ${diffDias} días`;
    if (diffDias < -1 && diffDias > -7) return `En ${-diffDias} días`;
    if (diffDias >= 7 && diffDias < 14) return 'Hace 1 sem';
    if (diffDias >= 14 && diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} sem`;

    const mesesCortos = [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ];
    return `${f.getDate()} ${mesesCortos[f.getMonth()]}`;
  }

  trackByGrupoMes = (_: number, g: { mesAnio: string; citas: Cita[] }) => g.mesAnio;

  /** Lleva al admin a la lista de urgentes (scroll + cambio de vista) */
  verUrgentes() {
    if (this.numPorCompletar === 0) return;
    this.vista = 'lista';
    // Esperar render del DOM antes de hacer scroll
    setTimeout(() => {
      const el = document.getElementById('grupo-urgentes');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  }

  mostrarConfirmarCompletarTodas = false;
  procesandoCompletarTodas = false;

  solicitarCompletarTodas() {
    if (this.numPorCompletar === 0) return;
    this.mostrarConfirmarCompletarTodas = true;
  }

  cerrarConfirmarCompletarTodas() {
    if (this.procesandoCompletarTodas) return; // No cerrar mientras procesa
    this.mostrarConfirmarCompletarTodas = false;
  }

  aceptarCompletarTodas() {
    const urgentes = this.citasPorCompletar;
    if (urgentes.length === 0) {
      this.cerrarConfirmarCompletarTodas();
      return;
    }

    this.procesandoCompletarTodas = true;
    let completadas = 0;
    const total = urgentes.length;

    const finalizar = () => {
      completadas++;
      if (completadas === total) {
        this.procesandoCompletarTodas = false;
        this.mostrarConfirmarCompletarTodas = false;
        this.cargarCitas();
      }
    };

    urgentes.forEach((c) => {
      this.citasService.cambiarEstado(c.id, 'completada').subscribe({
        next: finalizar,
        error: finalizar,
      });
    });
  }

  /** Duplica una cita: copia cliente + tipo + servicio, deja fecha/hora/motivo vacíos */
  duplicarCita(cita: Cita, event?: Event) {
    if (event) event.stopPropagation();

    this.nuevaCita = {
      cliente: cita.cliente,
      correo: cita.correo ?? '',
      telefono: cita.telefono ?? '',
      fecha: '',
      hora: '',
      duracion: cita.duracion || this.configAgenda?.duracionCita || 60,
      tipo: cita.tipo,
      servicioId: cita.servicioId ?? null,
      servicio: cita.servicio ?? '',
      notas: '', // ← vacío para nuevo motivo
      estado: 'confirmada' as EstadoCita,
    };

    this.errorEmpalme = '';
    this.advertenciaFecha = '';
    this.menuAbiertoId = null;
    this.cerrarDetalle();
    this.mostrarNuevaCita = true;
    this.cdr.detectChanges();
  }

  /** Wrapper público para usar desde el template */
  cargarSlotsAdminFecha(fecha: string) {
    this.cargarSlotsAdmin(fecha);
  }
}
