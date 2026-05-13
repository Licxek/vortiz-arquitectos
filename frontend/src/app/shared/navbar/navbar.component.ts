import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ConfiguracionService, Configuracion } from '../../core/services/configuracion.service';
import { PaginasService, Pagina } from '../../core/services/paginas.service';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit {
  configuracion: Configuracion | null = null;
  paginasDinamicas: Pagina[] = [];

  menuAbierto = false;
  buscadorAbierto = false;
  masAbierto = false;

  fixedLinks: NavItem[] = [
    { label: 'Inicio', path: '/' },
    { label: 'Servicios', path: '/servicios' },
    { label: 'Proyectos', path: '/proyectos' },
    { label: 'Nosotros', path: '/nosotros' },
  ];

  // Cuántas páginas dinámicas mostrar inline en escritorio antes del "Más"
  maxInlineDynamic = 1;

  constructor(
    private configuracionService: ConfiguracionService,
    private paginasService: PaginasService
  ) {}

  ngOnInit() {
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => this.configuracion = data,
      error: () => this.configuracion = null
    });

    this.paginasService.getPaginasVisibles().subscribe({
      next: (data) => this.paginasDinamicas = data,
      error: () => this.paginasDinamicas = []
    });
  }

  get inlineDynamic(): Pagina[] {
    return this.paginasDinamicas.slice(0, this.maxInlineDynamic);
  }

  get overflowPages(): Pagina[] {
    return this.paginasDinamicas.slice(this.maxInlineDynamic);
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
  }

  @HostListener('document:keydown.escape')
  cerrarTodo() {
    this.menuAbierto = false;
    this.buscadorAbierto = false;
    this.masAbierto = false;
  }
}
