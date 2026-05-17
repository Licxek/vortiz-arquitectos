import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Servicio {
  icono: string;
  titulo: string;
  descripcion: string;
}

interface Proyecto {
  imagen: string;
  titulo: string;
  categoria: string;
  ubicacion: string;
}

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
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {

  stats: Stat[] = [
    { valor: '20+', label: 'Años de experiencia' },
    { valor: '150+', label: 'Proyectos completados' },
    { valor: '120+', label: 'Clientes satisfechos' },
    { valor: '12', label: 'Especialistas en el equipo' }
  ];

  servicios: Servicio[] = [
    { icono: 'design', titulo: 'Diseño arquitectónico', descripcion: 'Planos, renders 3D y memorias técnicas que materializan tu visión.' },
    { icono: 'supervision', titulo: 'Supervisión de obra', descripcion: 'Control técnico, calidad y cumplimiento de tiempos durante toda la construcción.' },
    { icono: 'urban', titulo: 'Diseño urbano', descripcion: 'Planeación de fraccionamientos, iluminación y espacios públicos.' },
    { icono: 'remodel', titulo: 'Remodelación', descripcion: 'Transformamos espacios existentes con diseño moderno y funcional.' },
    { icono: 'consulting', titulo: 'Consultoría BIM', descripcion: 'Implementación de metodología BIM y PMI para gestión de proyectos.' },
    { icono: 'legal', titulo: 'Gestión técnica y legal', descripcion: 'Trámites, permisos y dictámenes técnicos para tu proyecto.' }
  ];

  proyectosDestacados: Proyecto[] = [
    { imagen: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', titulo: 'Residencia Las Flores', categoria: 'Residencial', ubicacion: 'La Forestal, Durango' },
    { imagen: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', titulo: 'Corporativo Centro', categoria: 'Comercial', ubicacion: 'Centro, Durango' },
    { imagen: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', titulo: 'Casa Loma del Parque', categoria: 'Residencial', ubicacion: 'Loma Dorada' },
    { imagen: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', titulo: 'Oficinas Tecnológica', categoria: 'Corporativo', ubicacion: 'Zona Industrial' },
    { imagen: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', titulo: 'Plaza Comercial', categoria: 'Comercial', ubicacion: 'Av. 20 de Noviembre' },
    { imagen: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', titulo: 'Villa Costanera', categoria: 'Residencial', ubicacion: 'Mazatlán, Sinaloa' }
  ];

  pasos: Paso[] = [
    { numero: '01', titulo: 'Conversación inicial', descripcion: 'Escuchamos tu visión, necesidades y presupuesto para entender el proyecto.' },
    { numero: '02', titulo: 'Diseño y planeación', descripcion: 'Desarrollamos planos, renders 3D y cronograma detallado.' },
    { numero: '03', titulo: 'Ejecución supervisada', descripcion: 'Construimos con metodología BIM y supervisión técnica constante.' },
    { numero: '04', titulo: 'Entrega y acompañamiento', descripcion: 'Te entregamos el proyecto terminado con soporte post-construcción.' }
  ];

  ngOnInit() {}
}
