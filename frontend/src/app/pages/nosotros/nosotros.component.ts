import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ContenidoService } from '../../core/services/contenido.service'; // ajusta ruta
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe'; // ajusta ruta

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
  imports: [CommonModule, RouterModule, FormatoTextoPipe],
  templateUrl: './nosotros.component.html',
})
export class NosotrosComponent {
  private contenidoService = inject(ContenidoService);

  // HERO
  heroBadge = 'Conoce nuestra firma';
  heroTitulo = 'Diseñamos con *propósito*, construimos con *historia*';
  heroDescripcion = 'Una firma de arquitectura nacida en Durango con visión nacional.';
  heroImagenFondo = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1920';
  // INTRO
  introBadge = 'Quiénes Somos';
  introTitulo = 'Más que arquitectos, somos creadores de espacios con identidad';
  introDescripcion =
    'Desde 2005, Vortiz Arquitectos ha sido sinónimo de diseño contemporáneo, eficiencia técnica y compromiso humano. Cada proyecto que tomamos es una oportunidad para transformar una idea en un lugar que perdure, que funcione, y que las personas que lo habitan disfruten cada día.';
  // MISIÓN
  misionTitulo = 'Acompañamos cada proyecto con confianza y compromiso';
  misionDescripcion =
    'Brindar soluciones arquitectónicas integrales que combinen creatividad, tecnología y precisión técnica, transformando los espacios de nuestros clientes en obras de calidad que perduren en el tiempo.';
  // VISIÓN
  visionTitulo = 'Ser referencia en arquitectura del norte de México';
  visionDescripcion =
    'Consolidarnos como una firma reconocida por la excelencia, la innovación y la construcción de relaciones sólidas con nuestros clientes, fortaleciendo nuestro liderazgo en cada proyecto.';
  // VALORES (encabezado)
  valoresBadge = 'Lo que nos define';
  valoresTitulo = 'Nuestros valores';
  valoresDescripcion =
    'Seis principios que rigen cada decisión, cada plano y cada obra que entregamos.';
  // CTA
  ctaTitulo = '¿Te gustaría trabajar con nosotros?';
  ctaDescripcion = 'Agenda una reunión inicial y descubre cómo podemos hacer realidad tu proyecto.';

  // Info del arquitecto (después conectas a backend)
  arquitecto = {
    nombre: 'Arq. Carlos Vortiz',
    titulo: 'Fundador y Director General',
    foto: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600',
    biografia:
      'Con más de 20 años transformando ideas en realidades arquitectónicas, el Arq. Carlos Vortiz fundó la firma en 2005 con la visión de elevar el estándar de la arquitectura en Durango. Egresado con honores y certificado en metodología BIM y PMI, ha liderado más de 150 proyectos residenciales, comerciales e industriales.',
    biografia2:
      'Su filosofía combina diseño contemporáneo, eficiencia técnica y un profundo respeto por las necesidades del cliente. Cree firmemente que la buena arquitectura no es solo estética: es la capacidad de mejorar la vida de las personas que habitan los espacios.',
    contacto: {
      email: 'carlos@vortizarquitectos.com',
      linkedin: 'https://linkedin.com/in/...',
    },
  };

  hitos: Hito[] = [
    {
      anio: '2005',
      titulo: 'Fundación de Vortiz Arquitectos',
      descripcion: 'Inicio de la firma en Durango con un equipo de 3 personas.',
    },
    {
      anio: '2010',
      titulo: 'Certificación BIM y PMI',
      descripcion: 'Implementación de metodologías internacionales de gestión.',
    },
    {
      anio: '2015',
      titulo: 'Expansión regional',
      descripcion: 'Primeros proyectos fuera de Durango: Mazatlán, Monterrey y Guadalajara.',
    },
    {
      anio: '2020',
      titulo: '100+ proyectos entregados',
      descripcion: 'Alcanzamos el centenar de obras completadas con éxito.',
    },
    {
      anio: '2025',
      titulo: '20 años de trayectoria',
      descripcion: 'Consolidación como referencia en arquitectura del norte de México.',
    },
  ];

  credenciales: Credencial[] = [
    {
      titulo: 'Arquitecto Titulado',
      institucion: 'Universidad Juárez del Estado de Durango',
      anio: '2003',
    },
    { titulo: 'Maestría en Gestión de Proyectos', institucion: 'Tec de Monterrey', anio: '2008' },
    { titulo: 'Certificación BIM', institucion: 'Autodesk', anio: '2010' },
    {
      titulo: 'Project Management Professional (PMP)',
      institucion: 'Project Management Institute',
      anio: '2012',
    },
  ];

