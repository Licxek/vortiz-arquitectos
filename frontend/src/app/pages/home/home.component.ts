import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ContenidoService } from '../../core/services/contenido.service';
import { CatalogoService, Servicio, Proyecto } from '../../core/services/catalogo.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

interface Paso {
  numero: string;
  titulo: string;
  descripcion: string;
}

interface Stat {
  valor: string;
  label: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormatoTextoPipe, SkeletonComponent, NgOptimizedImage],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  // ============ LISTAS DINÁMICAS (vienen de BD) ============
  stats: Stat[] = [];
  pasos: Paso[] = [];

  // ============ CATÁLOGOS ============
  servicios: Servicio[] = [];
  proyectosDestacados: Proyecto[] = [];
  serviciosVisibles: Servicio[] = [];
  proyectosVisibles: Proyecto[] = [];

  // ============ HERO (texto editable desde admin) ============
  heroBadge = '';
  heroTitulo = '';
  heroDescripcion = '';
  heroImagenFondo = '';
  heroCta1 = '';
  heroCta2 = '';

  // ============ FILOSOFÍA ============
  filoBadge = '';
  filoTitulo = '';
  filoParrafo1 = '';
  filoParrafo2 = '';
  filoImagen = '';

  // ============ SERVICIOS (encabezado) ============
  servBadge = '';
  servTitulo = '';
  servDescripcion = '';

  // ============ PROYECTOS (encabezado) ============
  proyBadge = '';
  proyTitulo = '';

  // ============ PROCESO (encabezado) ============
  procBadge = '';
  procTitulo = '';

  // ============ CTA FINAL ============
  ctaBadge = '';
  ctaTitulo = '';
  ctaDescripcion = '';
  ctaBoton1 = '';
  ctaBoton2 = '';
  ctaImagenFondo = '';

  private contenidoService = inject(ContenidoService);
  private catalogo = inject(CatalogoService);

  ngOnInit() {
    // Catálogos
    this.servicios = this.catalogo.getServicios();
    this.proyectosDestacados = this.catalogo.getProyectos();

    // ============ HERO ============
    this.heroBadge = this.contenidoService.getCampo('inicio', 'hero', 'badge');
    this.heroTitulo = this.contenidoService.getCampo('inicio', 'hero', 'titulo');
    this.heroDescripcion = this.contenidoService.getCampo('inicio', 'hero', 'descripcion');
    this.heroImagenFondo = this.contenidoService.getCampo('inicio', 'hero', 'imagenFondo');
    this.heroCta1 = this.contenidoService.getCampo('inicio', 'hero', 'cta1');
    this.heroCta2 = this.contenidoService.getCampo('inicio', 'hero', 'cta2');

    // ============ FILOSOFÍA ============
    this.filoBadge = this.contenidoService.getCampo('inicio', 'filosofia', 'badge');
    this.filoTitulo = this.contenidoService.getCampo('inicio', 'filosofia', 'titulo');
    this.filoParrafo1 = this.contenidoService.getCampo('inicio', 'filosofia', 'parrafo1');
    this.filoParrafo2 = this.contenidoService.getCampo('inicio', 'filosofia', 'parrafo2');
    this.filoImagen = this.contenidoService.getCampo('inicio', 'filosofia', 'imagen');

    // ============ STATS (lista) ============
    this.stats = this.contenidoService.getLista<Stat>('inicio', 'stats', []);

    // ============ SERVICIOS (encabezado) ============
    this.servBadge = this.contenidoService.getCampo('inicio', 'servicios', 'badge');
    this.servTitulo = this.contenidoService.getCampo('inicio', 'servicios', 'titulo');
    this.servDescripcion = this.contenidoService.getCampo('inicio', 'servicios', 'descripcion');

    // ============ PROYECTOS (encabezado) ============
    this.proyBadge = this.contenidoService.getCampo('inicio', 'proyectos', 'badge');
    this.proyTitulo = this.contenidoService.getCampo('inicio', 'proyectos', 'titulo');

    // ============ PROCESO (lista) ============
    this.procBadge = this.contenidoService.getCampo('inicio', 'proceso', 'badge');
    this.procTitulo = this.contenidoService.getCampo('inicio', 'proceso', 'titulo');
    this.pasos = this.contenidoService.getLista<Paso>('inicio', 'proceso', []);

    // ============ CTA FINAL ============
    this.ctaBadge = this.contenidoService.getCampo('inicio', 'cta', 'badge');
    this.ctaTitulo = this.contenidoService.getCampo('inicio', 'cta', 'titulo');
    this.ctaDescripcion = this.contenidoService.getCampo('inicio', 'cta', 'descripcion');
    this.ctaBoton1 = this.contenidoService.getCampo('inicio', 'cta', 'cta1');
    this.ctaBoton2 = this.contenidoService.getCampo('inicio', 'cta', 'cta2');
    this.ctaImagenFondo = this.contenidoService.getCampo('inicio', 'cta', 'imagenFondo');

    // ============ SERVICIOS - cuáles mostrar ============
    const servSel = this.contenidoService.getCampo('inicio', 'servicios', 'visibles', '');
    this.serviciosVisibles = this.filtrarPorSeleccion(this.servicios, servSel).slice(0, 6);

    // ============ PROYECTOS - cuáles mostrar ============
    const proySel = this.contenidoService.getCampo('inicio', 'proyectos', 'visibles', '');
    this.proyectosVisibles = this.filtrarPorSeleccion(this.proyectosDestacados, proySel).slice(0, 8);
  }

  private filtrarPorSeleccion<T extends { id: number }>(lista: T[], seleccion: string): T[] {
    if (!seleccion.trim()) return lista;
    const ids = seleccion
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    return lista.filter((item) => ids.includes(item.id));
  }

  etiquetaServicio(cat: string): string {
    return this.catalogo.etiquetaCategoriaServicio(cat);
  }
}
