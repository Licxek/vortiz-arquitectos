import { Component, computed, signal, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CatalogoService, Proyecto } from '../../core/services/catalogo.service'; // ajusta ruta
import { ContenidoService } from '../../core/services/contenido.service'; // ajusta ruta
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe'; // ajusta ruta

interface CategoriaFiltro {
  id: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormatoTextoPipe],
  templateUrl: './proyectos.component.html',
})
export class ProyectosComponent {
  private catalogo = inject(CatalogoService);
  private contenidoService = inject(ContenidoService);

  filtroActivo = signal<string>('todos');
  busqueda = signal<string>('');

  proyectos: Proyecto[] = this.catalogo.getProyectos();

  // HERO
  proyHeroBadge = 'Portafolio';
  proyHeroTitulo = 'Clientes que confiaron en *nuestro trabajo*';
  proyHeroDescripcion =
    'Cada marca representa una historia de colaboración, planeación y ejecución.';
  // INTRO
  proyIntroBadge = 'Nuestro portafolio';
  proyIntroTitulo = '150+ proyectos completados para empresas líderes en México';
  proyIntroDescripcion =
    'Desde plantas industriales hasta infraestructura nacional, hemos colaborado con corporativos, gobiernos y desarrolladoras a lo largo de 20 años de trayectoria.';
  // CTA
  proyCtaTitulo = '¿Tu marca podría ser la *siguiente?*';
  proyCtaDescripcion =
    'Conversemos sobre tu proyecto. Te explicamos cómo podemos sumarnos a tu visión.';

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
      { id: 'todos', label: 'Todos', count: this.proyectos.length },
      ...cats.map((c) => ({
        id: c,
        label: c.charAt(0).toUpperCase() + c.slice(1),
        count: this.proyectos.filter((p) => p.categoria === c).length,
      })),
    ];
  });

  proyectosFiltrados = computed(() => {
    let lista = this.proyectos;
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
    this.proyHeroBadge = this.contenidoService.getCampo(
      'proyectos',
      'hero',
      'badge',
      this.proyHeroBadge,
    );
    this.proyHeroTitulo = this.contenidoService.getCampo(
      'proyectos',
      'hero',
      'titulo',
      this.proyHeroTitulo,
    );
    this.proyHeroDescripcion = this.contenidoService.getCampo(
      'proyectos',
      'hero',
      'descripcion',
      this.proyHeroDescripcion,
    );

    this.proyIntroBadge = this.contenidoService.getCampo(
      'proyectos',
      'intro',
      'badge',
      this.proyIntroBadge,
    );
    this.proyIntroTitulo = this.contenidoService.getCampo(
      'proyectos',
      'intro',
      'titulo',
      this.proyIntroTitulo,
    );
    this.proyIntroDescripcion = this.contenidoService.getCampo(
      'proyectos',
      'intro',
      'descripcion',
      this.proyIntroDescripcion,
    );

    this.proyCtaTitulo = this.contenidoService.getCampo(
      'proyectos',
      'cta',
      'titulo',
      this.proyCtaTitulo,
    );
    this.proyCtaDescripcion = this.contenidoService.getCampo(
      'proyectos',
      'cta',
      'descripcion',
      this.proyCtaDescripcion,
    );
  }
}
