import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage  } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, Meta, SafeResourceUrl, Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { Pagina, PaginasService } from '../../core/services/paginas.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe';
import { CatalogoService, Servicio } from '../../core/services/catalogo.service';
import { ContadorDirective } from '../../core/directives/contador.directive';
import type { BloquePagina } from '../../core/services/paginas.service';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { scrollAlInicio } from '../../core/utils/scroll.util';

@Component({
  selector: 'app-pagina-dinamica',
  standalone: true,
  imports: [CommonModule, RouterModule, FormatoTextoPipe, ContadorDirective, SkeletonComponent, NgOptimizedImage ],
  templateUrl: './pagina-dinamica.component.html',
})
export class PaginaDinamicaComponent implements OnInit, OnDestroy {
  pagina = signal<Pagina | null>(null);
  cargando = signal(true);
  noEncontrada = signal(false);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paginasService = inject(PaginasService);
  private title = inject(Title);
  private meta = inject(Meta);
  private sanitizer = inject(DomSanitizer);

  private subParams?: Subscription;

  ngOnInit() {
    this.subParams = this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        this.cargarPagina(slug);
        // Subir al inicio al cambiar de página
        scrollAlInicio(false);
      }
    });
  }

  ngOnDestroy() {
    this.subParams?.unsubscribe();
    // Restaurar título global cuando salgo
    this.title.setTitle('Vortiz Arquitectos');
  }

  private cargarPagina(slug: string) {
    this.cargando.set(true);
    this.noEncontrada.set(false);
    this.pagina.set(null);

    this.paginasService.getPorSlug(slug).subscribe({
      next: (data) => {
        this.pagina.set(data);
        this.cargando.set(false);
        this.actualizarSEO(data);
      },
      error: (err) => {
        this.cargando.set(false);
        this.noEncontrada.set(true);
        this.title.setTitle('Página no encontrada · Vortiz Arquitectos');
      },
    });
  }

  private actualizarSEO(p: Pagina) {
    const titulo = (p.seo?.metaTitle || '').trim() || p.titulo;
    const descripcion = (p.seo?.metaDescription || '').trim() || p.descripcion;

    this.title.setTitle(`${titulo} · Vortiz Arquitectos`);
    this.meta.updateTag({ name: 'description', content: descripcion || '' });

    const keywords = (p.seo?.keywords || '').trim();
    if (keywords) {
      this.meta.updateTag({ name: 'keywords', content: keywords });
    }

    // Open Graph (compartir en Facebook, LinkedIn, WhatsApp)
    this.meta.updateTag({ property: 'og:title', content: titulo });
    this.meta.updateTag({ property: 'og:description', content: descripcion || '' });
    if (p.imagenDestacada) {
      this.meta.updateTag({ property: 'og:image', content: p.imagenDestacada });
    }
  }

  /** Construye URL embebida de Google Maps para el bloque mapa. */
  urlMapa(direccion?: string): SafeResourceUrl {
    const query = encodeURIComponent(direccion?.trim() || 'Durango, México');
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${query}&output=embed`,
    );
  }

  /** TrackBy para *ngFor de bloques (mejora performance y animaciones). */
  trackBloque = (_: number, b: { id: number | string }) => b.id;

  private catalogoService = inject(CatalogoService);

  /** Servicios del catálogo, para el bloque `servicios` */
  servicios = this.catalogoService.servicios;

  etiquetaCategoriaServicio(cat: string): string {
    return this.catalogoService.etiquetaCategoriaServicio(cat);
  }

  serviciosDelBloque(bloque: BloquePagina): Servicio[] {
    const ids = bloque.serviciosIds || [];
    if (ids.length === 0) return [];
    return this.servicios().filter((s) => ids.includes(s.id));
  }
}
