import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { FunnelData } from '../../core/services/reportes.service';

@Component({
  selector: 'app-funnel-conversion',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './funnel-conversion.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class FunnelConversionComponent {
  @Input() titulo = 'Funnel de conversión';
  @Input() subtitulo = 'Cómo evoluciona el flujo de citas';
  @Input() set data(v: FunnelData | null) {
    this._data.set(v);
  }
  @Input() linkDetalle: string | null = null;
  @Input() set cargando(v: boolean) {
    this._cargando.set(v);
  }

  protected _data = signal<FunnelData | null>(null);
  protected _cargando = signal(true);

  get cargandoSig() {
    return this._cargando();
  }

  hayDatos = computed(() => {
    const d = this._data();
    return d !== null && d.metricas.total > 0;
  });

  etapas = computed(() => this._data()?.etapas ?? []);
  metricas = computed(() => this._data()?.metricas ?? null);

  /** Calcula el dropoff entre etapa i e i+1 */
  calcularDropoff(i: number): { valor: number; porcentaje: number } | null {
    const e = this._data()?.etapas;
    if (!e || i >= e.length - 1) return null;
    const actual = e[i];
    const siguiente = e[i + 1];
    const valor = actual.valor - siguiente.valor;
    const porcentaje =
      actual.valor > 0 ? Number(((valor / actual.valor) * 100).toFixed(1)) : 0;
    return { valor, porcentaje };
  }
}
