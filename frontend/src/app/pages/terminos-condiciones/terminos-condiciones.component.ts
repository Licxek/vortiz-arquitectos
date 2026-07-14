import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ContenidoService } from '../../core/services/contenido.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe';
import { ActivatedRoute, Router } from '@angular/router';
import { scrollAlInicio } from '../../core/utils/scroll.util';


@Component({
  selector: 'app-terminos-condiciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormatoTextoPipe],
  templateUrl: './terminos-condiciones.component.html',
})
export class TerminosCondicionesComponent implements OnInit {
  private contenido = inject(ContenidoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  offsetTopSidebar = 96; // valor default, se ajusta dinámicamente

  // Hero
  heroBadge = signal('');
  heroTitulo = signal('');
  heroDescripcion = signal('');
  fechaActualizacion = signal('');

  // Secciones simples (todas siguen el mismo patrón: título + contenido)
  aceptacion = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
  usoSitio = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
  servicios = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
  propiedadIntelectual = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
  responsabilidad = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
  modificaciones = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
  legislacion = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });

  // Contacto
  contacto = signal<{ titulo: string; descripcion: string }>({ titulo: '', descripcion: '' });
  contactoLegal = signal<string>('admin@vortizarquitectos.com.mx');

  ngOnInit() {
    const key = 'terminosCondiciones';

    // Hero
    this.heroBadge.set(this.contenido.getCampo(key, 'hero', 'badge'));
    this.heroTitulo.set(this.contenido.getCampo(key, 'hero', 'titulo'));
    this.heroDescripcion.set(this.contenido.getCampo(key, 'hero', 'descripcion'));
    this.fechaActualizacion.set(this.contenido.getCampo(key, 'hero', 'fechaActualizacion'));

    // Secciones
    this.aceptacion.set({
      titulo: this.contenido.getCampo(key, 'aceptacion', 'titulo'),
      contenido: this.contenido.getCampo(key, 'aceptacion', 'contenido'),
    });
    this.usoSitio.set({
      titulo: this.contenido.getCampo(key, 'usoSitio', 'titulo'),
      contenido: this.contenido.getCampo(key, 'usoSitio', 'contenido'),
    });
    this.servicios.set({
      titulo: this.contenido.getCampo(key, 'servicios', 'titulo'),
      contenido: this.contenido.getCampo(key, 'servicios', 'contenido'),
    });
    this.propiedadIntelectual.set({
      titulo: this.contenido.getCampo(key, 'propiedadIntelectual', 'titulo'),
      contenido: this.contenido.getCampo(key, 'propiedadIntelectual', 'contenido'),
    });
    this.responsabilidad.set({
      titulo: this.contenido.getCampo(key, 'responsabilidad', 'titulo'),
      contenido: this.contenido.getCampo(key, 'responsabilidad', 'contenido'),
    });
    this.modificaciones.set({
      titulo: this.contenido.getCampo(key, 'modificaciones', 'titulo'),
      contenido: this.contenido.getCampo(key, 'modificaciones', 'contenido'),
    });
    this.legislacion.set({
      titulo: this.contenido.getCampo(key, 'legislacion', 'titulo'),
      contenido: this.contenido.getCampo(key, 'legislacion', 'contenido'),
    });
    this.contacto.set({
      titulo: this.contenido.getCampo(key, 'contacto', 'titulo'),
      descripcion: this.contenido.getCampo(key, 'contacto', 'descripcion'),
    });

    // Scroll top al cargar
    scrollAlInicio(false); // instant

    // 🎯 Escuchar cambios de query params para hacer scroll a sección
    // Funciona tanto al entrar por primera vez como al re-buscar estando en la misma página
    this.route.queryParamMap.subscribe((params) => {
      const seccion = params.get('seccion');
      if (seccion) {
        this.intentarScrollASeccion(seccion, 0);
      }
    });

    // Ajustar sidebar según altura real del navbar
    setTimeout(() => this.ajustarSidebar(), 100);
    window.addEventListener('resize', () => this.ajustarSidebar());
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.ajustarSidebar());
  }

  scrollASeccion(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private ajustarSidebar() {
    // Medir la altura real del navbar y ajustar
    const navbar = document.querySelector('app-navbar') as HTMLElement;
    if (navbar) {
      const alturaNavbar = navbar.getBoundingClientRect().height;
      this.offsetTopSidebar = Math.ceil(alturaNavbar) + 24; // +24 de margen
    }
  }

  private scrollTimer: any = null;

  /** Intenta scrollear a la sección con retries por si el DOM aún no está listo */
  private intentarScrollASeccion(seccion: string, intento: number) {
    const MAX_INTENTOS = 15;
    const DELAY_MS = 150;

    // Cancelar cualquier scroll previo pendiente (por si el usuario hace click rápido en varias secciones)
    if (intento === 0 && this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }

    this.scrollTimer = setTimeout(() => {
      const el = document.getElementById(seccion);

      if (el) {
        // Elemento encontrado, hacer scroll suave
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Limpiar el query param SIN que Angular haga scroll al top
        setTimeout(() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('seccion');
          window.history.replaceState({}, '', url.toString());
        }, 1500);
        return;
      }

      // No se encontró aún, reintentar
      if (intento < MAX_INTENTOS) {
        this.intentarScrollASeccion(seccion, intento + 1);
      } else {
        console.warn(`No se pudo scrollear a la sección "${seccion}" tras ${MAX_INTENTOS} intentos`);
      }
    }, DELAY_MS);
  }
}
