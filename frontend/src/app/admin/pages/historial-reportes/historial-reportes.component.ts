import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  HistorialReportesService,
  ReporteHistorial,
} from '../../../core/services/historial-reportes.service';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-historial-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial-reportes.component.html',
})
export class HistorialReportesComponent implements OnInit {
  private historialService = inject(HistorialReportesService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  reportes = signal<ReporteHistorial[]>([]);
  cargando = signal(true);
  filtroTipo = signal('');
  busqueda = signal('');

  // Modal Reenviar
  modalReenviarAbierto = signal(false);
  reporteSeleccionado = signal<ReporteHistorial | null>(null);
  destinatariosReenvio = signal('');
  reenviandoEmail = signal(false);
  resultadoReenvio = signal<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  // Modal Eliminar
  modalEliminarAbierto = signal(false);
  reporteAEliminar = signal<ReporteHistorial | null>(null);
  eliminandoReporte = signal(false);

  tiposDisponibles = [
    { value: '', label: 'Todos los tipos' },
    { value: 'citas-por-mes', label: 'Citas por mes' },
    { value: 'categorias-servicios', label: 'Categorías de servicios' },
    { value: 'actividad-semanal', label: 'Actividad semanal' },
    { value: 'clientes-nuevos', label: 'Clientes nuevos' },
  ];

  reportesFiltrados = computed(() => {
    const todos = this.reportes();
    const tipo = this.filtroTipo();
    const search = this.busqueda().toLowerCase().trim();
    return todos.filter((r) => {
      if (tipo && r.tipo !== tipo) return false;
      if (search && !r.titulo.toLowerCase().includes(search)) return false;
      return true;
    });
  });

  destinatariosValidos = computed(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.destinatariosReenvio()
      .split(',')
      .map((d) => d.trim())
      .filter((d) => emailRegex.test(d));
  });

  ngOnInit() {
    this.cargar();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.aplicarParamsDeUrl());

    this.aplicarParamsDeUrl();
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

  // ============ Reenviar ============
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
        mensaje: `✉️ Reenviado a ${destinatarios.length} destinatario(s)`,
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

  // ============ Eliminar ============
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
      this.cerrarEliminar();
    } catch (err) {
      console.error(err);
    } finally {
      this.eliminandoReporte.set(false);
    }
  }

  // ============ Helpers ============
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

  formatearRango(desde: string, hasta: string): string {
    const formatear = (iso: string) => {
      const [y, m, d] = iso.split('-');
      return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y.slice(-2)}`;
    };
    return `${formatear(desde)} → ${formatear(hasta)}`;
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
    };
    return colores[tipo] || 'bg-gray-100 text-gray-700';
  }
  private aplicarParamsDeUrl() {
    const tipo = this.route.snapshot.queryParamMap.get('tipo');
    if (tipo) {
      this.filtroTipo.set(tipo);
    }
  }
}
