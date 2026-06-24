import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  BuscadorAdminService,
  ResultadoBusqueda,
} from '../../core/services/buscador-admin.service';

@Component({
  selector: 'app-buscador-admin',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './buscador-admin.component.html',
})
export class BuscadorAdminComponent implements OnChanges, OnDestroy {
  @Input() abierto = false;
  @Input() query = '';
  @Output() cerrar = new EventEmitter<void>();
  trackById = (_i: number, item: ResultadoBusqueda) => item.id;
  trackByKey = (_i: number, entry: any) => entry.key;

  private buscadorService = inject(BuscadorAdminService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private elementRef = inject(ElementRef);

  resultados = signal<ResultadoBusqueda[]>([]);
  cargando = signal(false);
  indiceSeleccionado = signal(0);
  mostrarCascada = signal(false);

  private debounceTimer: any = null;
  private timeoutCascada: any = null;

  async ngOnChanges(changes: any) {
    if (changes['abierto']?.currentValue === true) {
      this.cargando.set(true);
      this.resultados.set([]);
      this.mostrarCascada.set(true);
      this.cdr.markForCheck();

      await this.buscadorService.precargarTodo();
      this.actualizarResultados();

      this.cargando.set(false);
      this.cdr.markForCheck();

      if (this.timeoutCascada) clearTimeout(this.timeoutCascada);
      this.timeoutCascada = setTimeout(() => {
        this.mostrarCascada.set(false);
        this.cdr.markForCheck();
        this.timeoutCascada = null;
      }, 800);
    }

    // Cuando se cierra, limpiar cualquier timer pendiente
    if (changes['abierto']?.currentValue === false) {
      if (this.timeoutCascada) {
        clearTimeout(this.timeoutCascada);
        this.timeoutCascada = null;
      }
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.mostrarCascada.set(false);
    }

    // Debounce para query: espera 180ms antes de buscar
    if (changes['query'] && !changes['query'].firstChange) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.actualizarResultados();
        this.cdr.markForCheck();
        this.debounceTimer = null;
      }, 180);
    }
  }

  private actualizarResultados() {
    const q = (this.query || '').trim();
    if (!q) {
      const recientes = this.buscadorService
        .obtenerRecientes()
        .map((r) => ({ ...r, _reciente: true }));
      const recomendados = this.buscadorService.obtenerRecomendados();
      this.resultados.set([...recientes, ...recomendados]);
    } else {
      this.resultados.set(this.buscadorService.buscar(q));
    }
    this.indiceSeleccionado.set(0);
  }

  seleccionar(resultado: ResultadoBusqueda, event?: Event) {
    event?.stopPropagation();
    console.log('[Buscador] Click en:', resultado.titulo, '→', resultado.ruta);

    this.buscadorService.guardarReciente(resultado);

    const navigationExtras: any = {};
    if (resultado.fragment) navigationExtras.fragment = resultado.fragment;
    if (resultado.queryParams) navigationExtras.queryParams = resultado.queryParams;

    this.router
      .navigate([resultado.ruta], navigationExtras)
      .then((exito) =>
        console.log('[Buscador] Navegación:', exito ? '✓' : '✗', '→', resultado.ruta),
      )
      .catch((err) => console.error('[Buscador] Error:', err));

    this.cerrarPanel();
  }

  cerrarPanel() {
    this.cerrar.emit();
  }

  limpiarRecientes(event?: Event) {
    event?.stopPropagation();
    this.buscadorService.limpiarRecientes();
    this.actualizarResultados();
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent) {
    if (!this.abierto) return;
    const target = event.target as HTMLElement;
    if (this.elementRef.nativeElement.contains(target)) return;
    if (target.closest('[data-buscador-trigger]')) return;
    this.cerrarPanel();
  }

  @HostListener('document:keydown', ['$event'])
  manejarTeclado(event: KeyboardEvent) {
    if (!this.abierto) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cerrarPanel();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const max = this.resultados().length - 1;
      this.indiceSeleccionado.update((i) => Math.min(i + 1, max));
      this.scrollAlSeleccionado();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.indiceSeleccionado.update((i) => Math.max(i - 1, 0));
      this.scrollAlSeleccionado();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const seleccion = this.resultados()[this.indiceSeleccionado()];
      if (seleccion) this.seleccionar(seleccion);
    }
  }

  private scrollAlSeleccionado() {
    setTimeout(() => {
      const el = this.elementRef.nativeElement.querySelector('.resultado-activo');
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 0);
  }

  resultadosAgrupados = computed(() => {
    const grupos: { [k: string]: ResultadoBusqueda[] } = {};
    this.resultados().forEach((r) => {
      let key: string;
      if (r._reciente) key = 'reciente';
      else if (r._recomendado) key = 'recomendado';
      else key = r.categoria;

      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(r);
    });
    return grupos;
  });

  etiquetaCategoria(cat: string): string {
    const labels: Record<string, string> = {
      reciente: 'Búsquedas recientes',
      accion: 'Acciones rápidas',
      pagina: 'Páginas',
      config: 'Configuración',
      proyecto: 'Proyectos',
      cita: 'Citas',
      consulta: 'Consultas',
      reporte: 'Reportes generados',
      recomendado: 'Recomendado para ti',
    };
    return labels[cat] || cat;
  }

  ordenCategoria(cat: string): number {
    const orden: Record<string, number> = {
      reciente: 0, // 👈 PRIMERO (arriba)
      accion: 1,
      pagina: 2,
      config: 3,
      proyecto: 4,
      cita: 5,
      consulta: 6,
      reporte: 7,
      recomendado: 99, // 👈 ÚLTIMO (al final)
    };
    return orden[cat] || 50;
  }

  ordenComparator = (a: any, b: any) => {
    return this.ordenCategoria(a.key) - this.ordenCategoria(b.key);
  };

  indiceGlobal(categoria: string, indexLocal: number): number {
    let acumulado = 0;
    const grupos = this.resultadosAgrupados();
    const cats = Object.keys(grupos).sort(
      (a, b) => this.ordenCategoria(a) - this.ordenCategoria(b),
    );
    for (const c of cats) {
      if (c === categoria) return acumulado + indexLocal;
      acumulado += grupos[c].length;
    }
    return -1;
  }

  ngOnDestroy() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.timeoutCascada) clearTimeout(this.timeoutCascada);
  }
}
