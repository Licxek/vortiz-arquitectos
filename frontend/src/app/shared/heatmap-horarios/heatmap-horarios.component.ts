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
import { HeatmapSerie } from '../../core/services/reportes.service';

@Component({
  selector: 'app-heatmap-horarios',
  standalone: true,
  imports: [CommonModule, RouterLink, NgApexchartsModule, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './heatmap-horarios.component.html',
})
export class HeatmapHorariosComponent {
  @Input() titulo = 'Horarios populares';
  @Input() subtitulo = 'Cuándo agendan más tus clientes';
  @Input() set data(v: HeatmapSerie[]) {
    this._data.set(v ?? []);
  }
  @Input() altura = 350;
  @Input() linkDetalle: string | null = null;
  @Input() set cargando(v: boolean) {
    this._cargando.set(v);
  }

  protected _data = signal<HeatmapSerie[]>([]);
  protected _cargando = signal(true);

  get cargandoSig() {
    return this._cargando();
  }

  hayDatos = computed(() => {
    const d = this._data();
    if (d.length === 0) return false;
    return d.some((s) => s.data.some((p) => p.y > 0));
  });

  chartOptions = computed<ApexOptions>(() => ({
    series: this._data(),
    chart: {
      type: 'heatmap',
      height: this.altura,
      toolbar: { show: false },
      animations: { enabled: true, speed: 500 },
      fontFamily: 'inherit',
    },
    dataLabels: { enabled: false },
    colors: ['#0a4d7a'],
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 4,
        useFillColorAsStroke: false,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: '#f9fafb', name: 'Sin citas' },
            { from: 1, to: 2, color: '#bfdbfe', name: 'Bajo' },
            { from: 3, to: 5, color: '#3b82f6', name: 'Medio' },
            { from: 6, to: 10, color: '#0a4d7a', name: 'Alto' },
            { from: 11, to: 1000, color: '#1e3a8a', name: 'Muy alto' },
          ],
        },
      },
    },
    stroke: {
      width: 1,
      colors: ['#ffffff'],
    },
    xaxis: {
      labels: {
        style: { colors: '#6b7280', fontSize: '11px' },
        rotate: 0,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#6b7280', fontSize: '12px', fontWeight: 600 },
      },
    },
    grid: {
      padding: { right: 20, left: 0, top: 0, bottom: 0 },
    },
    legend: {
      position: 'bottom',
      fontSize: '11px',
      labels: { colors: '#6b7280' },
      markers: { shape: 'square' },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) =>
          val > 0 ? `${val} cita${val !== 1 ? 's' : ''}` : 'Sin citas',
      },
    },
  }));
}
