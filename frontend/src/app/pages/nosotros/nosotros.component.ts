import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Valor {
  icono: string;
  titulo: string;
  descripcion: string;
}

interface Hito {
  anio: string;
  titulo: string;
  descripcion: string;
}

interface Credencial {
  titulo: string;
  institucion: string;
  anio: string;
}

@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nosotros.component.html',
})
export class NosotrosComponent {

  // Info del arquitecto (después conectas a backend)
  arquitecto = {
    nombre: 'Arq. Carlos Vortiz',
    titulo: 'Fundador y Director General',
    foto: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600',
    biografia: 'Con más de 20 años transformando ideas en realidades arquitectónicas, el Arq. Carlos Vortiz fundó la firma en 2005 con la visión de elevar el estándar de la arquitectura en Durango. Egresado con honores y certificado en metodología BIM y PMI, ha liderado más de 150 proyectos residenciales, comerciales e industriales.',
    biografia2: 'Su filosofía combina diseño contemporáneo, eficiencia técnica y un profundo respeto por las necesidades del cliente. Cree firmemente que la buena arquitectura no es solo estética: es la capacidad de mejorar la vida de las personas que habitan los espacios.',
    contacto: {
      email: 'carlos@vortizarquitectos.com',
      linkedin: 'https://linkedin.com/in/...'
    }
  };

  hitos: Hito[] = [
    { anio: '2005', titulo: 'Fundación de Vortiz Arquitectos', descripcion: 'Inicio de la firma en Durango con un equipo de 3 personas.' },
    { anio: '2010', titulo: 'Certificación BIM y PMI', descripcion: 'Implementación de metodologías internacionales de gestión.' },
    { anio: '2015', titulo: 'Expansión regional', descripcion: 'Primeros proyectos fuera de Durango: Mazatlán, Monterrey y Guadalajara.' },
    { anio: '2020', titulo: '100+ proyectos entregados', descripcion: 'Alcanzamos el centenar de obras completadas con éxito.' },
    { anio: '2025', titulo: '20 años de trayectoria', descripcion: 'Consolidación como referencia en arquitectura del norte de México.' }
  ];

  credenciales: Credencial[] = [
    { titulo: 'Arquitecto Titulado', institucion: 'Universidad Juárez del Estado de Durango', anio: '2003' },
    { titulo: 'Maestría en Gestión de Proyectos', institucion: 'Tec de Monterrey', anio: '2008' },
    { titulo: 'Certificación BIM', institucion: 'Autodesk', anio: '2010' },
    { titulo: 'Project Management Professional (PMP)', institucion: 'Project Management Institute', anio: '2012' }
  ];

  valores: Valor[] = [
    { icono: 'shield-check', titulo: 'Calidad constructiva', descripcion: 'Materiales premium y supervisión técnica en cada etapa.' },
    { icono: 'hard-hat', titulo: 'Seguridad industrial', descripcion: 'Protocolos estrictos para proteger a trabajadores y clientes.' },
    { icono: 'leaf', titulo: 'Responsabilidad ambiental', descripcion: 'Diseños sostenibles que respetan el entorno.' },
    { icono: 'document-check', titulo: 'Cumplimiento normativo', descripcion: 'Apego a todas las normativas y permisos vigentes.' },
    { icono: 'handshake', titulo: 'Profesionalismo y ética', descripcion: 'Transparencia total en costos, tiempos y procesos.' },
    { icono: 'lightning', titulo: 'Eficiencia en diseño', descripcion: 'Metodología BIM y PMI para entregas puntuales.' }
  ];
}
