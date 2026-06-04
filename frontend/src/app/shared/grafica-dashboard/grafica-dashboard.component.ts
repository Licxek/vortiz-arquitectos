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
import { SkeletonComponent } from '../skeleton/skeleton.component';

export type TipoGrafica = 'area' | 'donut' | 'line' | 'bar';

export interface PuntoGrafica {
  label: string;
  valor: number;
}

@Component({
  selector: 'app-grafica-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgApexchartsModule, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grafica-dashboard.component.html',
})
export class GraficaDashboardComponent {
  @Input({ required: true }) titulo = '';
  @Input() subtitulo = '';
  @Input({ required: true }) tipo: TipoGrafica = 'area';
  @Input() set data(v: PuntoGrafica[]) {
    this._data.set(v ?? []);
  }
  @Input() color = '#0a4d7a';
  @Input() coloresMultiple: string[] = [
    '#0a4d7a',
    '#f97316',
    '#10b981',
    '#a855f7',
    '#3b82f6',
    '#ef4444',
  ];
  @Input() linkDetalle: string | null = null;
  @Input() unidad = 'citas';
  @Input() set cargando(v: boolean) {
    this._cargando.set(v);
  }
  @Input() altura = 220;

  protected _data = signal<PuntoGrafica[]>([]);
  protected _cargando = signal(true);

  get cargandoSig() {
    return this._cargando();
  }

  hayDatos = computed(
    () => this._data().length > 0 && this._data().some((d) => d.valor > 0),
  );

  chartOptions = computed<ApexOptions>(() => {
    const data = this._data();
    const valores = data.map((d) => d.valor);
    const labels = data.map((d) => d.label);

    switch (this.tipo) {
      case 'area':
        return this.optionsArea(valores, labels);
      case 'donut':
        return this.optionsDonut(valores, labels);
      case 'line':
        return this.optionsLine(valores, labels);
      case 'bar':
        return this.optionsBar(valores, labels);
      default:
        return this.optionsArea(valores, labels);
    }
  });

  private optionsArea(valores: number[], labels: string[]): ApexOptions {
    return {
      series: [{ name: this.titulo, data: valores }],
      chart: {
        type: 'area',
        height: this.altura,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: true, speed: 500 },
      },
      stroke: { curve: 'smooth', width: 2 },
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
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels,
        labels: { style: { colors: '#6b7280', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: '#6b7280', fontSize: '11px' } },
      },
      grid: {
        borderColor: '#f3f4f6',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
      },
      tooltip: {
        theme: 'light',
        y: { formatter: (val: number) => `${val} ${this.unidad}` },
      },
    };
  }

  private optionsDonut(valores: number[], labels: string[]): ApexOptions {
    return {
      series: valores,
      chart: {
        type: 'donut',
        height: this.altura,
        animations: { enabled: true, speed: 500 },
      },
      labels: labels,
      colors: this.coloresMultiple,
      dataLabels: { enabled: false },
      legend: {
        position: 'bottom',
        fontSize: '12px',
        labels: { colors: '#374151' },
        itemMargin: { horizontal: 8, vertical: 4 },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                color: '#374151',
                fontSize: '12px',
                fontWeight: 600,
              },
              value: {
                color: '#111827',
                fontSize: '22px',
                fontWeight: 700,
              },
            },
          },
        },
      },
      tooltip: {
        theme: 'light',
        y: { formatter: (val: number) => `${val} ${this.unidad}` },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            legend: { position: 'bottom' },
          },
        },
      ],
    };
  }

  private optionsLine(valores: number[], labels: string[]): ApexOptions {
    return {
      series: [{ name: this.titulo, data: valores }],
      chart: {
        type: 'line',
       height: this.altura,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: true, speed: 500 },
      },
      stroke: { curve: 'smooth', width: 3 },
      colors: [this.color],
      markers: {
        size: 5,
        colors: [this.color],
        strokeColors: '#fff',
        strokeWidth: 2,
        hover: { size: 7 },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels,
        labels: { style: { colors: '#6b7280', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: '#6b7280', fontSize: '11px' } },
      },
      grid: {
        borderColor: '#f3f4f6',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
      },
      tooltip: {
        theme: 'light',
        y: { formatter: (val: number) => `${val} ${this.unidad}` },
      },
    };
  }

  private optionsBar(valores: number[], labels: string[]): ApexOptions {
    return {
      series: [{ name: this.titulo, data: valores }],
      chart: {
        type: 'bar',
        height: this.altura,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: true, speed: 500 },
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '60%',
          distributed: false,
        },
      },
      colors: [this.color],
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels,
        labels: { style: { colors: '#6b7280', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: '#6b7280', fontSize: '11px' } },
      },
      grid: {
        borderColor: '#f3f4f6',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
      },
      tooltip: {
        theme: 'light',
        y: { formatter: (val: number) => `${val} ${this.unidad}` },
      },
    };
  }
}
