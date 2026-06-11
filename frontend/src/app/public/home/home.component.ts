import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  activo: boolean;
}



@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',

})
export class HomeComponent implements OnInit {

  // ── Servicios ────────────────────────────────────────────────
  serviciosMostrados = 7; // 7 visibles + tarjeta "+Más"
  servicios: Servicio[] = [
    {
      id: 1,
      nombre: 'Control técnico y legal del proyecto.',
      descripcion: 'Supervisión integral con normativas vigentes.',
      icono: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      activo: true,
    },
    {
      id: 2,
      nombre: 'Seguimiento y control de calidad en construcción.',
      descripcion: 'Monitoreo permanente de estándares.',
      icono:
        'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      activo: true,
    },
    {
      id: 3,
      nombre: 'Planeación, coordinación y ejecución estratégica.',
      descripcion: 'Metodología PMI para resultados óptimos.',
      icono:
        'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      activo: true,
    },
    {
      id: 4,
      nombre: 'Desarrollo arquitectónico digital y técnico.',
      descripcion: 'BIM y herramientas de vanguardia.',
      icono:
        'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      activo: true,
    },
    {
      id: 5,
      nombre: 'Proyectos para fraccionamientos y espacios residenciales.',
      descripcion: 'Diseño de comunidades habitacionales.',
      icono:
        'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      activo: true,
    },
    {
      id: 6,
      nombre: 'Planeación y diseño de iluminación urbana.',
      descripcion: 'Soluciones lumínicas eficientes.',
      icono:
        'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      activo: true,
    },
    {
      id: 7,
      nombre: 'Ejecución completa de viviendas.',
      descripcion: 'Construcción llave en mano.',
      icono:
        'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
      activo: true,
    },
    {
      id: 8,
      nombre: 'Gestión de permisos y trámites.',
      descripcion: 'Apoyo legal y administrativo.',
      icono:
        'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2',
      activo: true,
    },
    {
      id: 9,
      nombre: 'Valuación y dictámenes técnicos.',
      descripcion: 'Informes con respaldo profesional.',
      icono:
        'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      activo: true,
    },
    {
      id: 10,
      nombre: 'Consultoría en sustentabilidad.',
      descripcion: 'Proyectos amigables con el medio ambiente.',
      icono:
        'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      activo: true,
    },
    {
      id: 11,
      nombre: 'Remodelaciones y ampliaciones.',
      descripcion: 'Transformamos espacios existentes.',
      icono:
        'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
      activo: true,
    },
  ];

  get serviciosVisibles(): Servicio[] {
    return this.servicios.slice(0, this.serviciosMostrados);
  }

  get serviciosRestantes(): number {
    return Math.max(0, this.servicios.length - this.serviciosMostrados);
  }

  // ── Animaciones reveal ───────────────────────────────────────
  heroVisible = false;
  serviciosVisible = false;
  ctaVisible = false;

  constructor(private http: HttpClient, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.loadServicios();
    setTimeout(() => {
      this.heroVisible = true;
      setTimeout(() => (this.serviciosVisible = true), 200);
      setTimeout(() => (this.ctaVisible = true), 400);
    }, 100);
  }

  // ── API ──────────────────────────────────────────────────────
  loadServicios(): void {
    this.http
      .get<Servicio[]>('/api/servicios')
      .pipe(catchError(() => of([])))
      .subscribe((data) => {
        if (data.length > 0) this.servicios = data;
      });
  }
}
