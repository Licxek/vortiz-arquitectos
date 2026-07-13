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
import { PaginasFijasService, PaginaFijaConfig } from '../../core/services/paginas-fijas.service';

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
  private paginasFijasService = inject(PaginasFijasService);
  private paginasFijasConfig: PaginaFijaConfig[] = [];

  fixedLinks: NavItem[] = [
    { label: 'Inicio', path: '/home' },
    { label: 'Servicios', path: '/servicios' },
    { label: 'Proyectos', path: '/proyectos' },
    { label: 'Nosotros', path: '/nosotros' },
  ];

  /** Búsquedas populares dinámicas: salen del catálogo real */
  busquedasPopulares: string[] = [];

  private generarBusquedasPopulares() {
    const populares: string[] = [];

    // Top 3 servicios (por orden del catálogo)
    const servicios = this.busquedaService['catalogo'].getServicios().slice(0, 3);
    servicios.forEach((s: any) => populares.push(s.titulo));

    // Top 2 categorías de proyectos (únicas)
    const cats = new Set<string>();
    this.busquedaService['catalogo']
      .getProyectos()
      .slice(0, 6)
      .forEach((p: any) => cats.add(p.categoria));
    Array.from(cats)
      .slice(0, 2)
      .forEach((c) => {
        populares.push(this.busquedaService['catalogo'].etiquetaCategoriaProyecto(c));
      });

    // Y un par útil siempre
    populares.push('Agendar cita');

    this.busquedasPopulares = populares;
  }

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
        this.actualizarAlturaNavbar(); // 👈 NUEVO
        this.cdr.markForCheck();
      });
    }
  };

  private resizeObserver: ResizeObserver | null = null;

  private actualizarAlturaNavbar() {
    const nav = document.querySelector('nav.sticky') as HTMLElement;
    if (nav) {
      const altura = nav.offsetHeight;
      document.documentElement.style.setProperty('--navbar-altura', `${altura}px`);
    }
  }

  ngOnInit() {
    this.configuracionService.configPublica$.subscribe((c) => {
      this.configuracion = c;
      this.cargando.set(false);
      this.cdr.markForCheck();
      // Actualizar altura después del render
      setTimeout(() => {
        this.actualizarAlturaNavbar();
        this.observarAlturaNavbar(); // 👈 NUEVO
      }, 100);
    });

    this.paginasService.getPaginasParaMenu().subscribe({
      next: (data) => {
        this.paginasDinamicas = data;
        this.generarBusquedasPopulares();
        this.cdr.markForCheck();
      },
      error: () => (this.paginasDinamicas = []),
    });

    this.busquedasRecientes.set(this.busquedaService.obtenerRecientes());

    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    });

    // Cargar config de páginas fijas para filtrar el navbar
    this.paginasFijasService.listar().subscribe({
      next: (configs) => {
        this.paginasFijasConfig = configs;
        this.cdr.markForCheck();
      },
    });
  }

  // 👇 NUEVO método
  private observarAlturaNavbar() {
    const nav = document.querySelector('nav.sticky') as HTMLElement;
    if (nav && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        const altura = nav.offsetHeight;
        document.documentElement.style.setProperty('--navbar-altura', `${altura}px`);
      });
      this.resizeObserver.observe(nav);
    }
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.scrollHandler);
    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
    if (this.resizeObserver) this.resizeObserver.disconnect(); // 👈 NUEVO
  }

  /** Si hay 1-2 dinámicas → inline. Si hay 3+ → todas al mega menú. */
  private readonly MAX_INLINE = 2;

  get inlineDynamic(): Pagina[] {
    return this.paginasDinamicas.length <= this.MAX_INLINE ? this.paginasDinamicas : [];
  }

  get overflowPages(): Pagina[] {
    return this.paginasDinamicas.length > this.MAX_INLINE ? this.paginasDinamicas : [];
  }

  get hasOverflow(): boolean {
    return this.overflowPages.length > 0;
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    if (this.menuAbierto) this.buscadorAbierto = false;
    // 🔥 Bloquear scroll del body cuando el sidebar está abierto
    document.body.style.overflow = this.menuAbierto ? 'hidden' : '';
  }

  toggleBuscador() {
    this.buscadorAbierto = !this.buscadorAbierto;
    if (this.buscadorAbierto) {
      this.menuAbierto = false; // 👈 cierra menú móvil si estaba abierto
      this.busquedasRecientes.set(this.busquedaService.obtenerRecientes());
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        const input = document.querySelector('[data-buscador-movil-navbar]') as HTMLInputElement;
        input?.focus();
      }, 300);
    } else {
      document.body.style.overflow = '';
    }
  }

  cerrarBuscadorMovil() {
    this.buscadorAbierto = false;
    this.queryBusqueda.set('');
    this.resultadosBusqueda.set([]);
    document.body.style.overflow = ''; // 🔥 libera scroll
  }

  toggleMas(event: Event) {
    event.stopPropagation();
    this.masAbierto = !this.masAbierto;
  }

  toggleBuscadorEscritorio(event: Event) {
    event.stopPropagation();
    // 🛡️ Solo abrir, nunca cerrar desde el click del wrapper
    // Cerrar se hace solo con X, Escape, o click fuera (HostListener)
    // Esto evita el bug donde al copiar+pegar se cerraba accidentalmente
    if (!this.buscadorEscritorioAbierto) {
      this.buscadorEscritorioAbierto = true;
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

  abrirResultado(r: ResultadoBusqueda, event?: Event) {
    // Detener propagación para evitar que el HostListener cierre prematuramente
    event?.stopPropagation();
    event?.preventDefault();

    // 🐛 DEBUG TEMPORAL
    console.log('🔍 Resultado:', JSON.stringify(r, null, 2));
    console.log('🔍 seccionId:', r.seccionId);

    // Capturar query ANTES de limpiar
    const queryActual = this.queryBusqueda();

    // 1. Guardar reciente (solo si es string válido)
    if (queryActual && typeof queryActual === 'string' && queryActual.trim()) {
      this.busquedaService.guardarReciente(queryActual);
    }

    // 2. Navegar PRIMERO (antes de cerrar el panel)
    // Construir queryParams combinando los existentes + seccion para scroll
    const queryParams: Record<string, any> = { ...(r.queryParams || {}) };
    if (r.seccionId) queryParams['seccion'] = r.seccionId;

    const promesa =
      Object.keys(queryParams).length > 0
        ? this.router.navigate([r.ruta], { queryParams })
        : this.router.navigate([r.ruta]);

    // 3. Cerrar el panel DESPUÉS de iniciar la navegación
    promesa.then(() => {
      this.buscadorAbierto = false;
      this.buscadorEscritorioAbierto = false;
      this.queryBusqueda.set('');
      this.resultadosBusqueda.set([]);
      this.cdr.markForCheck();
    });
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
    if (!target.closest('.buscador-escritorio') && !target.closest('.buscador-inline')) {
      this.buscadorEscritorioAbierto = false;
      // Si el buscador inline está expandido y no hay query, colapsar
      if (this.buscadorInlineExpandido() && !this.queryBusqueda().trim()) {
        this.buscadorInlineExpandido.set(false);
      }
    }
  }

  @HostListener('document:keydown.escape')
  cerrarTodo() {
    // 🔥 Libera scroll si CUALQUIERA de los overlays estaba abierto
    if (this.menuAbierto || this.buscadorAbierto) {
      document.body.style.overflow = '';
    }
    this.menuAbierto = false;
    this.buscadorAbierto = false;
    this.masAbierto = false;
    this.buscadorEscritorioAbierto = false;
    this.buscadorInlineExpandido.set(false);
  }

  /** Genera el gradient del icono de una página dinámica en el mega menú */
  iconoBgPagina(p: Pagina): string {
    const color = (p as any).color || 'blue';

    if (typeof color === 'string' && color.startsWith('#')) {
      return `linear-gradient(135deg, ${color}, ${this.oscurecerHex(color, 25)})`;
    }

    const PRESETS: Record<string, [string, string]> = {
      blue: ['#60A5FA', '#2563EB'],
      green: ['#4ADE80', '#16A34A'],
      orange: ['#FB923C', '#EA580C'],
      purple: ['#A78BFA', '#7C3AED'],
      pink: ['#F472B6', '#DB2777'],
      gray: ['#9CA3AF', '#4B5563'],
    };
    const [from, to] = PRESETS[color] || PRESETS['blue'];
    return `linear-gradient(135deg, ${from}, ${to})`;
  }

  private oscurecerHex(hex: string, porcentaje: number): string {
    const s = hex.replace('#', '');
    if (s.length !== 6) return hex;
    const num = parseInt(s, 16);
    const factor = 1 - porcentaje / 100;
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.floor(r * factor));
    g = Math.max(0, Math.floor(g * factor));
    b = Math.max(0, Math.floor(b * factor));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  private masHoverTimer: any = null;

  /** Abre el mega menú al pasar el mouse */
  abrirMasHover() {
    if (this.masHoverTimer) {
      clearTimeout(this.masHoverTimer);
      this.masHoverTimer = null;
    }
    this.masAbierto = true;
  }

  /** Cierra el mega menú al sacar el mouse (con pequeño delay para evitar parpadeo) */
  cerrarMasHover() {
    if (this.masHoverTimer) clearTimeout(this.masHoverTimer);
    this.masHoverTimer = setTimeout(() => {
      this.masAbierto = false;
      this.cdr.markForCheck();
    }, 200);
  }

  /** Devuelve si una página fija debe mostrarse en el navbar */
  esFijaVisible(path: string): boolean {
    const slug = path === '/home' ? '/' : path;
    const config = this.paginasFijasConfig.find((c) => c.slug === slug);
    return config ? config.visible : true;
  }
  // ============ BUSCADOR INLINE (estilo Gmail) ============
  buscadorInlineExpandido = signal(false);

  expandirBuscadorInline() {
    this.buscadorInlineExpandido.set(true);
    this.buscadorEscritorioAbierto = true;
    this.busquedasRecientes.set(this.busquedaService.obtenerRecientes());
    setTimeout(() => {
      const input = document.querySelector('[data-buscador-navbar]') as HTMLInputElement;
      input?.focus();
    }, 200);
  }

  colapsarBuscadorInline() {
    this.buscadorInlineExpandido.set(false);
    this.buscadorEscritorioAbierto = false;
    this.queryBusqueda.set('');
    this.resultadosBusqueda.set([]);
  }

  toggleBuscadorInline(event: Event) {
    event.stopPropagation();
    if (this.buscadorInlineExpandido()) {
      this.colapsarBuscadorInline();
    } else {
      this.expandirBuscadorInline();
    }
  }

  /** Cierra el menú móvil y libera el scroll del body */
  cerrarMenuMovil() {
    this.menuAbierto = false;
    document.body.style.overflow = '';
  }
}
