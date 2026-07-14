import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  OnDestroy,
  signal,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import {
  HistorialReportesService,
  ReporteHistorial,
} from '../../../core/services/historial-reportes.service';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import { ActivatedRoute, Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; // ← Agregar si no está

type OrdenTipo = 'reciente' | 'antiguo' | 'pesado' | 'ligero' | 'tipo';

@Component({
  selector: 'app-historial-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial-reportes.component.html',
})
export class HistorialReportesComponent implements OnInit, OnDestroy {
  private historialService = inject(HistorialReportesService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('inputBusqueda') inputBusqueda?: ElementRef<HTMLInputElement>;

  reportes = signal<ReporteHistorial[]>([]);
  cargando = signal(true);
  filtroTipo = signal('');
  busqueda = signal('');
  orden = signal<OrdenTipo>('reciente');

  fechaDesde = signal('');
  fechaHasta = signal('');

  paginaActual = signal(1);
  itemsPorPagina = signal(10);

  seleccionados = signal<Set<number>>(new Set());
  modoSeleccion = computed(() => this.seleccionados().size > 0);

  modalReenviarAbierto = signal(false);
  reporteSeleccionado = signal<ReporteHistorial | null>(null);
  destinatariosReenvio = signal('');
  reenviandoEmail = signal(false);
  resultadoReenvio = signal<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  modalEliminarAbierto = signal(false);
  reporteAEliminar = signal<ReporteHistorial | null>(null);
  eliminandoReporte = signal(false);

  modalEliminarMultipleAbierto = signal(false);
  eliminandoMultiples = signal(false);

  // Modal Preview PDF
  modalPreviewAbierto = signal(false);
  reporteEnPreview = signal<ReporteHistorial | null>(null);
  urlPreview = signal<string>(''); // el blob URL crudo (para revocar)
  urlPreviewSegura = signal<SafeResourceUrl | null>(null); // 👈 NUEVO: URL sanitizada para el iframe
  cargandoPreview = signal(false);
  errorPreview = signal('');

  private sanitizer = inject(DomSanitizer); // 👈 NUEVO
  esMovil = signal(false);

  tiposDisponibles = [
    { value: '', label: 'Todos los tipos', color: 'gray' },
    { value: 'citas-por-mes', label: 'Citas por mes', color: 'blue' },
    { value: 'categorias-servicios', label: 'Categorías de servicios', color: 'purple' },
    { value: 'actividad-semanal', label: 'Actividad semanal', color: 'emerald' },
    { value: 'clientes-nuevos', label: 'Clientes nuevos', color: 'orange' },
    { value: 'visitas', label: 'Visitas al sitio', color: 'fuchsia' },
  ];

  ordenesDisponibles = [
    { value: 'reciente' as OrdenTipo, label: 'Más reciente primero' },
    { value: 'antiguo' as OrdenTipo, label: 'Más antiguo primero' },
    { value: 'pesado' as OrdenTipo, label: 'Más pesado primero' },
    { value: 'ligero' as OrdenTipo, label: 'Más ligero primero' },
    { value: 'tipo' as OrdenTipo, label: 'Por tipo' },
  ];

  opcionesItemsPorPagina = [10, 25, 50, 100];

  // ============ COMPUTEDS ============

  reportesFiltradosSinPaginar = computed(() => {
    const todos = this.reportes();
    const tipo = this.filtroTipo();
    const search = this.busqueda().toLowerCase().trim();
    const orden = this.orden();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();

    let resultado = todos.filter((r) => {
      if (tipo && r.tipo !== tipo) return false;
      if (search && !r.titulo.toLowerCase().includes(search)) return false;
      if (desde) {
        const fechaR = new Date(r.createdAt);
        const fechaDesde = new Date(desde + 'T00:00:00');
        if (fechaR < fechaDesde) return false;
      }
      if (hasta) {
        const fechaR = new Date(r.createdAt);
        const fechaHasta = new Date(hasta + 'T23:59:59');
        if (fechaR > fechaHasta) return false;
      }
      return true;
    });

    resultado = [...resultado].sort((a, b) => {
      if (orden === 'reciente')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (orden === 'antiguo')
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (orden === 'pesado') return (b.tamanioKb || 0) - (a.tamanioKb || 0);
      if (orden === 'ligero') return (a.tamanioKb || 0) - (b.tamanioKb || 0);
      if (orden === 'tipo') return a.tipo.localeCompare(b.tipo);
      return 0;
    });

    return resultado;
  });

  reportesFiltrados = computed(() => {
    const todos = this.reportesFiltradosSinPaginar();
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
    const fin = inicio + this.itemsPorPagina();
    return todos.slice(inicio, fin);
  });

  totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.reportesFiltradosSinPaginar().length / this.itemsPorPagina())),
  );

  paginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const paginas: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) paginas.push(i);
    } else {
      paginas.push(1);
      if (actual > 3) paginas.push('...');
      const inicio = Math.max(2, actual - 1);
      const fin = Math.min(total - 1, actual + 1);
      for (let i = inicio; i <= fin; i++) paginas.push(i);
      if (actual < total - 2) paginas.push('...');
      paginas.push(total);
    }
    return paginas;
  });

  rangoVisible = computed(() => {
    const total = this.reportesFiltradosSinPaginar().length;
    if (total === 0) return { inicio: 0, fin: 0, total: 0 };
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina() + 1;
    const fin = Math.min(inicio + this.itemsPorPagina() - 1, total);
    return { inicio, fin, total };
  });

  totalReportes = computed(() => this.reportes().length);

  reportesEsteMes = computed(() => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return this.reportes().filter((r) => new Date(r.createdAt) >= inicioMes).length;
  });

  tamanioTotalKb = computed(() => this.reportes().reduce((acc, r) => acc + (r.tamanioKb || 0), 0));

  tamanioTotalFormateado = computed(() => {
    const kb = this.tamanioTotalKb();
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  });

  totalEnviadosPorEmail = computed(() => this.reportes().filter((r) => r.emailEnviado).length);

  destinatariosValidos = computed(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.destinatariosReenvio()
      .split(',')
      .map((d) => d.trim())
      .filter((d) => emailRegex.test(d));
  });

  hayFiltrosActivos = computed(
    () =>
      !!this.filtroTipo() || !!this.busqueda().trim() || !!this.fechaDesde() || !!this.fechaHasta(),
  );

  todosVisiblesSeleccionados = computed(() => {
    const visibles = this.reportesFiltrados();
    if (visibles.length === 0) return false;
    return visibles.every((r) => this.seleccionados().has(r.id));
  });

  algunoVisibleSeleccionado = computed(() => {
    const visibles = this.reportesFiltrados();
    return visibles.some((r) => this.seleccionados().has(r.id));
  });

  // ============ LIFECYCLE ============

  ngOnInit() {
    this.esMovil.set(this.detectarMovil());
    this.cargar();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.aplicarParamsDeUrl());
    this.aplicarParamsDeUrl();
  }

  ngOnDestroy() {
    const url = this.urlPreview();
    if (url) window.URL.revokeObjectURL(url);
    this.urlPreviewSegura.set(null); // 👈 AGREGAR
  }

  cargar() {
    this.cargando.set(true);
    this.historialService.listar().subscribe({
      next: (data) => {
        this.reportes.set(data);
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando historial:', err);
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  // ============ PAGINACIÓN ============

  irAPagina(p: number | '...') {
    if (p === '...') return;
    const pagina = Math.max(1, Math.min(p, this.totalPaginas()));
    this.paginaActual.set(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cambiarItemsPorPagina(n: number) {
    this.itemsPorPagina.set(n);
    this.paginaActual.set(1);
  }

  // ============ SELECCIÓN MÚLTIPLE ============

  toggleSeleccion(id: number) {
    const nuevo = new Set(this.seleccionados());
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    this.seleccionados.set(nuevo);
  }

  toggleSeleccionarTodosVisibles() {
    const visibles = this.reportesFiltrados();
    const nuevo = new Set(this.seleccionados());
    if (this.todosVisiblesSeleccionados()) {
      visibles.forEach((r) => nuevo.delete(r.id));
    } else {
      visibles.forEach((r) => nuevo.add(r.id));
    }
    this.seleccionados.set(nuevo);
  }

  limpiarSeleccion() {
    this.seleccionados.set(new Set());
  }

  // ============ ACCIONES ============

  async descargar(reporte: ReporteHistorial) {
    try {
      const blob = await firstValueFrom(this.historialService.descargar(reporte.id));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `vortiz-${reporte.tipo}-${reporte.rangoDesde}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error descargando:', err);
    }
  }

  limpiarFiltros() {
    this.filtroTipo.set('');
    this.busqueda.set('');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.paginaActual.set(1);
  }

  abrirReenviar(reporte: ReporteHistorial) {
    this.reporteSeleccionado.set(reporte);
    this.destinatariosReenvio.set(reporte.destinatarios?.join(', ') || '');
    this.resultadoReenvio.set(null);
    this.modalReenviarAbierto.set(true);
  }

  cerrarReenviar() {
    this.modalReenviarAbierto.set(false);
    this.reporteSeleccionado.set(null);
    this.resultadoReenvio.set(null);
    this.destinatariosReenvio.set('');
  }

  async confirmarReenviar() {
    const reporte = this.reporteSeleccionado();
    if (!reporte) return;

    const destinatarios = this.destinatariosValidos();
    if (destinatarios.length === 0) {
      this.resultadoReenvio.set({
        tipo: 'error',
        mensaje: 'Ingresa al menos un correo válido',
      });
      return;
    }

    this.reenviandoEmail.set(true);
    this.resultadoReenvio.set(null);

    try {
      await firstValueFrom(this.historialService.reenviar(reporte.id, destinatarios));
      this.resultadoReenvio.set({
        tipo: 'exito',
        mensaje: `Reenviado a ${destinatarios.length} destinatario(s)`,
      });
      this.cargar();
    } catch (err) {
      console.error(err);
      this.resultadoReenvio.set({
        tipo: 'error',
        mensaje: 'Error al reenviar el reporte',
      });
    } finally {
      this.reenviandoEmail.set(false);
    }
  }

  abrirEliminar(reporte: ReporteHistorial) {
    this.reporteAEliminar.set(reporte);
    this.modalEliminarAbierto.set(true);
  }

  cerrarEliminar() {
    this.modalEliminarAbierto.set(false);
    this.reporteAEliminar.set(null);
  }

  async confirmarEliminar() {
    const reporte = this.reporteAEliminar();
    if (!reporte) return;

    this.eliminandoReporte.set(true);
    try {
      await firstValueFrom(this.historialService.eliminar(reporte.id));
      this.reportes.update((arr) => arr.filter((r) => r.id !== reporte.id));
      const nuevo = new Set(this.seleccionados());
      nuevo.delete(reporte.id);
      this.seleccionados.set(nuevo);
      this.cerrarEliminar();
    } catch (err) {
      console.error(err);
    } finally {
      this.eliminandoReporte.set(false);
    }
  }

  abrirEliminarMultiple() {
    if (this.seleccionados().size === 0) return;
    this.modalEliminarMultipleAbierto.set(true);
  }

  cerrarEliminarMultiple() {
    this.modalEliminarMultipleAbierto.set(false);
  }

  async confirmarEliminarMultiple() {
    const ids = Array.from(this.seleccionados());
    if (ids.length === 0) return;

    this.eliminandoMultiples.set(true);
    try {
      await firstValueFrom(forkJoin(ids.map((id) => this.historialService.eliminar(id))));
      this.reportes.update((arr) => arr.filter((r) => !ids.includes(r.id)));
      this.limpiarSeleccion();
      this.cerrarEliminarMultiple();
    } catch (err) {
      console.error('Error eliminando reportes:', err);
    } finally {
      this.eliminandoMultiples.set(false);
    }
  }

  async descargarMultiples() {
    const ids = Array.from(this.seleccionados());
    if (ids.length === 0) return;
    const reportesADescargar = this.reportes().filter((r) => ids.includes(r.id));
    for (const r of reportesADescargar) {
      await this.descargar(r);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  // ============ PREVIEW PDF ============

  async abrirPreview(reporte: ReporteHistorial) {
    console.log('Abriendo preview de:', reporte.id, reporte.titulo);
    this.reporteEnPreview.set(reporte);
    this.modalPreviewAbierto.set(true);
    this.cargandoPreview.set(true);
    this.errorPreview.set('');
    this.urlPreview.set('');
    this.cdr.markForCheck();

    try {
      const blob = await firstValueFrom(this.historialService.descargar(reporte.id));

      // 🔥 Forzar tipo PDF (Chrome Android es puñetero con blobs sin type explícito)
      const blobPdf = blob.type === 'application/pdf'
        ? blob
        : new Blob([blob], { type: 'application/pdf' });

      const url = window.URL.createObjectURL(blobPdf);
      this.urlPreview.set(url);
      this.urlPreviewSegura.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      this.cargandoPreview.set(false);
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Error cargando preview:', err);
      this.errorPreview.set('No se pudo cargar el PDF');
      this.cargandoPreview.set(false);
      this.cdr.markForCheck();
    }
  }

  cerrarPreview() {
    const url = this.urlPreview();
    if (url) window.URL.revokeObjectURL(url);
    this.modalPreviewAbierto.set(false);
    this.reporteEnPreview.set(null);
    this.urlPreview.set('');
    this.urlPreviewSegura.set(null); // 👈 AGREGAR
    this.errorPreview.set('');
    this.cargandoPreview.set(false);
  }

  async descargarDesdePreview() {
    const r = this.reporteEnPreview();
    if (r) await this.descargar(r);
  }

  reenviarDesdePreview() {
    const r = this.reporteEnPreview();
    if (r) {
      this.cerrarPreview();
      this.abrirReenviar(r);
    }
  }

  // ============ HELPERS ============

  formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  tiempoRelativo(iso: string): string {
    if (!iso) return '—';
    const ahora = Date.now();
    const fecha = new Date(iso).getTime();
    const diffMs = ahora - fecha;
    const min = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMs / 3600000);
    const dias = Math.floor(diffMs / 86400000);

    if (min < 1) return 'Recién';
    if (min < 60) return `Hace ${min}m`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias}d`;
    return new Date(iso).toLocaleDateString('es-MX');
  }

  formatearRango(desde: string, hasta: string): string {
    const formatear = (iso: string) => {
      const [y, m, d] = iso.split('-');
      return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y.slice(-2)}`;
    };
    return `${formatear(desde)} → ${formatear(hasta)}`;
  }

  formatearTamanio(kb: number): string {
    if (!kb) return '—';
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  obtenerTipoLabel(tipo: string): string {
    return this.tiposDisponibles.find((t) => t.value === tipo)?.label || tipo;
  }

  obtenerColorTipo(tipo: string): string {
    const colores: { [key: string]: string } = {
      'citas-por-mes': 'bg-blue-100 text-blue-700',
      'categorias-servicios': 'bg-purple-100 text-purple-700',
      'actividad-semanal': 'bg-emerald-100 text-emerald-700',
      'clientes-nuevos': 'bg-orange-100 text-orange-700',
      visitas: 'bg-fuchsia-100 text-fuchsia-700',
    };
    return colores[tipo] || 'bg-gray-100 text-gray-700';
  }

  @HostListener('document:keydown', ['$event'])
  manejarAtajos(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const enInput =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (event.key === 'Escape') {
      if (this.modalPreviewAbierto()) this.cerrarPreview();
      else if (this.modalReenviarAbierto()) this.cerrarReenviar();
      else if (this.modalEliminarAbierto()) this.cerrarEliminar();
      else if (this.modalEliminarMultipleAbierto()) this.cerrarEliminarMultiple();
      else if (this.modoSeleccion()) this.limpiarSeleccion();
      return;
    }

    // Solo enfocar buscador si NO estamos en un input
    if (event.key === '/' && !enInput) {
      event.preventDefault();
      setTimeout(() => {
        this.inputBusqueda?.nativeElement.focus();
        this.inputBusqueda?.nativeElement.select();
      }, 50);
      return;
    }

    if (enInput) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.toggleSeleccionarTodosVisibles();
    }
  }

  private aplicarParamsDeUrl() {
    const tipo = this.route.snapshot.queryParamMap.get('tipo');
    if (tipo) this.filtroTipo.set(tipo);
  }

  // ====== Dropdowns custom ======
  filtroTipoAbierto = signal(false);
  ordenAbierto = signal(false);

  get filtroTipoActual() {
    return this.tiposDisponibles.find((t) => t.value === this.filtroTipo());
  }

  get ordenActual() {
    return this.ordenesDisponibles.find((o) => o.value === this.orden());
  }

  toggleFiltroTipo(event: Event) {
    event.stopPropagation();
    this.filtroTipoAbierto.update((v) => !v);
    this.ordenAbierto.set(false);
  }

  toggleOrden(event: Event) {
    event.stopPropagation();
    this.ordenAbierto.update((v) => !v);
    this.filtroTipoAbierto.set(false);
  }

  seleccionarFiltroTipo(valor: string) {
    this.filtroTipo.set(valor);
    this.paginaActual.set(1);
    this.filtroTipoAbierto.set(false);
  }

  seleccionarOrden(valor: OrdenTipo) {
    this.orden.set(valor);
    this.ordenAbierto.set(false);
  }

  @HostListener('document:click')
  cerrarDropdowns() {
    this.filtroTipoAbierto.set(false);
    this.ordenAbierto.set(false);
  }

  private detectarMovil(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    return /android|iphone|ipad|ipod|blackberry|iemobile/i.test(ua);
  }

  abrirEnPestanaNueva() {
    const url = this.urlPreview();
    if (url) window.open(url, '_blank');
  }
}
