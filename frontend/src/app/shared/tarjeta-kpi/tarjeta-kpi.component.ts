import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { SparklinePoint } from '../../core/services/reportes.service';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-tarjeta-kpi',
  standalone: true,
  imports: [CommonModule, RouterLink, NgApexchartsModule, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tarjeta-kpi.component.html',
})
export class TarjetaKpiComponent {
  @Input({ required: true }) titulo = '';
  @Input({ required: true }) set valor(v: number | string) {
    this._valor.set(v);
  }
  @Input() sufijo = ''; // ej: '%', ''
  @Input() set cambio(v: number | null | undefined) {
    this._cambio.set(v ?? null);
  }
  @Input() iconoPath = ''; // 'd' attribute del path SVG
  @Input() color = '#0a4d7a';
  @Input() colorFondo = '#dbeafe'; // tailwind blue-100
  @Input() linkDetalle: string | null = null;
  @Input() set sparkline(v: SparklinePoint[]) {
    this._sparkline.set(v ?? []);
  }
  @Input() set cargando(v: boolean) {
    this._cargando.set(v);
  }

  // Estado interno con signals
  protected _valor = signal<number | string>(0);
  protected _cambio = signal<number | null>(null);
  protected _sparkline = signal<SparklinePoint[]>([]);
  protected _cargando = signal(false);

  // Computed para el chart de Apex
  chartOptions = computed<ApexOptions>(() => {
    const data = this._sparkline().map((p) => p.valor);
    const fechas = this._sparkline().map((p) => p.fecha);

    return {
      series: [{ name: this.titulo, data }],
      chart: {
        type: 'area',
        height: 50,
        sparkline: { enabled: true },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 500,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      colors: [this.color],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0,
          stops: [0, 100],
        },
      },
      tooltip: {
        enabled: true,
        x: { show: false },
        y: {
          formatter: (val: number, opts: any) => {
            const fecha = fechas[opts.dataPointIndex];
            return `${val} (${fecha})`;
          },
          title: { formatter: () => '' },
        },
        marker: { show: false },
      },
      xaxis: { categories: fechas },
    };
  });

  // Estado del cambio porcentual (texto + color)
  cambioInfo = computed(() => {
    const c = this._cambio();
    if (c === null) return null;

    const positivo = c >= 0;
    return {
      positivo,
      valor: Math.abs(c).toFixed(1),
      texto: positivo ? `+${c.toFixed(1)}%` : `${c.toFixed(1)}%`,
      color: positivo ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50',
      flecha: positivo ? '↗' : '↘',
    };
  });

  // ¿Hay datos de sparkline?
  haySparkline = computed(() => this._sparkline().length > 0);

  // Texto a mostrar como valor
  valorMostrar = computed(() => this._valor());

  // Getters protegidos
  get cargandoSignal() {
    return this._cargando();
  }
}
