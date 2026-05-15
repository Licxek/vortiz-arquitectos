import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Servicio {
  id: number;
  titulo: string;
  descripcion: string;
  imagen: string;
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './servicios.component.html',
})
export class ServiciosComponent {
  servicioActivo = signal<Servicio | null>(null);

  servicios: Servicio[] = [
    {
      id: 1,
      titulo: 'Trámite relacionados a desarrollo urbano',
      descripcion: 'Servicio enfocado en gestionar y dar seguimiento a todos los trámites necesarios ante desarrollo urbano para el desarrollo de un proyecto, asegurando el cumplimiento de normativas urbanas. Incluye permisos, licencias y asesoría técnica para agilizar procesos, reducir riesgos y garantizar la viabilidad del proyecto desde su inicio.',
      imagen: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
    },
    {
      id: 2,
      titulo: 'Gerencia de Construcción y Director Responsable de Obra (DRO)',
      descripcion: 'Gestoría e Intermediación ante dependencias para permisos de construcción, licencias y regularizaciones.',
      imagen: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80',
    },
    {
      id: 3,
      titulo: 'Gerencia de proyectos',
      descripcion: 'Coordinación en la selección de especialistas y asesores específicos, recomendación para la contratación de empresas contratistas y de servicios, licitación y presentación de propuestas, concursos de obra, revisión de números generadores de obra, estimaciones de obra, escalatorias, reclamos de obra y ajuste de costos.',
      imagen: 'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=600&q=80',
    },
    {
      id: 4,
      titulo: 'Supervisión de Proyectos de construcción en general',
      descripcion: 'Control total de construcción para lograr una correcta ejecución de los proyectos, en cuanto tiempo, costo, seguridad y calidad.',
      imagen: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80',
    },
    {
      id: 5,
      titulo: 'Diseño y Modelado de proyecto Arquitectónico BIM',
      descripcion: 'Servicio que integra el modelado BIM para desarrollar un proyecto digital preciso y coordinado, junto con la metodología PMI para una gestión eficiente. Permite optimizar tiempos, costos y recursos, reducir errores y asegurar un mejor control durante todo el desarrollo del proyecto.',
      imagen: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80',
    },
    {
      id: 6,
      titulo: 'Dictámenes de uso de suelo',
      descripcion: 'Servicio enfocado en analizar y gestionar el dictamen que define los usos permitidos de un predio. Incluye revisión normativa, trámite ante autoridades y asesoría para asegurar la viabilidad del proyecto y evitar riesgos legales.',
      imagen: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80',
    },
    {
      id: 7,
      titulo: 'Dictamen Estructural',
      descripcion: 'Evaluación estructural completa, detección de fallas y riesgos, dictamen técnico profesional y cumplimiento normativo.',
      imagen: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=600&q=80',
    },
    {
      id: 8,
      titulo: 'Elaboración de proyectos de áreas verdes para colonias y fraccionamientos',
      descripcion: 'Áreas de descanso, juegos infantiles, pista para caminar, andadores y mobiliario según lo establece el reglamento vigente.',
      imagen: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80',
    },
    {
      id: 9,
      titulo: 'Elaboración de proyectos de sistemas de riego por aspersión automatizada',
      descripcion: 'Proyectos de sistema de riego por aspersión automatizado, el cual consiste en almacenamiento de agua para el riego por aspersión y goteo, elaboramos memoria de cálculo según requerimientos y normas vigentes.',
      imagen: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    },
    {
      id: 10,
      titulo: 'Elaboración de proyectos de alumbrado público',
      descripcion: 'Proyectos de alumbrado público en baja tensión en vialidades y áreas verdes, para fraccionamientos y colonias, seleccionando las luminarias más eficientes con tecnología LED, cumpliendo con los requerimientos de alumbrado público, incluye memoria técnica apegándose a la NOM-001 y NOM-013.',
      imagen: 'https://images.unsplash.com/photo-1515191107209-c28698631303?w=600&q=80',
    },
    {
      id: 11,
      titulo: 'Construcción Residencial',
      descripcion: 'Construcción de casa habitación, remodelación de casa habitación, casa habitación en serie y Residencial.',
      imagen: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=600&q=80',
    },
    {
      id: 12,
      titulo: 'Construcción Industrial',
      descripcion: 'Ejecución de obra civil, bodegas, naves industriales, centros comerciales, urbanismo y edificios verticales.',
      imagen: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=600&q=80',
    },
    {
      id: 13,
      titulo: 'Consultoría para tu proyecto de construcción',
      descripcion: 'Recabamos la información preliminar disponible de terrenos (normativa, mecánica de suelos, topografía y factibilidades).',
      imagen: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80',
    },
    {
      id: 14,
      titulo: 'Asesoría en Licitaciones, Ajustes de Costos de obra y Reclamos de Obra',
      descripcion: 'Servicio que brinda apoyo en licitaciones, ajustes de costos y reclamos de obra, asegurando propuestas sólidas, correcta justificación de variaciones y respaldo técnico-contractual, con el objetivo de proteger los intereses económicos de nuestro cliente y reducir riesgos durante el proyecto.',
      imagen: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80',
    },
  ];

  abrirServicio(servicio: Servicio) {
    this.servicioActivo.set(servicio);
  }

  cerrarModal() {
    this.servicioActivo.set(null);
  }


}
