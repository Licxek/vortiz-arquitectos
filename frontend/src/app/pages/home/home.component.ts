import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Servicio {
  icono: string;
  titulo: string;
  descripcion: string;
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
    { icono: 'design', titulo: 'Diseño arquitectónico', descripcion: 'Planos, renders 3D y memorias técnicas que materializan tu visión.' },
    { icono: 'supervision', titulo: 'Supervisión de obra', descripcion: 'Control técnico, calidad y cumplimiento de tiempos durante toda la construcción.' },
    { icono: 'urban', titulo: 'Diseño urbano', descripcion: 'Planeación de fraccionamientos, iluminación y espacios públicos.' },
    { icono: 'remodel', titulo: 'Remodelación', descripcion: 'Transformamos espacios existentes con diseño moderno y funcional.' },
    { icono: 'consulting', titulo: 'Consultoría BIM', descripcion: 'Implementación de metodología BIM y PMI para gestión de proyectos.' },
    { icono: 'legal', titulo: 'Gestión técnica y legal', descripcion: 'Trámites, permisos y dictámenes técnicos para tu proyecto.' }
  ];

  proyectosDestacados: ProyectoDestacado[] = [
    { nombre: 'Toyota', iniciales: 'TY', categoria: 'Corporativo', ubicacion: 'Guanajuato', anio: 2018, colorMarca: '#EB0A1E' },
    { nombre: 'Bancomer', iniciales: 'BX', categoria: 'Corporativo', ubicacion: 'Durango', anio: 2015, colorMarca: '#004481' },
    { nombre: 'Aeropuerto de Cancún', iniciales: 'AC', categoria: 'Infraestructura', ubicacion: 'Quintana Roo', anio: 2019, colorMarca: '#00A859' },
    { nombre: 'Puente Baluarte', iniciales: 'PB', categoria: 'Infraestructura', ubicacion: 'Durango–Sinaloa', anio: 2012, colorMarca: '#6B7280' },
    { nombre: 'Casas Geo', iniciales: 'CG', categoria: 'Residencial', ubicacion: 'Varios estados', anio: 2017, colorMarca: '#7DC242' },
    { nombre: 'COFICAB', iniciales: 'CF', categoria: 'Industrial', ubicacion: 'Aguascalientes', anio: 2020, colorMarca: '#0066B3' },
    { nombre: 'Paseo Durango', iniciales: 'PD', categoria: 'Comercial', ubicacion: 'Durango', anio: 2016, colorMarca: '#F59E0B' },
    { nombre: 'Fanosa', iniciales: 'FN', categoria: 'Industrial', ubicacion: 'Durango', anio: 2022, colorMarca: '#DC2626' }
  ];

  pasos: Paso[] = [
    { numero: '01', titulo: 'Conversación inicial', descripcion: 'Escuchamos tu visión, necesidades y presupuesto para entender el proyecto.' },
    { numero: '02', titulo: 'Diseño y planeación', descripcion: 'Desarrollamos planos, renders 3D y cronograma detallado.' },
    { numero: '03', titulo: 'Ejecución supervisada', descripcion: 'Construimos con metodología BIM y supervisión técnica constante.' },
    { numero: '04', titulo: 'Entrega y acompañamiento', descripcion: 'Te entregamos el proyecto terminado con soporte post-construcción.' }
  ];

  ngOnInit() {}
}
