import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  NgZone,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ConfiguracionService, Configuracion } from '../../core/services/configuracion.service';
import { PaginasService, Pagina } from '../../core/services/paginas.service';
import { BusquedaService, ResultadoBusqueda } from '../../core/services/busqueda.service';
import { SkeletonComponent } from '../skeleton/skeleton.component';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, NgOptimizedImage, SkeletonComponent, FormsModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit, OnDestroy {
  configuracion: Configuracion | null = null;
  paginasDinamicas: Pagina[] = [];

  menuAbierto = false;
  buscadorAbierto = false;
  masAbierto = false;
  scrolled = false;
  buscadorEscritorioAbierto = false;
  cargando = signal(true);

  // 🔍 Búsqueda
  queryBusqueda = signal('');
  resultadosBusqueda = signal<ResultadoBusqueda[]>([]);
  busquedasRecientes = signal<string[]>([]);
  private busquedaTimer: any = null;

  fixedLinks: NavItem[] = [
    { label: 'Inicio', path: '/home' },
    { label: 'Servicios', path: '/servicios' },
    { label: 'Proyectos', path: '/proyectos' },
    { label: 'Nosotros', path: '/nosotros' },
  ];

  busquedasPopulares = [
    'Diseño arquitectónico',
    'Modelado BIM',
    'Supervisión técnica',
    'Gerencia de obra',
    'Residencial',
    'Comercial',
  ];

  private busquedaService = inject(BusquedaService);
  private router = inject(Router);

  constructor(
    private configuracionService: ConfiguracionService,
    private paginasService: PaginasService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  private scrollHandler = () => {
    const y = window.scrollY;
    let newScrolled = this.scrolled;
    if (!this.scrolled && y > 100) newScrolled = true;
    else if (this.scrolled && y < 30) newScrolled = false;
    if (newScrolled !== this.scrolled) {
      this.ngZone.run(() => {
        this.scrolled = newScrolled;
        this.cdr.markForCheck();
      });
    }
  };

  ngOnInit() {
    this.configuracionService.configPublica$.subscribe((c) => {
      this.configuracion = c;
      this.cargando.set(false);
      this.cdr.markForCheck();
    });

    this.paginasService.getPaginasVisibles().subscribe({
      next: (data) => (this.paginasDinamicas = data),
      error: () => (this.paginasDinamicas = []),
    });

    this.busquedasRecientes.set(this.busquedaService.obtenerRecientes());

    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    });
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.scrollHandler);
    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
  }

  get inlineDynamic(): Pagina[] {
    return this.paginasDinamicas.length === 1 ? this.paginasDinamicas : [];
  }

  get overflowPages(): Pagina[] {
    return this.paginasDinamicas.length >= 2 ? this.paginasDinamicas : [];
  }

  get hasOverflow(): boolean {
    return this.overflowPages.length > 0;
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    if (this.menuAbierto) this.buscadorAbierto = false;
  }

  toggleBuscador() {
    this.buscadorAbierto = !this.buscadorAbierto;
    if (this.buscadorAbierto) {
      this.busquedasRecientes.set(this.busquedaService.obtenerRecientes());
    }
  }

  toggleMas(event: Event) {
    event.stopPropagation();
    this.masAbierto = !this.masAbierto;
  }

  toggleBuscadorEscritorio(event: Event) {
    event.stopPropagation();
    this.buscadorEscritorioAbierto = !this.buscadorEscritorioAbierto;
    if (this.buscadorEscritorioAbierto) {
      this.busquedasRecientes.set(this.busquedaService.obtenerRecientes());
    }
  }

  // 🔍 Lógica de búsqueda

  onInputBusqueda(event: Event) {
    const valor = (event.target as HTMLInputElement).value;
    this.queryBusqueda.set(valor);

    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
    this.busquedaTimer = setTimeout(() => {
      const resultados = this.busquedaService.buscar(valor, this.paginasDinamicas);
      this.resultadosBusqueda.set(resultados);
    }, 150);
  }

  abrirResultado(r: ResultadoBusqueda) {
    if (this.queryBusqueda().trim()) {
      this.busquedaService.guardarReciente(this.queryBusqueda());
    }
    this.cerrarBusqueda();
    if (r.queryParams) {
      this.router.navigate([r.ruta], { queryParams: r.queryParams });
    } else {
      this.router.navigate([r.ruta]);
    }
  }

  buscarRapido(query: string) {
    this.queryBusqueda.set(query);
    const resultados = this.busquedaService.buscar(query, this.paginasDinamicas);
    this.resultadosBusqueda.set(resultados);
  }

  limpiarQuery() {
    this.queryBusqueda.set('');
    this.resultadosBusqueda.set([]);
  }

  eliminarReciente(event: Event, query: string) {
    event.stopPropagation();
    this.busquedasRecientes.set(this.busquedaService.eliminarReciente(query));
  }

  limpiarTodasRecientes() {
    this.busquedaService.limpiarRecientes();
    this.busquedasRecientes.set([]);
  }

  cerrarBusqueda() {
    this.buscadorAbierto = false;
    this.buscadorEscritorioAbierto = false;
    this.queryBusqueda.set('');
    this.resultadosBusqueda.set([]);
  }

  // Helper: icono según tipo de resultado
  iconoTipo(tipo: ResultadoBusqueda['tipo']): string {
    return tipo; // 'pagina' | 'servicio' | 'proyecto' | 'pagina-dinamica'
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.mas-dropdown')) {
      this.masAbierto = false;
    }
    if (!target.closest('.buscador-escritorio')) {
      this.buscadorEscritorioAbierto = false;
    }
  }

  @HostListener('document:keydown.escape')
  cerrarTodo() {
    this.menuAbierto = false;
    this.buscadorAbierto = false;
    this.masAbierto = false;
    this.buscadorEscritorioAbierto = false;
  }
}
