import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface Pagina {
  id: number;
  titulo: string;
  slug: string;
  tipo: 'fija' | 'personalizada';
  visible: boolean;
  ultimaEdicion: string;
  icono: string;
  color: string;
}

@Component({
  selector: 'app-paginas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './paginas.component.html',
})
export class PaginasComponent implements OnInit {
  busqueda = '';
  filtroActivo: 'todas' | 'fijas' | 'personalizadas' | 'ocultas' = 'todas';
  menuAbiertoId: number | null = null;

  paginas: Pagina[] = [
    { id: 1, titulo: 'Inicio', slug: '/', tipo: 'fija', visible: true, ultimaEdicion: 'Hace 2 días', icono: 'home', color: 'blue' },
    { id: 2, titulo: 'Nosotros', slug: '/nosotros', tipo: 'fija', visible: true, ultimaEdicion: 'Hace 1 semana', icono: 'users', color: 'green' },
    { id: 3, titulo: 'Proyectos', slug: '/proyectos', tipo: 'fija', visible: true, ultimaEdicion: 'Hace 3 días', icono: 'building', color: 'orange' },
    { id: 4, titulo: 'Servicios', slug: '/servicios', tipo: 'fija', visible: true, ultimaEdicion: 'Ayer', icono: 'briefcase', color: 'purple' },
    { id: 5, titulo: 'Citas', slug: '/citas', tipo: 'fija', visible: true, ultimaEdicion: 'Hace 5 días', icono: 'calendar', color: 'pink' },
    { id: 6, titulo: 'Política de Privacidad', slug: '/p/privacidad', tipo: 'personalizada', visible: true, ultimaEdicion: 'Hace 2 semanas', icono: 'document', color: 'gray' },
    { id: 7, titulo: 'Términos y Condiciones', slug: '/p/terminos', tipo: 'personalizada', visible: false, ultimaEdicion: 'Hace 1 mes', icono: 'document', color: 'gray' },
  ];

  ngOnInit() {}

  get paginasFiltradas(): Pagina[] {
    let resultado = this.paginas;

    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.titulo.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
    }

    switch (this.filtroActivo) {
      case 'fijas': resultado = resultado.filter(p => p.tipo === 'fija'); break;
      case 'personalizadas': resultado = resultado.filter(p => p.tipo === 'personalizada'); break;
      case 'ocultas': resultado = resultado.filter(p => !p.visible); break;
    }

    return resultado;
  }

  get totalPaginas(): number { return this.paginas.length; }
  get totalVisibles(): number { return this.paginas.filter(p => p.visible).length; }
  get totalOcultas(): number { return this.paginas.filter(p => !p.visible).length; }
  get totalPersonalizadas(): number { return this.paginas.filter(p => p.tipo === 'personalizada').length; }

  toggleMenu(event: Event, id: number) {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === id ? null : id;
  }

  toggleVisibilidad(pagina: Pagina) {
    pagina.visible = !pagina.visible;
    this.menuAbiertoId = null;
  }

  eliminarPagina(pagina: Pagina) {
    if (pagina.tipo === 'fija') return;
    this.paginas = this.paginas.filter(p => p.id !== pagina.id);
    this.menuAbiertoId = null;
  }

  @HostListener('document:click')
  cerrarMenus() {
    this.menuAbiertoId = null;
  }
}
