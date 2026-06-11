import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  NgZone,
  ChangeDetectorRef,signal
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ConfiguracionService, Configuracion } from '../../core/services/configuracion.service';
import { PaginasService, Pagina } from '../../core/services/paginas.service';
import { SkeletonComponent } from '../skeleton/skeleton.component';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, NgOptimizedImage, SkeletonComponent],
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

  fixedLinks: NavItem[] = [
    { label: 'Inicio', path: '/home' },
    { label: 'Servicios', path: '/servicios' },
    { label: 'Proyectos', path: '/proyectos' },
    { label: 'Nosotros', path: '/nosotros' },
  ];

  // Cuántas páginas dinámicas mostrar inline en escritorio antes del "Más"

  constructor(
    private configuracionService: ConfiguracionService,
    private paginasService: PaginasService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  private scrollHandler = () => {
    const y = window.scrollY;
    let newScrolled = this.scrolled;

    // Para activar necesita pasar de 100px
    if (!this.scrolled && y > 100) {
      newScrolled = true;
    }
    // Para desactivar necesita bajar de 30px
    else if (this.scrolled && y < 30) {
      newScrolled = false;
    }

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

    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    });
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.scrollHandler);
  }

  get inlineDynamic(): Pagina[] {
    // Solo 1 página → se muestra inline. 2+ → todas van al "Más".
    return this.paginasDinamicas.length === 1 ? this.paginasDinamicas : [];
  }

  get overflowPages(): Pagina[] {
    // Si hay 2 o más, todas viven en el dropdown "Más".
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
  }

  toggleMas(event: Event) {
    event.stopPropagation();
    this.masAbierto = !this.masAbierto;
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

  toggleBuscadorEscritorio(event: Event) {
    event.stopPropagation();
    this.buscadorEscritorioAbierto = !this.buscadorEscritorioAbierto;
  }
}
