import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CatalogoService, Proyecto } from '../../core/services/catalogo.service';
import { ContenidoService } from '../../core/services/contenido.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { ProjectShowcaseComponent } from '../../shared/project-showcase/project-showcase.component';
import { ActivatedRoute, Router } from '@angular/router';

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
  private router = inject(Router);

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

    // 🎯 Scroll a sección si viene ?seccion=X del buscador
    this.route.queryParams.subscribe((params) => {
      const seccion = params['seccion'];
      if (!seccion) return;
      setTimeout(() => {
        const el = document.getElementById(`seccion-${seccion}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Limpiar el query param para que no scrollee otra vez al recargar
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { seccion: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }, 600);
    });

    // 🔍 Escuchar query param ?showcase=:id para abrir/cerrar modal desde la búsqueda
    this.route.queryParams.subscribe((params) => {
      const showcaseId = params['showcase'];

      // Si NO hay param → asegurar que el modal esté cerrado
      if (!showcaseId) {
        if (this.proyectoSeleccionado()) {
          this.proyectoSeleccionado.set(null);
          document.body.style.overflow = '';
        }
        return;
      }

      // Si hay param → buscar el proyecto, scrollear a su card y abrir modal
      const tryOpen = (intentos = 0) => {
        if (intentos > 20) return;
        const proyecto = this.proyectos().find((p) => p.id === Number(showcaseId));
        if (proyecto) {
          // 1. Resetear filtros para garantizar que la card sea visible en el grid
          this.filtroActivo.set('todos');
          this.busqueda.set('');

          // 2. Esperar a que el grid re-renderice, luego scrollear a la card
          setTimeout(() => {
            const el = document.getElementById(`proyecto-${proyecto.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // 3. Después del scroll, abrir el modal
            setTimeout(() => {
              this.abrirShowcase(proyecto);
            }, 700);
          }, 250);
        } else {
          setTimeout(() => tryOpen(intentos + 1), 200);
        }
      };
      tryOpen();
    });
  }
  // Agrega propiedad en la clase
  proyectoSeleccionado = signal<Proyecto | null>(null);
  private scrollPosBeforeModal = 0;

  // Métodos
  abrirShowcase(p: Proyecto) {
    this.scrollPosBeforeModal = window.scrollY;
    this.proyectoSeleccionado.set(p);
    document.body.style.overflow = 'hidden';
  }

  cerrarShowcase() {
    this.proyectoSeleccionado.set(null);
    document.body.style.overflow = '';

    const scrollPos = this.scrollPosBeforeModal;

    // Limpiar el query param ?showcase de la URL para que no se reabra al recargar
    this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: { showcase: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
      .then(() => {
        // Restaurar la posición del scroll donde estaba la card
        window.scrollTo({ top: scrollPos, behavior: 'instant' as ScrollBehavior });
      });
  }
}
