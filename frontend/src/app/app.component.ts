import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterOutlet,
  NavigationEnd,
  NavigationStart,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { filter } from 'rxjs';
import { ThemeService } from './core/services/theme.service'; // ajusta ruta
import { Title, Meta } from '@angular/platform-browser';
import { ConfiguracionService } from './core/services/configuracion.service';
import { LoadingBarComponent } from './shared/loading-bar/loading-bar.component'; // 👈 NUEVO
import { DOCUMENT } from '@angular/common';
import { SessionExpiredModalComponent } from './shared/session-expired-modal/session-expired-modal.component';
import { scrollAlInicio } from './core/utils/scroll.util';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    LoadingBarComponent,
    SessionExpiredModalComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  ocultarChrome = this.calcularOcultarChrome(window.location.pathname);
  private doc = inject(DOCUMENT);
  private configuracion = inject(ConfiguracionService);

  constructor(
    private router: Router,
    private theme: ThemeService,
    private config: ConfiguracionService,
    private title: Title,
    private meta: Meta,
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe((event: any) => {
        this.ocultarChrome = this.calcularOcultarChrome(event.url);
      });

    // Corregir si la navegación se cancela o falla (guard rechaza, redirección, etc.)
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationCancel || event instanceof NavigationError),
      )
      .subscribe(() => {
        this.ocultarChrome = this.calcularOcultarChrome(this.router.url);
      });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyA') {
      event.preventDefault();
      this.router.navigate(['/admin/login']);
    }
  }

  ngOnInit() {
    this.theme.aplicar();
    this.config.cargarPublica();
    // SEO en vivo
    this.config.configPublica$.subscribe((c) => {
      if (!c) return;
      this.title.setTitle(c.meta_title);
      this.meta.updateTag({ name: 'description', content: c.meta_description });
      this.meta.updateTag({ name: 'keywords', content: c.meta_keywords });

      // 👇 NUEVO: Open Graph (Facebook, WhatsApp, LinkedIn)
      this.meta.updateTag({ property: 'og:title', content: c.meta_title });
      this.meta.updateTag({ property: 'og:description', content: c.meta_description });
      this.meta.updateTag({ property: 'og:type', content: 'website' });
      if (c.og_image_url) {
        this.meta.updateTag({ property: 'og:image', content: c.og_image_url });
      }

      // 👇 NUEVO: Twitter Card
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.meta.updateTag({ name: 'twitter:title', content: c.meta_title });
      this.meta.updateTag({ name: 'twitter:description', content: c.meta_description });
      if (c.og_image_url) {
        this.meta.updateTag({ name: 'twitter:image', content: c.og_image_url });
      }

      if (c?.favicon_url) {
        this.actualizarFavicon(c.favicon_url);
      }
      if (c?.meta_title) {
        this.doc.title = c.meta_title;
      }
    });

    this.config.cargarPublica(); // primera carga (dispara todo)

    // 🎯 Scroll top al cambiar de ruta
    // El scroll vive en <app-root>, no en window, entonces manejamos manualmente
    let urlAnterior = '';
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects || event.url;

        // 🎯 Si la URL trae ?seccion=, la página destino se encargará de scrollear
        // (buscador, deep links, etc). No pisamos su scrollIntoView.
        if (url.includes('seccion=')) {
          urlAnterior = url;
          return;
        }

        // 🎯 Si es la MISMA ruta que la anterior (solo cambió el query params),
        // no hacemos scroll top — es limpieza de queryParams, no navegación real.
        // Ejemplo: home?seccion=servicios → home (después de scrollIntoView)
        const rutaBase = url.split('?')[0];
        const rutaAnterior = urlAnterior.split('?')[0];
        if (rutaBase === rutaAnterior && urlAnterior !== '') {
          urlAnterior = url;
          return;
        }

        urlAnterior = url;
        scrollAlInicio(false);
      });
  }
  private calcularOcultarChrome(url: string): boolean {
    return url.startsWith('/admin') || url.startsWith('/mantenimiento');
  }
  private actualizarFavicon(url: string) {
    const link = this.doc.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (link) {
      link.href = url;
    }
  }
}
