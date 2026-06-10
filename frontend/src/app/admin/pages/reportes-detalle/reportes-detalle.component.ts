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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DetalleReporte, ReportesService } from '../../../core/services/reportes.service';
import {
  GraficaDashboardComponent,
  PuntoGrafica,
  TipoGrafica,
} from '../../../shared/grafica-dashboard/grafica-dashboard.component';
import {
  RangoSeleccionado,
  SelectorRangoFechaComponent,
} from '../../../shared/selector-rango-fecha/selector-rango-fecha.component';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import { ModalGenerarPdfComponent } from '../../../shared/modal-generar-pdf/modal-generar-pdf.component';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-reportes-detalle',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    GraficaDashboardComponent,
    SelectorRangoFechaComponent,
    SkeletonComponent,
    ModalGenerarPdfComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes-detalle.component.html',
})
export class ReportesDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private reportesService = inject(ReportesService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  tipo = signal<string>('');
  rangoActual = signal<RangoSeleccionado | null>(null);
  cargando = signal(true);
  detalle = signal<DetalleReporte | null>(null);

  titulosPorTipo: Record<string, string> = {
    'citas-por-mes': 'Citas por mes',
    'categorias-servicios': 'Categorías de servicios',
    'actividad-semanal': 'Actividad semanal',
    'clientes-nuevos': 'Clientes nuevos',
  };

  descripcionesPorTipo: Record<string, string> = {
    'citas-por-mes': 'Evolución mensual del volumen de citas agendadas',
    'categorias-servicios': 'Distribución de citas según la categoría del servicio',
    'actividad-semanal': 'Actividad diaria de citas en el período seleccionado',
    'clientes-nuevos': 'Clientes que reservan cita por primera vez (correo único)',
  };

  iconosPorTipo: Record<string, string> = {
    'citas-por-mes':
      'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    'categorias-servicios': 'M19 11H5m14-4l-7-7-7 7m14 8l-7 7-7-7',
    'actividad-semanal': 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    'clientes-nuevos':
      'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  };

  // Computed para datos de la gráfica
  serieGrafica = computed<PuntoGrafica[]>(
    () => this.detalle()?.serie?.map((s) => ({ label: s.label, valor: s.valor })) ?? [],
  );

  tipoGrafica = computed<TipoGrafica>(() => (this.detalle()?.tipoGrafica as TipoGrafica) ?? 'area');

  colorGrafica = computed(() => {
    const mapa: Record<string, string> = {
      'citas-por-mes': '#0a4d7a',
      'categorias-servicios': '#a855f7',
      'actividad-semanal': '#10b981',
      'clientes-nuevos': '#f97316',
    };
    return mapa[this.tipo()] || '#0a4d7a';
  });

  titulo = computed(() => this.titulosPorTipo[this.tipo()] || 'Reporte');
  descripcion = computed(() => this.descripcionesPorTipo[this.tipo()] || 'Análisis detallado');
  iconoPath = computed(() => this.iconosPorTipo[this.tipo()] || '');

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.tipo.set(params.get('tipo') || '');
      // Si ya tenemos rango, recargar con el nuevo tipo
      if (this.rangoActual()) {
        this.cargarDetalle();
      }
    });
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.aplicarParamsDeUrl());

    this.aplicarParamsDeUrl();
  }

  onRangoChange(rango: RangoSeleccionado) {
    this.rangoActual.set(rango);
    this.cargarDetalle();
  }

  private cargarDetalle() {
    const tipo = this.tipo();
    const rango = this.rangoActual();
    if (!tipo || !rango) return;

    this.cargando.set(true);
    this.reportesService.obtenerDetalle(tipo, rango.desde, rango.hasta).subscribe({
      next: (data) => {
        this.detalle.set(data);
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar detalle:', err);
        this.detalle.set(null);
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  // Formatea cambio porcentual con signo y color
  formatearCambio(cambio: number): { texto: string; color: string; flecha: string } {
    const positivo = cambio >= 0;
    return {
      texto: `${positivo ? '+' : ''}${cambio.toFixed(1)}%`,
      color: positivo ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50',
      flecha: positivo ? '↗' : '↘',
    };
  }

  modalPdfAbierto = signal(false);

  abrirModalPdf() {
    this.modalPdfAbierto.set(true);
  }

  cerrarModalPdf() {
    this.modalPdfAbierto.set(false);
  }

  private aplicarParamsDeUrl() {
    const params = this.route.snapshot.queryParamMap;
    const accion = params.get('accion');

    if (accion === 'generar') {
      // Esperar a que el reporte cargue antes de abrir modal
      setTimeout(() => {
        if (!this.cargando() && this.detalle()) {
          this.abrirModalPdf();
          this.cdr.detectChanges();
        }
      }, 800); // 800ms porque el reporte tarda en cargar
    }
  }
}
