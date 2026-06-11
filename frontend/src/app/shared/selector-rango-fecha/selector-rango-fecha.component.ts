import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RangoSeleccionado {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  label: string;
  dias: number;
}

interface OpcionRango {
  dias: number;
  label: string;
}

@Component({
  selector: 'app-selector-rango-fecha',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './selector-rango-fecha.component.html',
})
export class SelectorRangoFechaComponent implements OnInit {
  @Output() rangoChange = new EventEmitter<RangoSeleccionado>();

  abierto = signal(false);
  rangoActual = signal<RangoSeleccionado>(this.calcularRango(30, 'Últimos 30 días'));

  opciones: OpcionRango[] = [
    { dias: 7, label: 'Últimos 7 días' },
    { dias: 30, label: 'Últimos 30 días' },
    { dias: 90, label: 'Últimos 3 meses' },
    { dias: 180, label: 'Últimos 6 meses' },
    { dias: 365, label: 'Último año' },
  ];

  ngOnInit() {
    // Emitir el rango inicial cuando el componente se monta
    queueMicrotask(() => this.rangoChange.emit(this.rangoActual()));
  }

  toggle(event: Event) {
    event.stopPropagation();
    this.abierto.update((v) => !v);
  }

  @HostListener('document:click')
  cerrarDesdeFuera() {
    this.abierto.set(false);
  }

  seleccionar(opcion: OpcionRango) {
    const rango = this.calcularRango(opcion.dias, opcion.label);
    this.rangoActual.set(rango);
    this.abierto.set(false);
    this.rangoChange.emit(rango);
  }

  private calcularRango(dias: number, label: string): RangoSeleccionado {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - dias + 1);

    return {
      desde: this.toIsoDate(desde),
      hasta: this.toIsoDate(hasta),
      label,
      dias,
    };
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
  }
}
