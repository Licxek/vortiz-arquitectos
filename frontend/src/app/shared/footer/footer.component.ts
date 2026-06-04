import { Component, OnInit, HostListener, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage  } from '@angular/common';
import { RouterModule } from '@angular/router';
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
