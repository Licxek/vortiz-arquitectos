import { Component, OnInit, HostListener, ChangeDetectorRef, signal, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ConfiguracionService, Configuracion } from '../../core/services/configuracion.service';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { TelefonoFormatoPipe } from '../pipes/telefono-formato.pipe';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, RevealDirective, NgOptimizedImage, SkeletonComponent,TelefonoFormatoPipe],
  templateUrl: './footer.component.html',
})
export class FooterComponent implements OnInit {
  configuracion: Configuracion | null = null;
  anio = new Date().getFullYear();
  mostrarArriba = false;
  cargando = signal(true);
  private sanitizer = inject(DomSanitizer);

  navLinks = [
    { label: 'Inicio', path: '/home' },
    { label: 'Servicios', path: '/servicios' },
    { label: 'Proyectos', path: '/proyectos' },
    { label: 'Nosotros', path: '/nosotros' },
  ];

  constructor(
    private configuracionService: ConfiguracionService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** URL del iframe de Google Maps (se cachea, solo se recalcula si cambia la dirección) */
  mapaUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    `https://maps.google.com/maps?q=${encodeURIComponent('Milpillas 101, La Forestal, Durango, Mexico')}&output=embed`,
  );

  /** Link "Ver en Google Maps" */
  mapaLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Milpillas 101, La Forestal, Durango')}`;

  /** Dirección actual cacheada para detectar cambios reales */
  private direccionCacheada = '';

  @HostListener('window:scroll')
  onScroll() {
    this.mostrarArriba = window.scrollY > 400;
  }

  scrollArriba() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit() {
    this.configuracionService.configPublica$.subscribe((c) => {
      this.configuracion = c;

      // Solo recalcular el mapa si la dirección REALMENTE cambió
      const direccionNueva = c?.direccion || 'Milpillas 101, La Forestal, Durango, Mexico';
      if (direccionNueva !== this.direccionCacheada) {
        this.direccionCacheada = direccionNueva;
        this.mapaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://maps.google.com/maps?q=${encodeURIComponent(direccionNueva)}&output=embed`,
        );
        this.mapaLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionNueva)}`;
      }

      this.cargando.set(false);
      this.cdr.markForCheck();
    });
  }
}
