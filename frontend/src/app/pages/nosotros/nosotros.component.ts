import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ContenidoService } from '../../core/services/contenido.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

interface Valor {
  icono: string;
  titulo: string;
  descripcion: string;
}

interface Hito {
  anio: string;
  titulo: string;
  descripcion: string;
}

interface Credencial {
  titulo: string;
  institucion: string;
  anio: string;
}

@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [CommonModule, RouterModule, FormatoTextoPipe, SkeletonComponent, NgOptimizedImage],
  templateUrl: './nosotros.component.html',
})
export class NosotrosComponent implements OnInit {
  private contenidoService = inject(ContenidoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  cargando = signal(false);

  // ============ HERO ============
  heroBadge = '';
  heroTitulo = '';
  heroDescripcion = '';
  heroImagenFondo = '';

  // ============ INTRO ============
  introBadge = '';
  introTitulo = '';
  introDescripcion = '';

  // ============ MISIÓN ============
  misionTitulo = '';
  misionDescripcion = '';

  // ============ VISIÓN ============
  visionTitulo = '';
  visionDescripcion = '';

  // ============ ARQUITECTO ============
  arquitecto = {
    nombre: '',
    titulo: '',
    foto: '',
    biografia: '',
    biografia2: '',
    contacto: {
      email: '',
      linkedin: '',
    },
  };

  // ============ VALORES ============
  valoresBadge = '';
  valoresTitulo = '';
  valoresDescripcion = '';

  // ============ CTA ============
  ctaTitulo = '';
  ctaDescripcion = '';

  // ============ LISTAS DINÁMICAS (de BD) ============
  valores: Valor[] = [];
  hitos: Hito[] = [];
  credenciales: Credencial[] = [];

  ngOnInit() {
    // ============ HERO ============
    this.heroBadge = this.contenidoService.getCampo('nosotros', 'hero', 'badge');
    this.heroTitulo = this.contenidoService.getCampo('nosotros', 'hero', 'titulo');
    this.heroDescripcion = this.contenidoService.getCampo('nosotros', 'hero', 'descripcion');
    this.heroImagenFondo = this.contenidoService.getCampo('nosotros', 'hero', 'imagenFondo');

    // ============ INTRO ============
    this.introBadge = this.contenidoService.getCampo('nosotros', 'intro', 'badge');
    this.introTitulo = this.contenidoService.getCampo('nosotros', 'intro', 'titulo');
    this.introDescripcion = this.contenidoService.getCampo('nosotros', 'intro', 'descripcion');

    // ============ MISIÓN ============
    this.misionTitulo = this.contenidoService.getCampo('nosotros', 'mision', 'titulo');
    this.misionDescripcion = this.contenidoService.getCampo('nosotros', 'mision', 'descripcion');

    // ============ VISIÓN ============
    this.visionTitulo = this.contenidoService.getCampo('nosotros', 'vision', 'titulo');
    this.visionDescripcion = this.contenidoService.getCampo('nosotros', 'vision', 'descripcion');

    // ============ ARQUITECTO ============
    this.arquitecto.nombre = this.contenidoService.getCampo('nosotros', 'arquitecto', 'nombre');
    this.arquitecto.titulo = this.contenidoService.getCampo('nosotros', 'arquitecto', 'titulo');
    this.arquitecto.foto = this.contenidoService.getCampo('nosotros', 'arquitecto', 'foto');
    this.arquitecto.biografia = this.contenidoService.getCampo('nosotros', 'arquitecto', 'biografia');
    this.arquitecto.biografia2 = this.contenidoService.getCampo('nosotros', 'arquitecto', 'biografia2');
    this.arquitecto.contacto.email = this.contenidoService.getCampo('nosotros', 'arquitecto', 'email');
    this.arquitecto.contacto.linkedin = this.contenidoService.getCampo('nosotros', 'arquitecto', 'linkedin');

    // ============ CREDENCIALES (lista) ============
    this.credenciales = this.contenidoService.getLista<Credencial>('nosotros', 'credenciales', []);

    // ============ HITOS (lista) ============
    this.hitos = this.contenidoService.getLista<Hito>('nosotros', 'hitos', []);

    // ============ VALORES (encabezado + lista) ============
    this.valoresBadge = this.contenidoService.getCampo('nosotros', 'valores', 'badge');
    this.valoresTitulo = this.contenidoService.getCampo('nosotros', 'valores', 'titulo');
    this.valoresDescripcion = this.contenidoService.getCampo('nosotros', 'valores', 'descripcion');
    this.valores = this.contenidoService.getLista<Valor>('nosotros', 'valores', []);

    // ============ CTA ============
    this.ctaTitulo = this.contenidoService.getCampo('nosotros', 'cta', 'titulo');
    this.ctaDescripcion = this.contenidoService.getCampo('nosotros', 'cta', 'descripcion');

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
  }
}
