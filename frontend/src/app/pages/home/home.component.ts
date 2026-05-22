import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Servicio {
  icono: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  imagen: string;
}

interface ProyectoDestacado {
  nombre: string;
  iniciales: string;
  logoUrl?: string;
  categoria: string;
  ubicacion: string;
  anio: number;
  colorMarca: string;
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
    {
      titulo: 'Diseño y Modelado de proyecto Arquitectónico BIM',
      descripcion: 'Servicio que integra el modelado BIM para desarrollar un proyecto digital preciso y coordinado, junto con la metodología PMI para una gestión eficiente. Permite optimizar tiempos, costos y recursos, reducir errores y asegurar un mejor control durante todo el desarrollo del proyecto.',
      imagen: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80',
      categoria: 'Diseño',
      icono: 'cube'
    },
    {
      titulo: 'Construcción Residencial',
      descripcion: 'Construcción de casa habitación, remodelación de casa habitación, casa habitación en serie y Residencial.',
      imagen: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=600&q=80',
      categoria: 'Construcción',
      icono: 'home'
    },
    {
      titulo: 'Construcción Industrial',
      descripcion: 'Ejecución de obra civil, bodegas, naves industriales, centros comerciales, urbanismo y edificios verticales.',
      imagen: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=600&q=80',
      categoria: 'Construcción',
      icono: 'factory'
    },
    {
      titulo: 'Supervisión de Proyectos de construcción en general',
      descripcion: 'Control total de construcción para lograr una correcta ejecución de los proyectos, en cuanto tiempo, costo, seguridad y calidad.',
      imagen: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80',
      categoria: 'Gerencia',
      icono: 'eye'
    },
    {
      titulo: 'Gerencia de proyectos',
      descripcion: 'Coordinación en la selección de especialistas y asesores específicos, recomendación para la contratación de empresas contratistas y de servicios, licitación y presentación de propuestas, concursos de obra, revisión de números generadores de obra, estimaciones de obra, escalatorias, reclamos de obra y ajuste de costos.',
      imagen: 'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=600&q=80',
      categoria: 'Gerencia',
      icono: 'users'
    },
    {
      titulo: 'Consultoría para tu proyecto de construcción',
      descripcion: 'Recabamos la información preliminar disponible de terrenos (normativa, mecánica de suelos, topografía y factibilidades).',
      imagen: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80',
      categoria: 'Diseño',
      icono: 'chat'
    }
  ];

  proyectosDestacados: ProyectoDestacado[] = [
    { nombre: 'Toyota', iniciales: 'TY', logoUrl: '/assets/img/icons/logoToyota.ico', categoria: 'Corporativo', ubicacion: 'Guanajuato', anio: 2018, colorMarca: '#EB0A1E' },
    { nombre: 'Bancomer', iniciales: 'BX', logoUrl: '/assets/img/icons/logoBBVA.ico', categoria: 'Corporativo', ubicacion: 'Durango', anio: 2015, colorMarca: '#004481' },
    { nombre: 'Aeropuerto de Cancún', iniciales: 'AC', logoUrl: '/assets/img/icons/logoAirport.ico', categoria: 'Infraestructura', ubicacion: 'Quintana Roo', anio: 2019, colorMarca: '#00A859' },
    { nombre: 'Puente Baluarte', iniciales: 'PB', logoUrl: '/assets/img/icons/logoPuente.ico', categoria: 'Infraestructura', ubicacion: 'Durango–Sinaloa', anio: 2012, colorMarca: '#6B7280' },
    { nombre: 'Casas Geo', iniciales: 'CG', logoUrl: '/assets/img/icons/logoCasas.ico', categoria: 'Residencial', ubicacion: 'Varios estados', anio: 2017, colorMarca: '#7DC242' },
    { nombre: 'COFICAB', iniciales: 'CF', logoUrl: '/assets/img/icons/logoCoficab.svg', categoria: 'Industrial', ubicacion: 'Aguascalientes', anio: 2020, colorMarca: '#0066B3' },
    { nombre: 'Paseo Durango', iniciales: 'PD', logoUrl: '/assets/img/icons/logoPaseo.ico', categoria: 'Comercial', ubicacion: 'Durango', anio: 2016, colorMarca: '#F59E0B' },
    { nombre: 'Fanosa', iniciales: 'FN', logoUrl: '/assets/img/icons/logoFanosa.ico', categoria: 'Industrial', ubicacion: 'Durango', anio: 2022, colorMarca: '#DC2626' }
  ];

  pasos: Paso[] = [
    { numero: '01', titulo: 'Conversación inicial', descripcion: 'Escuchamos tu visión, necesidades y presupuesto para entender el proyecto.' },
    { numero: '02', titulo: 'Diseño y planeación', descripcion: 'Desarrollamos planos, renders 3D y cronograma detallado.' },
    { numero: '03', titulo: 'Ejecución supervisada', descripcion: 'Construimos con metodología BIM y supervisión técnica constante.' },
    { numero: '04', titulo: 'Entrega y acompañamiento', descripcion: 'Te entregamos el proyecto terminado con soporte post-construcción.' }
  ];

  ngOnInit() {}
}
