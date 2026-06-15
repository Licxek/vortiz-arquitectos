import { Component, OnInit, HostListener, ChangeDetectorRef, signal, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ConfiguracionService, Configuracion } from '../../core/services/configuracion.service';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, RevealDirective, NgOptimizedImage, SkeletonComponent],
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

  /** URL del iframe de Google Maps embebido, basada en la dirección configurada */
  get mapaUrl(): SafeResourceUrl {
    const dir = this.configuracion?.direccion || 'Milpillas 101, La Forestal, Durango, Mexico';
    const url = `https://maps.google.com/maps?q=${encodeURIComponent(dir)}&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /** Link a Google Maps para "Ver en Google Maps" */
  get mapaLink(): string {
    const dir = this.configuracion?.direccion || 'Milpillas 101, La Forestal, Durango';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`;
  }

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
      this.cargando.set(false);
      this.cdr.markForCheck();
    });
  }
}