  valores: Valor[] = [
    {
      icono: 'shield-check',
      titulo: 'Calidad constructiva',
      descripcion: 'Materiales premium y supervisión técnica en cada etapa.',
    },
    {
      icono: 'hard-hat',
      titulo: 'Seguridad industrial',
      descripcion: 'Protocolos estrictos para proteger a trabajadores y clientes.',
    },
    {
      icono: 'leaf',
      titulo: 'Responsabilidad ambiental',
      descripcion: 'Diseños sostenibles que respetan el entorno.',
    },
    {
      icono: 'document-check',
      titulo: 'Cumplimiento normativo',
      descripcion: 'Apego a todas las normativas y permisos vigentes.',
    },
    {
      icono: 'handshake',
      titulo: 'Profesionalismo y ética',
      descripcion: 'Transparencia total en costos, tiempos y procesos.',
    },
    {
      icono: 'lightning',
      titulo: 'Eficiencia en diseño',
      descripcion: 'Metodología BIM y PMI para entregas puntuales.',
    },
  ];

  ngOnInit() {
    this.heroBadge = this.contenidoService.getCampo('nosotros', 'hero', 'badge', this.heroBadge);
    this.heroTitulo = this.contenidoService.getCampo('nosotros', 'hero', 'titulo', this.heroTitulo);
    this.heroDescripcion = this.contenidoService.getCampo(
      'nosotros',
      'hero',
      'descripcion',
      this.heroDescripcion,
    );
    this.heroImagenFondo = this.contenidoService.getCampo(
      'nosotros',
      'hero',
      'imagenFondo',
      this.heroImagenFondo,
    );

    this.introBadge = this.contenidoService.getCampo('nosotros', 'intro', 'badge', this.introBadge);
    this.introTitulo = this.contenidoService.getCampo(
      'nosotros',
      'intro',
      'titulo',
      this.introTitulo,
    );
    this.introDescripcion = this.contenidoService.getCampo(
      'nosotros',
      'intro',
      'descripcion',
      this.introDescripcion,
    );

    this.misionTitulo = this.contenidoService.getCampo(
      'nosotros',
      'mision',
      'titulo',
      this.misionTitulo,
    );
    this.misionDescripcion = this.contenidoService.getCampo(
      'nosotros',
      'mision',
      'descripcion',
      this.misionDescripcion,
    );

    this.visionTitulo = this.contenidoService.getCampo(
      'nosotros',
      'vision',
      'titulo',
      this.visionTitulo,
    );
    this.visionDescripcion = this.contenidoService.getCampo(
      'nosotros',
      'vision',
      'descripcion',
      this.visionDescripcion,
    );

    this.arquitecto.nombre = this.contenidoService.getCampo(
      'nosotros',
      'arquitecto',
      'nombre',
      this.arquitecto.nombre,
    );
    this.arquitecto.titulo = this.contenidoService.getCampo(
      'nosotros',
      'arquitecto',
      'titulo',
      this.arquitecto.titulo,
    );
    this.arquitecto.foto = this.contenidoService.getCampo(
      'nosotros',
      'arquitecto',
      'foto',
      this.arquitecto.foto,
    );
    this.arquitecto.biografia = this.contenidoService.getCampo(
      'nosotros',
      'arquitecto',
      'biografia',
      this.arquitecto.biografia,
    );
    this.arquitecto.biografia2 = this.contenidoService.getCampo(
      'nosotros',
      'arquitecto',
      'biografia2',
      this.arquitecto.biografia2,
    );
    this.arquitecto.contacto.email = this.contenidoService.getCampo(
      'nosotros',
      'arquitecto',
      'email',
      this.arquitecto.contacto.email,
    );
    this.arquitecto.contacto.linkedin = this.contenidoService.getCampo(
      'nosotros',
      'arquitecto',
      'linkedin',
      this.arquitecto.contacto.linkedin,
    );

    this.valoresBadge = this.contenidoService.getCampo(
      'nosotros',
      'valores',
      'badge',
      this.valoresBadge,
    );
    this.valoresTitulo = this.contenidoService.getCampo(
      'nosotros',
      'valores',
      'titulo',
      this.valoresTitulo,
    );
    this.valoresDescripcion = this.contenidoService.getCampo(
      'nosotros',
      'valores',
      'descripcion',
      this.valoresDescripcion,
    );

    this.ctaTitulo = this.contenidoService.getCampo('nosotros', 'cta', 'titulo', this.ctaTitulo);
    this.ctaDescripcion = this.contenidoService.getCampo(
      'nosotros',
      'cta',
      'descripcion',
      this.ctaDescripcion,
    );
  }
}
