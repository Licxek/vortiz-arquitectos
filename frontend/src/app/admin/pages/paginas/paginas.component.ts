import { Component, OnInit, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ContenidoService } from '../../../core/services/contenido.service'; // ajusta la ruta
import { CatalogoService, Servicio, Proyecto } from '../../../core/services/catalogo.service'; // ajusta la ruta
import { FormatoTextoPipe } from '../../../shared/pipes/formato-texto.pipe'; // ajusta ruta
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin, Observable } from 'rxjs';

interface Pagina {
  id: number;
  titulo: string;
  slug: string;
  tipo: 'fija' | 'personalizada';
  visible: boolean;
  ultimaEdicion: string;
  icono: string;
  color: string;
}

interface BloqueContenido {
  id: number;
  tipo:
    | 'hero'
    | 'texto'
    | 'imagen'
    | 'galeria'
    | 'cita'
    | 'cta'
    | 'estadisticas'
    | 'servicios'
    | 'contacto'
    | 'mapa';
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  imagenUrl?: string;
  textoBoton?: string;
  expandido: boolean;
  items?: { titulo: string; valor?: string; descripcion?: string; icono?: string }[];
  imagenes?: string[];
  direccion?: string;
  campos?: string[];
}

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string;
  bloquesIniciales: string[];
}

interface CampoEdicion {
  key: string;
  label: string;
  tipo: 'texto' | 'textarea' | 'imagen' | 'url' | 'seleccion' | 'catalogo';
  placeholder?: string;
  maxLength?: number;
  opciones?: { value: string; label: string }[];
  fuente?: 'servicios' | 'proyectos';
  default?: string;
  limite?: number;
  ayuda?: string;
}

interface SeccionEditable {
  id: string;
  nombre: string;
  icono: string;
  campos: CampoEdicion[];
}

@Component({
  selector: 'app-paginas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FormatoTextoPipe, DragDropModule],
  templateUrl: './paginas.component.html',
})
export class PaginasComponent implements OnInit {
  busqueda = '';
  filtroActivo: 'todas' | 'fijas' | 'personalizadas' | 'ocultas' = 'todas';
  menuAbiertoId: number | null = null;
  mostrarConfirmarSalir = false;
  mostrarConfirmarGuardar = false;
  private snapshotContenido = '';
  private snapshotServicios = '';

  paginas: Pagina[] = [
    {
      id: 1,
      titulo: 'Inicio',
      slug: '/',
      tipo: 'fija',
      visible: true,
      ultimaEdicion: 'Hace 2 días',
      icono: 'home',
      color: 'blue',
    },
    {
      id: 2,
      titulo: 'Nosotros',
      slug: '/nosotros',
      tipo: 'fija',
      visible: true,
      ultimaEdicion: 'Hace 1 semana',
      icono: 'users',
      color: 'green',
    },
    {
      id: 3,
      titulo: 'Proyectos',
      slug: '/proyectos',
      tipo: 'fija',
      visible: true,
      ultimaEdicion: 'Hace 3 días',
      icono: 'building',
      color: 'orange',
    },
    {
      id: 4,
      titulo: 'Servicios',
      slug: '/servicios',
      tipo: 'fija',
      visible: true,
      ultimaEdicion: 'Ayer',
      icono: 'briefcase',
      color: 'purple',
    },
    {
      id: 5,
      titulo: 'Citas',
      slug: '/citas',
      tipo: 'fija',
      visible: true,
      ultimaEdicion: 'Hace 5 días',
      icono: 'calendar',
      color: 'pink',
    },
    {
      id: 6,
      titulo: 'Política de Privacidad',
      slug: '/p/privacidad',
      tipo: 'personalizada',
      visible: true,
      ultimaEdicion: 'Hace 2 semanas',
      icono: 'document',
      color: 'gray',
    },
    {
      id: 7,
      titulo: 'Términos y Condiciones',
      slug: '/p/terminos',
      tipo: 'personalizada',
      visible: false,
      ultimaEdicion: 'Hace 1 mes',
      icono: 'document',
      color: 'gray',
    },
  ];

  // Modal nueva página
  mostrarNuevaPagina = false;
  seccionActiva: 'plantilla' | 'info' | 'contenido' | 'seo' | 'config' = 'plantilla';
  plantillaSeleccionada = '';
  mostrarMenuBloques = false;

  secciones = [
    { id: 'plantilla' as const, label: 'Plantilla' },
    { id: 'info' as const, label: 'Información' },
    { id: 'contenido' as const, label: 'Contenido' },
    { id: 'seo' as const, label: 'SEO' },
    { id: 'config' as const, label: 'Configuración' },
  ];

  plantillas: Plantilla[] = [
    {
      id: 'blanco',
      nombre: 'En blanco',
      descripcion: 'Empieza desde cero con total libertad',
      bloquesIniciales: [],
    },
    {
      id: 'servicio',
      nombre: 'Página de Servicio',
      descripcion: 'Ideal para presentar un servicio específico',
      bloquesIniciales: ['hero', 'texto', 'estadisticas', 'cta'],
    },
    {
      id: 'nosotros',
      nombre: 'Nosotros / About',
      descripcion: 'Cuenta la historia de tu empresa',
      bloquesIniciales: ['hero', 'texto', 'imagen', 'estadisticas'],
    },
    {
      id: 'landing',
      nombre: 'Landing Page',
      descripcion: 'Página de aterrizaje con CTA fuerte',
      bloquesIniciales: ['hero', 'estadisticas', 'servicios', 'cta', 'contacto'],
    },
    {
      id: 'blog',
      nombre: 'Artículo de Blog',
      descripcion: 'Para publicaciones y artículos',
      bloquesIniciales: ['hero', 'texto', 'imagen', 'texto', 'cita'],
    },
    {
      id: 'portfolio',
      nombre: 'Portafolio',
      descripcion: 'Muestra tus proyectos destacados',
      bloquesIniciales: ['hero', 'galeria', 'cta'],
    },
  ];

