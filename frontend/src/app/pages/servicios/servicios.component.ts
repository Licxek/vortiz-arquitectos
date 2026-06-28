import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CatalogoService, Servicio } from '../../core/services/catalogo.service';
import { ContenidoService } from '../../core/services/contenido.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

interface CategoriaFiltro {
  id: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormatoTextoPipe, SkeletonComponent, NgOptimizedImage],
  templateUrl: './servicios.component.html',
})
export class ServiciosComponent implements OnInit {
  private catalogo = inject(CatalogoService);
  private contenidoService = inject(ContenidoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  servicioActivo = signal<Servicio | null>(null);
  filtroActivo = signal<string>('todos');

  servicios = this.catalogo.servicios;

  // ============ HERO ============
  servHeroBadge = '';
  servHeroTitulo = '';
  servHeroDescripcion = '';
  servHeroImagenFondo = '';

  // ============ INTRO ============
  servIntroBadge = '';
  servIntroTitulo = '';
  servIntroDescripcion = '';

  // ============ CTA ============
  servCtaTitulo = '';
  servCtaDescripcion = '';

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

    // Limpiar el query param ?servicio de la URL para que no se reabra al recargar
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { servicio: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  ngOnInit() {
    // HERO
    this.servHeroBadge = this.contenidoService.getCampo('servicios', 'hero', 'badge');
    this.servHeroTitulo = this.contenidoService.getCampo('servicios', 'hero', 'titulo');
    this.servHeroDescripcion = this.contenidoService.getCampo('servicios', 'hero', 'descripcion');
    this.servHeroImagenFondo = this.contenidoService.getCampo('servicios', 'hero', 'imagenFondo');

    // INTRO
    this.servIntroBadge = this.contenidoService.getCampo('servicios', 'intro', 'badge');
    this.servIntroTitulo = this.contenidoService.getCampo('servicios', 'intro', 'titulo');
    this.servIntroDescripcion = this.contenidoService.getCampo('servicios', 'intro', 'descripcion');

    // CTA
    this.servCtaTitulo = this.contenidoService.getCampo('servicios', 'cta', 'titulo');
    this.servCtaDescripcion = this.contenidoService.getCampo('servicios', 'cta', 'descripcion');

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

    // 🔍 Escuchar query param ?servicio=:id para abrir/cerrar modal desde la búsqueda
    this.route.queryParams.subscribe((params) => {
      const servicioId = params['servicio'];

      // Si NO hay param → asegurar que el modal esté cerrado
      if (!servicioId) {
        if (this.servicioActivo()) {
          this.servicioActivo.set(null);
        }
        return;
      }

      // Si hay param → buscar el servicio, scrollear a su card y abrir modal
      const tryOpen = (intentos = 0) => {
        if (intentos > 20) return;
        const servicio = this.servicios().find((s) => s.id === Number(servicioId));
        if (servicio) {
          // 1. Resetear filtro para garantizar que la card sea visible en el grid
          this.filtroActivo.set('todos');

          // 2. Esperar a que el grid re-renderice, luego scrollear a la card
          setTimeout(() => {
            const el = document.getElementById(`servicio-${servicio.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // 3. Después del scroll, abrir el modal
            setTimeout(() => {
              this.abrirServicio(servicio);
            }, 700);
          }, 250);
        } else {
          setTimeout(() => tryOpen(intentos + 1), 200);
        }
      };
      tryOpen();
    });
  }
}
