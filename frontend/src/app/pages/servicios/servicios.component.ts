import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CatalogoService, Servicio } from '../../core/services/catalogo.service'; // ajusta ruta
import { ContenidoService } from '../../core/services/contenido.service'; // ajusta ruta
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe'; // ajusta ruta

interface CategoriaFiltro {
  id: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormatoTextoPipe],
  templateUrl: './servicios.component.html',
})
export class ServiciosComponent {
  private catalogo = inject(CatalogoService);
  private contenidoService = inject(ContenidoService);
  servicioActivo = signal<Servicio | null>(null);
  filtroActivo = signal<string>('todos');

  // HERO
  servHeroBadge = 'Servicios';
  servHeroTitulo = 'Lo que hacemos por *tu proyecto*';
  servHeroDescripcion = 'Soluciones arquitectónicas integrales con metodología BIM y PMI.';
  // INTRO
  servIntroBadge = 'Catálogo completo';
  servIntroTitulo = 'Tu proyecto en manos expertas, de principio a fin';
  servIntroDescripcion = ''; // vacío = texto por defecto (conserva el conteo dinámico)
  // CTA
  servCtaTitulo = '¿No estás seguro de cuál servicio *necesitas?*';
  servCtaDescripcion =
    'Cuéntanos sobre tu proyecto y nuestro equipo te orientará en una conversación inicial sin compromiso.';

  servicios = this.catalogo.servicios; // señal reactiva

  categorias = computed<CategoriaFiltro[]>(() => {
    const cats = [
      { id: 'tramites', label: 'Trámites' },
      { id: 'gerencia', label: 'Gerencia' },
      { id: 'diseno', label: 'Diseño' },
      { id: 'construccion', label: 'Construcción' },
      { id: 'especiales', label: 'Proyectos Especiales' },
    ];
    return [
      { id: 'todos', label: 'Todos', count: this.servicios().length },
      ...cats.map((c) => ({
        id: c.id,
        label: c.label,
        count: this.servicios().filter((s) => s.categoria === c.id).length,
      })),
    ];
  });

  serviciosFiltrados = computed(() => {
    if (this.filtroActivo() === 'todos') return this.servicios();
    return this.servicios().filter((s) => s.categoria === this.filtroActivo());
  });

  serviciosRelacionados = computed(() => {
    const actual = this.servicioActivo();
    if (!actual) return [];
    return this.servicios()
      .filter((s) => s.categoria === actual.categoria && s.id !== actual.id)
      .slice(0, 3);
  });

  categoriaLabel(id: string): string {
    const map: Record<string, string> = {
      tramites: 'Trámites',
      gerencia: 'Gerencia',
      diseno: 'Diseño',
      construccion: 'Construcción',
      especiales: 'Especiales',
    };
    return map[id] || id;
  }

  cambiarFiltro(id: string) {
    this.filtroActivo.set(id);
  }

  abrirServicio(servicio: Servicio) {
    this.servicioActivo.set(servicio);
  }

  cerrarModal() {
    this.servicioActivo.set(null);
  }

  ngOnInit() {
    this.servHeroBadge = this.contenidoService.getCampo(
      'servicios',
      'hero',
      'badge',
      this.servHeroBadge,
    );
    this.servHeroTitulo = this.contenidoService.getCampo(
      'servicios',
      'hero',
      'titulo',
      this.servHeroTitulo,
    );
    this.servHeroDescripcion = this.contenidoService.getCampo(
      'servicios',
      'hero',
      'descripcion',
      this.servHeroDescripcion,
    );

    this.servIntroBadge = this.contenidoService.getCampo(
      'servicios',
      'intro',
      'badge',
      this.servIntroBadge,
    );
    this.servIntroTitulo = this.contenidoService.getCampo(
      'servicios',
      'intro',
      'titulo',
      this.servIntroTitulo,
    );
    this.servIntroDescripcion = this.contenidoService.getCampo(
      'servicios',
      'intro',
      'descripcion',
      this.servIntroDescripcion,
    );

    this.servCtaTitulo = this.contenidoService.getCampo(
      'servicios',
      'cta',
      'titulo',
      this.servCtaTitulo,
    );
    this.servCtaDescripcion = this.contenidoService.getCampo(
      'servicios',
      'cta',
      'descripcion',
      this.servCtaDescripcion,
    );
  }
}