  tiposBloques = [
    {
      tipo: 'hero',
      label: 'Hero',
      descripcion: 'Sección destacada con imagen y título',
      color: 'blue',
    },
    { tipo: 'texto', label: 'Texto', descripcion: 'Párrafos de contenido', color: 'gray' },
    { tipo: 'imagen', label: 'Imagen', descripcion: 'Imagen individual destacada', color: 'green' },
    { tipo: 'galeria', label: 'Galería', descripcion: 'Grid de varias imágenes', color: 'purple' },
    {
      tipo: 'cita',
      label: 'Cita / Testimonio',
      descripcion: 'Frase destacada con autor',
      color: 'orange',
    },
    { tipo: 'cta', label: 'CTA', descripcion: 'Llamado a la acción con botón', color: 'red' },
    {
      tipo: 'estadisticas',
      label: 'Estadísticas',
      descripcion: 'Números importantes destacados',
      color: 'blue',
    },
    {
      tipo: 'servicios',
      label: 'Servicios',
      descripcion: 'Lista de servicios ofrecidos',
      color: 'green',
    },
    {
      tipo: 'contacto',
      label: 'Formulario contacto',
      descripcion: 'Formulario de contacto',
      color: 'orange',
    },
    { tipo: 'mapa', label: 'Mapa', descripcion: 'Mapa con ubicación', color: 'gray' },
  ];

  formNuevaPagina = this.crearFormVacio();

  private crearFormVacio() {
    return {
      titulo: '',
      slug: '',
      descripcion: '',
      imagenDestacada: '',
      categoria: 'standard',
      mostrarEnMenu: false,
      posicionMenu: 0,
      bloques: [] as BloqueContenido[],
      seo: {
        metaTitle: '',
        metaDescription: '',
        keywords: '',
      },
      estado: 'borrador' as 'borrador' | 'publicada' | 'programada',
      fechaPublicacion: '',
      visibilidad: 'publica' as 'publica' | 'registrados' | 'contrasena',
      permitirComentarios: true,
      plantillaLayout: 'default',
    };
  }

  get progresoCreacion(): number {
    let progreso = 0;
    if (this.plantillaSeleccionada) progreso += 20;
    if (this.formNuevaPagina.titulo.trim()) progreso += 20;
    if (this.formNuevaPagina.descripcion.trim()) progreso += 15;
    if (this.formNuevaPagina.bloques.length > 0) progreso += 25;
    if (this.formNuevaPagina.seo.metaTitle.trim()) progreso += 10;
    if (this.formNuevaPagina.seo.metaDescription.trim()) progreso += 10;
    return progreso;
  }

  // Selectores personalizados
  mostrarSelectorCategoria = false;

  categoriasOpciones = [
    { value: 'standard', label: 'Estándar', descripcion: 'Página común del sitio' },
    { value: 'servicio', label: 'Servicio', descripcion: 'Para detallar un servicio' },
    { value: 'blog', label: 'Blog', descripcion: 'Artículo o noticia' },
    { value: 'landing', label: 'Landing', descripcion: 'Página de captación' },
    { value: 'legal', label: 'Legal', descripcion: 'Términos, privacidad, etc.' },
  ];

  // ============ EDITOR DE PÁGINAS FIJAS ============
  mostrarEditarPaginaFija = false;
  paginaEditando: Pagina | null = null;
  seccionEditandoActiva = '';
  mensajeGuardado = '';
  tipoMensaje: 'exito' | 'info' = 'exito';

