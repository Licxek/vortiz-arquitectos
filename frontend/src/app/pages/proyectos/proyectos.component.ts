import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CatalogoService, Proyecto } from '../../core/services/catalogo.service';
import { ContenidoService } from '../../core/services/contenido.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { ProjectShowcaseComponent } from '../../shared/project-showcase/project-showcase.component';
import { ActivatedRoute } from '@angular/router';

interface CategoriaFiltro {
  id: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormatoTextoPipe,
    SkeletonComponent,
    NgOptimizedImage,
    ProjectShowcaseComponent,
  ],
  templateUrl: './proyectos.component.html',
})
export class ProyectosComponent implements OnInit {
  private catalogo = inject(CatalogoService);
  private contenidoService = inject(ContenidoService);
  private route = inject(ActivatedRoute);

  filtroActivo = signal<string>('todos');
  busqueda = signal<string>('');

  proyectos = this.catalogo.proyectos;

  // ============ HERO ============
  proyHeroBadge = '';
  proyHeroTitulo = '';
  proyHeroDescripcion = '';
  proyHeroImagenFondo = '';

  // ============ INTRO ============
  proyIntroBadge = '';
  proyIntroTitulo = '';
  proyIntroDescripcion = '';

  // ============ CTA ============
  proyCtaTitulo = '';
  proyCtaDescripcion = '';

  categorias = computed<CategoriaFiltro[]>(() => {
    const cats = [
      'corporativo',
      'industrial',
      'comercial',
      'residencial',
      'infraestructura',
      'institucional',
    ];
    return [
      { id: 'todos', label: 'Todos', count: this.proyectos().length },
      ...cats.map((c) => ({
        id: c,
        label: c.charAt(0).toUpperCase() + c.slice(1),
        count: this.proyectos().filter((p) => p.categoria === c).length,
      })),
    ];
  });

  proyectosFiltrados = computed(() => {
    let lista = this.proyectos();
    if (this.filtroActivo() !== 'todos') {
      lista = lista.filter((p) => p.categoria === this.filtroActivo());
    }
    const q = this.busqueda().toLowerCase().trim();
    if (q) {
      lista = lista.filter(
        (p) => p.nombre.toLowerCase().includes(q) || p.ubicacion.toLowerCase().includes(q),
      );
    }
    return lista;
  });

  cambiarFiltro(id: string) {
    this.filtroActivo.set(id);
  }

  actualizarBusqueda(event: Event) {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  ngOnInit() {
    // HERO
    this.proyHeroBadge = this.contenidoService.getCampo('proyectos', 'hero', 'badge');
    this.proyHeroTitulo = this.contenidoService.getCampo('proyectos', 'hero', 'titulo');
    this.proyHeroDescripcion = this.contenidoService.getCampo('proyectos', 'hero', 'descripcion');
    this.proyHeroImagenFondo = this.contenidoService.getCampo('proyectos', 'hero', 'imagenFondo');

    // INTRO
    this.proyIntroBadge = this.contenidoService.getCampo('proyectos', 'intro', 'badge');
    this.proyIntroTitulo = this.contenidoService.getCampo('proyectos', 'intro', 'titulo');
    this.proyIntroDescripcion = this.contenidoService.getCampo('proyectos', 'intro', 'descripcion');

    // CTA
    this.proyCtaTitulo = this.contenidoService.getCampo('proyectos', 'cta', 'titulo');
    this.proyCtaDescripcion = this.contenidoService.getCampo('proyectos', 'cta', 'descripcion');

    // 🔍 Escuchar query param ?showcase=:id para abrir modal desde la búsqueda
    this.route.queryParams.subscribe((params) => {
      const showcaseId = params['showcase'];
      if (!showcaseId) return;

      const tryOpen = (intentos = 0) => {
        if (intentos > 20) return;
        const proyecto = this.proyectos().find((p) => p.id === Number(showcaseId));
        if (proyecto) {
          this.abrirShowcase(proyecto);
        } else {
          setTimeout(() => tryOpen(intentos + 1), 200);
        }
      };
      tryOpen();
    });
  }
  // Agrega propiedad en la clase
  proyectoSeleccionado = signal<Proyecto | null>(null);

  // Métodos
  abrirShowcase(p: Proyecto) {
    this.proyectoSeleccionado.set(p);
    document.body.style.overflow = 'hidden';
  }

  cerrarShowcase() {
    this.proyectoSeleccionado.set(null);
    document.body.style.overflow = '';
  }
}