  // Schemas: qué se puede editar en cada página
  schemasPaginas: Record<string, SeccionEditable[]> = {
    inicio: [
      {
        id: 'hero',
        nombre: 'Hero principal',
        icono: '✨',
        campos: [
          {
            key: 'badge',
            label: 'Texto del badge',
            tipo: 'texto',
            placeholder: 'Arquitectura · Construcción · Diseño',
          },
          {
            key: 'titulo',
            label: 'Título principal',
            tipo: 'texto',
            default: 'Diseñamos *espacios*, construimos *confianza*',
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
          {
            key: 'imagenFondo',
            label: 'Imagen de fondo (URL)',
            tipo: 'imagen',
            default: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1920',
          },
          { key: 'cta1', label: 'Texto botón principal', tipo: 'texto' },
          { key: 'cta2', label: 'Texto botón secundario', tipo: 'texto' },
        ],
      },
      {
        id: 'filosofia',
        nombre: 'Filosofía',
        icono: '🏛️',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          {
            key: 'titulo',
            label: 'Título',
            tipo: 'texto',
            default: 'Confianza y experiencia desde ~2005~',
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          { key: 'parrafo1', label: 'Párrafo 1', tipo: 'textarea' },
          { key: 'parrafo2', label: 'Párrafo 2', tipo: 'textarea' },
          {
            key: 'imagen',
            label: 'Imagen lateral (URL)',
            tipo: 'imagen',
            default: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800',
          },
        ],
      },
      {
        id: 'stats',
        nombre: 'Estadísticas grandes',
        icono: '📊',
        campos: [
          { key: 'stat1Valor', label: 'Stat 1 - Número', tipo: 'texto', placeholder: '20+' },
          { key: 'stat1Label', label: 'Stat 1 - Etiqueta', tipo: 'texto' },
          { key: 'stat2Valor', label: 'Stat 2 - Número', tipo: 'texto' },
          { key: 'stat2Label', label: 'Stat 2 - Etiqueta', tipo: 'texto' },
          { key: 'stat3Valor', label: 'Stat 3 - Número', tipo: 'texto' },
          { key: 'stat3Label', label: 'Stat 3 - Etiqueta', tipo: 'texto' },
          { key: 'stat4Valor', label: 'Stat 4 - Número', tipo: 'texto' },
          { key: 'stat4Label', label: 'Stat 4 - Etiqueta', tipo: 'texto' },
        ],
      },
      {
        id: 'servicios',
        nombre: 'Sección Servicios',
        icono: '🛠️',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          { key: 'titulo', label: 'Título', tipo: 'texto' },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
          {
            key: 'visibles',
            label: 'Servicios a mostrar en Inicio',
            tipo: 'seleccion',
            fuente: 'servicios',
            limite: 6,
          },
        ],
      },
      {
        id: 'proyectos',
        nombre: 'Proyectos destacados',
        icono: '🏢',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          {
            key: 'titulo',
            label: 'Título',
            tipo: 'texto',
            default: 'Marcas que confiaron en *nuestro trabajo*',
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          {
            key: 'visibles',
            label: 'Proyectos a mostrar en Inicio',
            tipo: 'seleccion',
            fuente: 'proyectos',
            limite: 8,
          },
        ],
      },
      {
        id: 'proceso',
        nombre: 'Proceso de trabajo',
        icono: '📋',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          { key: 'titulo', label: 'Título', tipo: 'texto' },
          { key: 'paso1Titulo', label: 'Paso 1 - Título', tipo: 'texto' },
          { key: 'paso1Desc', label: 'Paso 1 - Descripción', tipo: 'textarea' },
          { key: 'paso2Titulo', label: 'Paso 2 - Título', tipo: 'texto' },
          { key: 'paso2Desc', label: 'Paso 2 - Descripción', tipo: 'textarea' },
          { key: 'paso3Titulo', label: 'Paso 3 - Título', tipo: 'texto' },
          { key: 'paso3Desc', label: 'Paso 3 - Descripción', tipo: 'textarea' },
          { key: 'paso4Titulo', label: 'Paso 4 - Título', tipo: 'texto' },
          { key: 'paso4Desc', label: 'Paso 4 - Descripción', tipo: 'textarea' },
        ],
      },
      {
        id: 'cta',
        nombre: 'CTA Final',
        icono: '🚀',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          {
            key: 'titulo',
            label: 'Título',
            tipo: 'texto',
            default: '¿Listo para construir tu próximo *gran proyecto?*',
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
          { key: 'cta1', label: 'Botón 1', tipo: 'texto' },
          { key: 'cta2', label: 'Botón 2', tipo: 'texto' },
          {
            key: 'imagenFondo',
            label: 'Imagen de fondo (URL)',
            tipo: 'imagen',
            default: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920',
          },
        ],
      },
    ],
    nosotros: [
      {
        id: 'hero',
        nombre: 'Hero',
        icono: '✨',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          {
            key: 'titulo',
            label: 'Título',
            tipo: 'texto',
            default: 'Diseñamos con *propósito*, construimos con *historia*',
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
          {
            key: 'imagenFondo',
            label: 'Imagen de fondo',
            tipo: 'imagen',
            default: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1920',
          }, // en hero
        ],
      },
      {
        id: 'intro',
        nombre: 'Introducción',
        icono: '📖',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          { key: 'titulo', label: 'Título', tipo: 'texto' },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
      {
        id: 'mision',
        nombre: 'Misión',
        icono: '🎯',
        campos: [
          { key: 'titulo', label: 'Título', tipo: 'texto' },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
      {
        id: 'vision',
        nombre: 'Visión',
        icono: '👁️',
        campos: [
          { key: 'titulo', label: 'Título', tipo: 'texto' },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
      {
        id: 'arquitecto',
        nombre: 'El Arquitecto',
        icono: '👤',
        campos: [
          { key: 'nombre', label: 'Nombre completo', tipo: 'texto' },
          { key: 'titulo', label: 'Cargo / Título', tipo: 'texto' },
          {
            key: 'foto',
            label: 'Foto (URL)',
            tipo: 'imagen',
            default: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600',
          }, // en arquitecto
          { key: 'biografia', label: 'Biografía (párrafo 1)', tipo: 'textarea' },
          { key: 'biografia2', label: 'Biografía (párrafo 2)', tipo: 'textarea' },
          { key: 'email', label: 'Email de contacto', tipo: 'texto' },
          { key: 'linkedin', label: 'LinkedIn (URL)', tipo: 'url' },
        ],
      },
      {
        id: 'valores',
        nombre: 'Sección Valores',
        icono: '⭐',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          { key: 'titulo', label: 'Título', tipo: 'texto' },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
      {
        id: 'cta',
        nombre: 'CTA Final',
        icono: '🚀',
        campos: [
          { key: 'titulo', label: 'Título', tipo: 'texto' },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
    ],
    proyectos: [
      {
        id: 'hero',
        nombre: 'Hero',
        icono: '✨',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          {
            key: 'titulo',
            label: 'Título',
            tipo: 'texto',
            default: 'Clientes que confiaron en *nuestro trabajo*',
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
      {
        id: 'intro',
        nombre: 'Introducción + Stats',
        icono: '📖',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          { key: 'titulo', label: 'Título', tipo: 'texto' },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
      {
        id: 'catalogo',
        nombre: 'Proyectos del catálogo',
        icono: '🏢',
        campos: [{ key: 'items', label: 'Proyectos', tipo: 'catalogo', fuente: 'proyectos' }],
      },
      {
        id: 'cta',
        nombre: 'CTA Final',
        icono: '🚀',
        campos: [
          {
            key: 'titulo',
            label: 'Título',
            tipo: 'texto',
            default: '¿Tu marca podría ser la *siguiente?*',
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
    ],
    servicios: [
      {
        id: 'hero',
        nombre: 'Hero',
        icono: '✨',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          {
            key: 'titulo',
            label: 'Título',
            tipo: 'texto',
            default: 'Lo que hacemos por *tu proyecto*',
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
      {
        id: 'intro',
        nombre: 'Introducción',
        icono: '📖',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          { key: 'titulo', label: 'Título', tipo: 'texto' },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
      {
        id: 'catalogo',
        nombre: 'Servicios del catálogo',
        icono: '📋',
        campos: [{ key: 'items', label: 'Servicios', tipo: 'catalogo', fuente: 'servicios' }],
      },
      {
        id: 'cta',
        nombre: 'CTA Final',
        icono: '🚀',
        campos: [
          {
            key: 'titulo',
            label: 'Título',
            tipo: 'texto',
            default: '¿No estás seguro de cuál servicio *necesitas?*',
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
    ],
    citas: [
      {
        id: 'hero',
        nombre: 'Hero',
        icono: '✨',
        campos: [
          { key: 'badge', label: 'Badge', tipo: 'texto' },
          {
            key: 'titulo',
            label: 'Título',
            tipo: 'texto',
            default: 'Conversemos sobre *tu proyecto*',
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
        ],
      },
      {
        id: 'beneficios',
        nombre: 'Beneficios (sidebar)',
        icono: '✅',
        campos: [
          { key: 'titulo', label: 'Título', tipo: 'texto' },
          { key: 'beneficio1', label: 'Beneficio 1', tipo: 'texto' },
          { key: 'beneficio2', label: 'Beneficio 2', tipo: 'texto' },
          { key: 'beneficio3', label: 'Beneficio 3', tipo: 'texto' },
          { key: 'beneficio4', label: 'Beneficio 4', tipo: 'texto' },
        ],
      },
      {
        id: 'horarios',
        nombre: 'Horarios',
        icono: '🕐',
        campos: [
          { key: 'lunVie', label: 'Lunes a viernes', tipo: 'texto', placeholder: '9:00 – 18:00' },
          { key: 'sabado', label: 'Sábado', tipo: 'texto' },
          { key: 'domingo', label: 'Domingo', tipo: 'texto' },
        ],
      },
    ],
  };

  // Almacén del contenido (en producción esto vendría del backend)
  contenidoPaginas: Record<string, Record<string, Record<string, string>>> = {};

  // ============ PREVIEW EMBEBIDA ============
  mostrarPreviewPagina = false;
  paginaPrevisualizando: Pagina | null = null;
  urlPreviewSegura: SafeResourceUrl | null = null;
  dispositivoPreview: 'desktop' | 'tablet' | 'mobile' = 'desktop';

  private sanitizer = inject(DomSanitizer);
  private contenidoService = inject(ContenidoService);
  private cdr = inject(ChangeDetectorRef);

  private rutasPublicas: Record<string, string> = {
    '/': '/home',
    '/nosotros': '/nosotros',
    '/proyectos': '/proyectos',
    '/servicios': '/servicios',
    '/citas': '/citas',
  };

  get categoriaLabel() {
    return (
      this.categoriasOpciones.find((c) => c.value === this.formNuevaPagina.categoria)?.label || ''
    );
  }

  toggleSelectorCategoria(event: Event) {
    event.stopPropagation();
    this.mostrarSelectorCategoria = !this.mostrarSelectorCategoria;
  }

  seleccionarCategoria(value: string) {
    this.formNuevaPagina.categoria = value;
    this.mostrarSelectorCategoria = false;
  }

  @HostListener('document:click')
  cerrarTodosDropdowns() {
    this.mostrarSelectorCategoria = false;
    this.mostrarMenuBloques = false;
  }

  ngOnInit() {}

  get paginasFiltradas(): Pagina[] {
    let resultado = this.paginas;

    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      resultado = resultado.filter(
        (p) => p.titulo.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
      );
    }

    switch (this.filtroActivo) {
      case 'fijas':
        resultado = resultado.filter((p) => p.tipo === 'fija');
        break;
      case 'personalizadas':
        resultado = resultado.filter((p) => p.tipo === 'personalizada');
        break;
      case 'ocultas':
        resultado = resultado.filter((p) => !p.visible);
        break;
    }

    return resultado;
  }

  get totalPaginas(): number {
    return this.paginas.length;
  }
  get totalVisibles(): number {
    return this.paginas.filter((p) => p.visible).length;
  }
  get totalOcultas(): number {
    return this.paginas.filter((p) => !p.visible).length;
  }
  get totalPersonalizadas(): number {
    return this.paginas.filter((p) => p.tipo === 'personalizada').length;
  }

  toggleMenu(event: Event, id: number) {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === id ? null : id;
  }

  toggleVisibilidad(pagina: Pagina) {
    pagina.visible = !pagina.visible;
    this.menuAbiertoId = null;
  }

  eliminarPagina(pagina: Pagina) {
    if (pagina.tipo === 'fija') return;
    this.paginas = this.paginas.filter((p) => p.id !== pagina.id);
    this.menuAbiertoId = null;
  }

  @HostListener('document:click')
  cerrarMenus() {
    this.menuAbiertoId = null;
  }

  abrirNuevaPagina() {
    this.mostrarNuevaPagina = true;
    this.seccionActiva = 'plantilla';
    this.plantillaSeleccionada = '';
    this.formNuevaPagina = this.crearFormVacio();
  }

  cerrarNuevaPagina() {
    this.mostrarNuevaPagina = false;
    this.mostrarMenuBloques = false;
  }

  seleccionarPlantilla(id: string) {
    this.plantillaSeleccionada = id;
    const plantilla = this.plantillas.find((p) => p.id === id);
    if (plantilla) {
      this.formNuevaPagina.bloques = plantilla.bloquesIniciales.map((tipo, i) => ({
        id: Date.now() + i,
        tipo: tipo as any,
        expandido: false,
      }));
    }
  }

  actualizarSlug() {
    this.formNuevaPagina.slug = this.formNuevaPagina.titulo
      .toLowerCase()
      .trim()
      .replace(/[áéíóú]/g, (m) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' })[m] || '')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  agregarBloque(tipo: string) {
    const nuevoBloque: BloqueContenido = {
      id: Date.now(),
      tipo: tipo as any,
      expandido: true,
    };

    // Inicializar campos según el tipo
    if (tipo === 'estadisticas') {
      nuevoBloque.items = [
        { titulo: 'Proyectos completados', valor: '50+' },
        { titulo: 'Clientes satisfechos', valor: '120+' },
        { titulo: 'Años de experiencia', valor: '15' },
      ];
    } else if (tipo === 'galeria') {
      nuevoBloque.imagenes = [];
    } else if (tipo === 'servicios') {
      nuevoBloque.items = [
        {
          titulo: 'Diseño arquitectónico',
          descripcion: 'Planos y renders 3D profesionales',
          icono: '✏️',
        },
        { titulo: 'Construcción', descripcion: 'Supervisión completa de obra', icono: '🏗️' },
      ];
    } else if (tipo === 'contacto') {
      nuevoBloque.campos = ['Nombre', 'Correo', 'Teléfono', 'Mensaje'];
    } else if (tipo === 'mapa') {
      nuevoBloque.direccion = 'Milpillas 101, La Forestal, Durango';
    }

    this.formNuevaPagina.bloques.push(nuevoBloque);
    this.mostrarMenuBloques = false;
  }

  eliminarBloque(id: number) {
    this.formNuevaPagina.bloques = this.formNuevaPagina.bloques.filter((b) => b.id !== id);
  }

  moverBloque(id: number, dir: 'arriba' | 'abajo') {
    const idx = this.formNuevaPagina.bloques.findIndex((b) => b.id === id);
    if (dir === 'arriba' && idx > 0) {
      [this.formNuevaPagina.bloques[idx], this.formNuevaPagina.bloques[idx - 1]] = [
        this.formNuevaPagina.bloques[idx - 1],
        this.formNuevaPagina.bloques[idx],
      ];
    } else if (dir === 'abajo' && idx < this.formNuevaPagina.bloques.length - 1) {
      [this.formNuevaPagina.bloques[idx], this.formNuevaPagina.bloques[idx + 1]] = [
        this.formNuevaPagina.bloques[idx + 1],
        this.formNuevaPagina.bloques[idx],
      ];
    }
  }

  toggleBloque(id: number) {
    const bloque = this.formNuevaPagina.bloques.find((b) => b.id === id);
    if (bloque) bloque.expandido = !bloque.expandido;
  }

  irASeccion(s: 'plantilla' | 'info' | 'contenido' | 'seo' | 'config') {
    this.seccionActiva = s;
  }

  irSiguiente() {
    const idx = this.secciones.findIndex((s) => s.id === this.seccionActiva);
    if (idx < this.secciones.length - 1) this.seccionActiva = this.secciones[idx + 1].id;
  }

  irAnterior() {
    const idx = this.secciones.findIndex((s) => s.id === this.seccionActiva);
    if (idx > 0) this.seccionActiva = this.secciones[idx - 1].id;
  }

  guardarPagina(publicar: boolean) {
    this.formNuevaPagina.estado = publicar ? 'publicada' : 'borrador';
    console.log('Página guardada:', this.formNuevaPagina);
    this.cerrarNuevaPagina();
  }

  obtenerLabelBloque(tipo: string): string {
    return this.tiposBloques.find((t) => t.tipo === tipo)?.label || tipo;
  }

  agregarItemBloque(bloqueId: number) {
    const b = this.formNuevaPagina.bloques.find((b) => b.id === bloqueId);
    if (!b) return;
    if (!b.items) b.items = [];

    if (b.tipo === 'estadisticas') {
      b.items.push({ titulo: '', valor: '' });
    } else if (b.tipo === 'servicios') {
      b.items.push({ titulo: '', descripcion: '', icono: '⭐' });
    }
  }

  eliminarItemBloque(bloqueId: number, index: number) {
    const b = this.formNuevaPagina.bloques.find((b) => b.id === bloqueId);
    if (b?.items) b.items.splice(index, 1);
  }

  agregarImagenGaleria(bloque: BloqueContenido, url: string) {
    if (!bloque.imagenes) bloque.imagenes = [];
    if (url.trim()) bloque.imagenes.push(url.trim());
  }

  eliminarImagenGaleria(bloque: BloqueContenido, index: number) {
    if (bloque.imagenes) bloque.imagenes.splice(index, 1);
  }

  agregarCampoFormulario(bloque: BloqueContenido, campo: string) {
    if (!bloque.campos) bloque.campos = [];
    if (campo.trim()) bloque.campos.push(campo.trim());
  }

  eliminarCampoFormulario(bloque: BloqueContenido, index: number) {
    if (bloque.campos) bloque.campos.splice(index, 1);
  }

  // Map slug → schema key
  private slugASchema: Record<string, string> = {
    '/': 'inicio',
    '/nosotros': 'nosotros',
    '/proyectos': 'proyectos',
    '/servicios': 'servicios',
    '/citas': 'citas',
  };

  // ============ EDITAR / PREVISUALIZAR ============
  previsualizarPagina(pagina: Pagina) {
    this.menuAbiertoId = null;
    const ruta = this.rutasPublicas[pagina.slug] || pagina.slug;
    this.paginaPrevisualizando = pagina;
    this.urlPreviewSegura = this.sanitizer.bypassSecurityTrustResourceUrl(
      window.location.origin + ruta,
    );
    this.dispositivoPreview = 'desktop';
    this.mostrarPreviewPagina = true;
  }

  cerrarPreviewPagina() {
    this.mostrarPreviewPagina = false;
    this.urlPreviewSegura = null;
    this.paginaPrevisualizando = null;
  }
  abrirEnPestanaNueva() {
    if (!this.paginaPrevisualizando) return;
    const ruta =
      this.rutasPublicas[this.paginaPrevisualizando.slug] || this.paginaPrevisualizando.slug;
    window.open(window.location.origin + ruta, '_blank');
  }

  get anchoPreview(): string {
    if (this.dispositivoPreview === 'mobile') return '390px';
    if (this.dispositivoPreview === 'tablet') return '820px';
    return '100%';
  }

  get urlPreviewAbsoluta(): string {
    if (!this.paginaPrevisualizando) return '';
    const ruta =
      this.rutasPublicas[this.paginaPrevisualizando.slug] || this.paginaPrevisualizando.slug;
    return window.location.origin + ruta;
  }

  editarPagina(pagina: Pagina) {
    this.menuAbiertoId = null;

    // Si es personalizada, abrimos el editor de Nueva Página (lo agregamos después)
    if (pagina.tipo === 'personalizada') {
      // TODO: cargar pagina en formNuevaPagina y abrir modal
      this.abrirNuevaPagina();
      return;
    }

    // Fija → abrir editor de página fija
    this.paginaEditando = pagina;

    const schemaKey = this.slugASchema[pagina.slug];
    if (!schemaKey) return;

    // Inicializar contenido si no existe
    this.contenidoPaginas[schemaKey] = {};
    this.schemasPaginas[schemaKey].forEach((seccion) => {
      this.contenidoPaginas[schemaKey][seccion.id] = {};
      seccion.campos.forEach((campo) => {
        if (campo.tipo === 'catalogo') return;
        const guardado = this.contenidoService.getCampo(schemaKey, seccion.id, campo.key, '');
        if (campo.tipo === 'seleccion') {
          let valores = this.opcionesDe(campo).map((o) => o.value);
          if (campo.limite) valores = valores.slice(0, campo.limite);
          this.contenidoPaginas[schemaKey][seccion.id][campo.key] = guardado.trim()
            ? guardado
            : valores.join(',');
        } else {
          this.contenidoPaginas[schemaKey][seccion.id][campo.key] = guardado.trim()
            ? guardado
            : campo.default || '';
        }
      });
    });

    this.seccionEditandoActiva = this.schemasPaginas[schemaKey][0]?.id || '';
    // Copia de trabajo del catálogo (solo se aplica al Guardar cambios)
    this.serviciosDraft = this.catalogo.servicios().map((s) => ({ ...s }));
    this.servicioFormAbierto = false;
    this.servicioEditandoId = null;
    this.proyectosDraft = this.catalogo.proyectos().map((p) => ({ ...p }));
    this.proyectoFormAbierto = false;
    this.proyectoEditandoId = null;
    this.capturarSnapshot();
    this.mostrarEditarPaginaFija = true;
  }

  cerrarEditarPagina() {
    this.mostrarEditarPaginaFija = false;
    this.paginaEditando = null;
    this.seccionEditandoActiva = '';
    this.mensajeGuardado = '';
  }

  pedirCerrarEditarPagina() {
    if (this.hayCambiosSinGuardar) {
      this.mostrarConfirmarSalir = true;
    } else {
      this.cerrarEditarPagina();
    }
  }

  pedirGuardarEdicionPagina() {
    if (!this.hayCambiosSinGuardar) {
      this.flashMensaje('No hay cambios que guardar', 'info');
      return;
    }
    this.mostrarConfirmarGuardar = true;
  }

  cancelarGuardarEdicionPagina() {
    this.mostrarConfirmarGuardar = false;
  }

  confirmarGuardarEdicionPagina() {
    this.mostrarConfirmarGuardar = false;
    this.guardarEdicionPagina();
  }

  cancelarSalirEditarPagina() {
    this.mostrarConfirmarSalir = false;
  }

  confirmarSalirSinGuardar() {
    this.mostrarConfirmarSalir = false;
    this.cerrarEditarPagina();
  }

  get seccionesPaginaActual(): SeccionEditable[] {
    if (!this.paginaEditando) return [];
    const key = this.slugASchema[this.paginaEditando.slug];
    return this.schemasPaginas[key] || [];
  }

  get seccionActualSchema(): SeccionEditable | undefined {
    return this.seccionesPaginaActual.find((s) => s.id === this.seccionEditandoActiva);
  }

  get contenidoSeccionActual(): Record<string, string> {
    if (!this.paginaEditando) return {};
    const key = this.slugASchema[this.paginaEditando.slug];
    return this.contenidoPaginas[key]?.[this.seccionEditandoActiva] || {};
  }

  actualizarCampo(campoKey: string, valor: string) {
    if (!this.paginaEditando) return;
    const key = this.slugASchema[this.paginaEditando.slug];
    if (!this.contenidoPaginas[key][this.seccionEditandoActiva]) {
      this.contenidoPaginas[key][this.seccionEditandoActiva] = {};
    }
    this.contenidoPaginas[key][this.seccionEditandoActiva][campoKey] = valor;
  }

  seleccionarSeccionEdicion(id: string) {
    this.seccionEditandoActiva = id;
  }

   guardarEdicionPagina() {
    if (!this.paginaEditando) return;
    const key = this.slugASchema[this.paginaEditando.slug];
    if (!key) return;

    // 1) Contenido de la página (siempre)
    const guardados: Observable<any>[] = [
      this.contenidoService.guardarPagina(key, this.contenidoPaginas[key]),
    ];

    // 2) Si es página de catálogo, agregar su sincronización
    if (key === 'servicios') {
      const payload = this.serviciosDraft.map((s, i) => ({
        id: s.id && s.id > 0 ? s.id : undefined,
        titulo: s.titulo,
        descripcion: s.descripcion,
        categoria: s.categoria,
        icono: s.icono,
        imagen: s.imagen,
        orden: i + 1,
      }));
      guardados.push(this.catalogo.sincronizarServicios(payload));
    } else if (key === 'proyectos') {
      const payload = this.proyectosDraft.map((p, i) => ({
        id: p.id && p.id > 0 ? p.id : undefined,
        nombre: p.nombre,
        iniciales: p.iniciales,
        logoUrl: p.logoUrl,
        categoria: p.categoria,
        ubicacion: p.ubicacion,
        anio: p.anio,
        colorMarca: p.colorMarca,
        descripcion: p.descripcion,
        orden: i + 1,
      }));
      guardados.push(this.catalogo.sincronizarProyectos(payload));
    }

    this.guardandoServicio = true;
    this.cdr.markForCheck();

    forkJoin(guardados).subscribe({
      next: () => {
        if (key === 'servicios') this.catalogo.cargarServicios();
        if (key === 'proyectos') this.catalogo.cargarProyectos();
        this.guardandoServicio = false;
        this.capturarSnapshot();
        this.paginaEditando!.ultimaEdicion = 'Hace unos segundos';
        this.flashMensaje('Cambios guardados correctamente');
      },
      error: () => {
        this.guardandoServicio = false;
        this.flashMensaje('Error al guardar los cambios');
      },
    });
  }

  onIframeCargado(event: Event) {
    const iframe = event.target as HTMLIFrameElement;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Eliminar styles previos si ya existían (al cambiar de dispositivo)
      const previo = doc.getElementById('preview-bloqueo');
      if (previo) previo.remove();

      const style = doc.createElement('style');
      style.id = 'preview-bloqueo';
      style.textContent = `
        nav, header, footer,
        app-navbar, app-footer, app-header {
          pointer-events: none !important;
        }
        nav *, header *, footer *,
        app-navbar *, app-footer *, app-header * {
          pointer-events: none !important;
          cursor: default !important;
        }
      `;
      doc.head.appendChild(style);
    } catch (e) {
      console.warn('No se pudo bloquear navegación en el preview:', e);
    }
  }

  estaSeleccionado(campoKey: string, value: string): boolean {
    const actual = this.contenidoSeccionActual[campoKey] || '';
    return actual
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(value);
  }

  contarSeleccionados(campoKey: string): number {
    const actual = this.contenidoSeccionActual[campoKey] || '';
    return actual
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean).length;
  }

  limiteAlcanzado(campo: CampoEdicion): boolean {
    return !!campo.limite && this.contarSeleccionados(campo.key) >= campo.limite;
  }

  toggleSeleccion(campo: CampoEdicion, value: string) {
    let seleccionados = (this.contenidoSeccionActual[campo.key] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (seleccionados.includes(value)) {
      seleccionados = seleccionados.filter((v) => v !== value); // quitar siempre se puede
    } else {
      if (this.limiteAlcanzado(campo)) return; // no dejar pasar el límite
      seleccionados.push(value);
    }
    this.actualizarCampo(campo.key, seleccionados.join(','));
  }

  private catalogo = inject(CatalogoService);

  opcionesDe(campo: CampoEdicion): { value: string; label: string }[] {
    if (campo.fuente === 'servicios') {
      return this.catalogo.getServicios().map((s, i) => ({ value: String(i), label: s.titulo }));
    }
    if (campo.fuente === 'proyectos') {
      return this.catalogo.getProyectos().map((p, i) => ({ value: String(i), label: p.nombre }));
    }
    return campo.opciones || [];
  }

  // ===== CRUD de Servicios (dentro del editor de Páginas) =====
  categoriasServicio = [
    { value: 'tramites', label: 'Trámites' },
    { value: 'gerencia', label: 'Gerencia' },
    { value: 'diseno', label: 'Diseño' },
    { value: 'construccion', label: 'Construcción' },
    { value: 'especiales', label: 'Proyectos Especiales' },
  ];
  iconosServicio = [
    'document',
    'badge',
    'users',
    'eye',
    'cube',
    'map',
    'structure',
    'leaf',
    'water',
    'bulb',
    'home',
    'factory',
    'chat',
    'calculator',
  ];

  servicioFormAbierto = false;
  servicioEditandoId: number | null = null;
  guardandoServicio = false;
  servicioForm = this.servicioVacio();
  servicioAEliminar: Servicio | null = null;
  serviciosDraft: Servicio[] = [];
  private tempIdSeq = -1;

  private servicioVacio() {
    return { titulo: '', descripcion: '', categoria: 'tramites', icono: 'document', imagen: '' };
  }

  etiquetaCategoriaServicio(cat: string): string {
    return this.catalogo.etiquetaCategoriaServicio(cat);
  }

  nuevoServicio() {
    this.servicioEditandoId = null;
    this.servicioForm = this.servicioVacio();
    this.servicioFormAbierto = true;
  }

  editarServicioCat(s: Servicio) {
    this.servicioEditandoId = s.id;
    this.servicioForm = {
      titulo: s.titulo,
      descripcion: s.descripcion,
      categoria: s.categoria,
      icono: s.icono,
      imagen: s.imagen,
    };
    this.servicioFormAbierto = true;
  }

  cancelarServicioForm() {
    this.servicioFormAbierto = false;
    this.servicioEditandoId = null;
    this.servicioForm = this.servicioVacio();
  }

  guardarServicioCat() {
    if (!this.servicioForm.titulo.trim()) return;
    if (this.servicioEditandoId != null) {
      const idx = this.serviciosDraft.findIndex((s) => s.id === this.servicioEditandoId);
      if (idx >= 0)
        this.serviciosDraft[idx] = { ...this.serviciosDraft[idx], ...this.servicioForm };
    } else {
      this.serviciosDraft.push({
        id: this.tempIdSeq--, // id temporal (negativo) hasta guardar
        orden: this.serviciosDraft.length + 1,
        ...this.servicioForm,
      } as Servicio);
    }
    this.cancelarServicioForm();
  }

  pedirEliminarServicio(s: Servicio) {
    this.servicioAEliminar = s;
  }

  cancelarEliminarServicio() {
    this.servicioAEliminar = null;
  }

  confirmarEliminarServicio() {
    if (!this.servicioAEliminar) return;
    const id = this.servicioAEliminar.id;
    this.serviciosDraft = this.serviciosDraft.filter((s) => s.id !== id);
    this.servicioAEliminar = null;
  }

  private flashMensaje(texto: string, tipo: 'exito' | 'info' = 'exito') {
    this.mensajeGuardado = texto;
    this.tipoMensaje = tipo;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.mensajeGuardado = '';
      this.cdr.markForCheck();
    }, 3000);
  }

  reordenarServicio(event: CdkDragDrop<Servicio[]>) {
    moveItemInArray(this.serviciosDraft, event.previousIndex, event.currentIndex);
  }

  trackServicio = (_: number, s: Servicio) => s.id;

  private normalizarServicio(s: Servicio) {
    return {
      id: s.id,
      titulo: s.titulo,
      descripcion: s.descripcion,
      categoria: s.categoria,
      icono: s.icono,
      imagen: s.imagen,
    };
  }

  private capturarSnapshot() {
    if (!this.paginaEditando) {
      this.snapshotContenido = '';
      this.snapshotServicios = '';
      this.snapshotProyectos = '';
      return;
    }
    const key = this.slugASchema[this.paginaEditando.slug];
    this.snapshotContenido = JSON.stringify(this.contenidoPaginas[key] || {});
    this.snapshotServicios =
      key === 'servicios'
        ? JSON.stringify(this.serviciosDraft.map((s) => this.normalizarServicio(s)))
        : '';
    this.snapshotProyectos =
      key === 'proyectos'
        ? JSON.stringify(this.proyectosDraft.map((p) => this.normalizarProyecto(p)))
        : '';
  }

  get hayCambiosSinGuardar(): boolean {
    if (!this.paginaEditando) return false;
    const key = this.slugASchema[this.paginaEditando.slug];
    if (!key) return false;

    const contenidoActual = JSON.stringify(this.contenidoPaginas[key] || {});
    if (contenidoActual !== this.snapshotContenido) return true;

    if (key === 'servicios') {
      const serviciosActual = JSON.stringify(
        this.serviciosDraft.map((s) => this.normalizarServicio(s)),
      );
      if (serviciosActual !== this.snapshotServicios) return true;
    }

    if (key === 'proyectos') {
      const proyectosActual = JSON.stringify(
        this.proyectosDraft.map((p) => this.normalizarProyecto(p)),
      );
      if (proyectosActual !== this.snapshotProyectos) return true;
    }

    return false;
  }
  // ===== CRUD de Proyectos =====
  categoriasProyecto = [
    { value: 'corporativo', label: 'Corporativo' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'residencial', label: 'Residencial' },
    { value: 'infraestructura', label: 'Infraestructura' },
    { value: 'institucional', label: 'Institucional' },
  ];

  proyectoFormAbierto = false;
  proyectoEditandoId: number | null = null;
  proyectoForm = this.proyectoVacio();
  proyectoAEliminar: Proyecto | null = null;
  proyectosDraft: Proyecto[] = [];
  private tempIdSeqProyecto = -1;
  private snapshotProyectos = '';

  private proyectoVacio() {
    return {
      nombre: '',
      iniciales: '',
      logoUrl: '',
      categoria: 'corporativo',
      ubicacion: '',
      anio: new Date().getFullYear(),
      colorMarca: '#0a4d7a',
      descripcion: '',
    };
  }

  private normalizarProyecto(p: Proyecto) {
    return {
      id: p.id,
      nombre: p.nombre,
      iniciales: p.iniciales,
      logoUrl: p.logoUrl,
      categoria: p.categoria,
      ubicacion: p.ubicacion,
      anio: p.anio,
      colorMarca: p.colorMarca,
      descripcion: p.descripcion,
    };
  }
  etiquetaCategoriaProyecto(cat: string): string {
    return this.catalogo.etiquetaCategoriaProyecto(cat);
  }

  nuevoProyecto() {
    this.proyectoEditandoId = null;
    this.proyectoForm = this.proyectoVacio();
    this.proyectoFormAbierto = true;
  }

  editarProyectoCat(p: Proyecto) {
    this.proyectoEditandoId = p.id;
    this.proyectoForm = {
      nombre: p.nombre,
      iniciales: p.iniciales,
      logoUrl: p.logoUrl || '',
      categoria: p.categoria,
      ubicacion: p.ubicacion,
      anio: p.anio,
      colorMarca: p.colorMarca,
      descripcion: p.descripcion || '',
    };
    this.proyectoFormAbierto = true;
  }

  cancelarProyectoForm() {
    this.proyectoFormAbierto = false;
    this.proyectoEditandoId = null;
    this.proyectoForm = this.proyectoVacio();
  }

  guardarProyectoCat() {
    if (!this.proyectoForm.nombre.trim()) return;
    if (this.proyectoEditandoId != null) {
      const idx = this.proyectosDraft.findIndex((p) => p.id === this.proyectoEditandoId);
      if (idx >= 0) this.proyectosDraft[idx] = { ...this.proyectosDraft[idx], ...this.proyectoForm };
    } else {
      this.proyectosDraft.push({
        id: this.tempIdSeqProyecto--,
        orden: this.proyectosDraft.length + 1,
        ...this.proyectoForm,
      } as Proyecto);
    }
    this.cancelarProyectoForm();
  }

  pedirEliminarProyecto(p: Proyecto) {
    this.proyectoAEliminar = p;
  }

  cancelarEliminarProyecto() {
    this.proyectoAEliminar = null;
  }

  confirmarEliminarProyecto() {
    if (!this.proyectoAEliminar) return;
    const id = this.proyectoAEliminar.id;
    this.proyectosDraft = this.proyectosDraft.filter((p) => p.id !== id);
    this.proyectoAEliminar = null;
  }

  reordenarProyecto(event: CdkDragDrop<Proyecto[]>) {
    moveItemInArray(this.proyectosDraft, event.previousIndex, event.currentIndex);
  }

  trackProyecto = (_: number, p: Proyecto) => p.id;
}
