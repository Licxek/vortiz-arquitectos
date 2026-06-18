import { Component, OnInit, HostListener, inject, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ContenidoService } from '../../../core/services/contenido.service'; // ajusta la ruta
import { CatalogoService, Servicio, Proyecto } from '../../../core/services/catalogo.service'; // ajusta la ruta
import { FormatoTextoPipe } from '../../../shared/pipes/formato-texto.pipe'; // ajusta ruta
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin, Observable } from 'rxjs';
import { PaginasService, Pagina as PaginaBackend } from '../../../core/services/paginas.service';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ImageGalleryInputComponent } from '../../../shared/image-gallery-input/image-gallery-input.component';

interface Pagina {
  id: number;
  titulo: string;
  slug: string;
  tipo: 'fija' | 'personalizada';
  visible: boolean;
  estado: 'borrador' | 'publicada' | 'programada'; // 👈 NUEVO
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
  serviciosIds?: number[];
}

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string;
  bloquesIniciales: string[];
}

type ItemTemplate = {
  [key: string]: {
    label: string;
    tipo: 'texto' | 'textarea' | 'icono';
    placeholder?: string;
    maxLength?: number;
    catalogoIconos?: 'valores' | 'servicios';
  };
};

interface CampoEdicion {
  key: string;
  label: string;
  tipo: 'texto' | 'textarea' | 'imagen' | 'url' | 'seleccion' | 'catalogo' | 'lista';
  placeholder?: string;
  maxLength?: number;
  opciones?: { value: string; label: string }[];
  fuente?: 'servicios' | 'proyectos';
  default?: string;
  limite?: number;
  ayuda?: string;

  // 👇 Para tipo 'lista'
  itemTemplate?: ItemTemplate;
  itemLabelKey?: string;
  maxItems?: number;
}

interface SeccionEditable {
  id: string;
  nombre: string;
  icono: string;
  campos: CampoEdicion[];
}
type VistaModo = 'grid' | 'lista';

type EstadoAutoSave = 'oculto' | 'cambios' | 'guardando' | 'guardado' | 'error';

interface BorradorLocal {
  formNuevaPagina: any;
  plantillaSeleccionada: string;
  seccionActiva: string;
  paginaEditandoId: number | null;
  timestamp: number;
}

@Component({
  selector: 'app-paginas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FormatoTextoPipe,
    DragDropModule,
    ImageUploadComponent,
    SkeletonComponent,
    ImageGalleryInputComponent,
  ],
  templateUrl: './paginas.component.html',
})
export class PaginasComponent implements OnInit {
  busqueda = '';
  filtroActivo: 'todas' | 'fijas' | 'personalizadas' | 'ocultas' | 'borradores' = 'todas';
  menuAbiertoId: number | null = null;
  mostrarConfirmarSalir = false;
  mostrarConfirmarGuardar = false;
  cargando = signal(true);
  private snapshotContenido = '';
  private snapshotServicios = '';
  private paginasService = inject(PaginasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  vistaModo: VistaModo = 'grid';
  // Auto-save
  estadoAutoSave: EstadoAutoSave = 'oculto';
  private ultimoGuardado: number | null = null;
  tiempoUltimoGuardado = '';
  borradorPendiente: BorradorLocal | null = null;
  private readonly STORAGE_BORRADOR = 'vortiz_paginas_borrador_local';
  private autoSaveTimer: any = null;
  private actualizadorTiempoTimer: any = null;
  private paginasFijas: Pagina[] = [
    {
      id: -1,
      titulo: 'Inicio',
      slug: '/',
      tipo: 'fija',
      visible: true,
      estado: 'publicada',
      ultimaEdicion: '—',
      icono: 'home',
      color: 'blue',
    },
    {
      id: -2,
      titulo: 'Nosotros',
      slug: '/nosotros',
      tipo: 'fija',
      visible: true,
      estado: 'publicada',
      ultimaEdicion: '—',
      icono: 'users',
      color: 'green',
    },
    {
      id: -3,
      titulo: 'Proyectos',
      slug: '/proyectos',
      tipo: 'fija',
      visible: true,
      estado: 'publicada',
      ultimaEdicion: '—',
      icono: 'building',
      color: 'orange',
    },
    {
      id: -4,
      titulo: 'Servicios',
      slug: '/servicios',
      tipo: 'fija',
      visible: true,
      estado: 'publicada',
      ultimaEdicion: '—',
      icono: 'briefcase',
      color: 'purple',
    },
    {
      id: -5,
      titulo: 'Citas',
      slug: '/citas',
      tipo: 'fija',
      visible: true,
      estado: 'publicada',
      ultimaEdicion: '—',
      icono: 'calendar',
      color: 'pink',
    },
  ];

  /** Páginas dinámicas — vienen del backend. */
  paginasDinamicas: Pagina[] = [];

  /** Combina fijas + dinámicas para mostrar en el grid. */
  get paginas(): Pagina[] {
    return [...this.paginasFijas, ...this.paginasDinamicas];
  }

  /** ID de la página dinámica que se está editando (null = creando nueva). */
  paginaEditandoId: number | null = null;

  /** Página candidata a eliminar (para mostrar modal de confirmación). */
  paginaAEliminar: Pagina | null = null;

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
          {
            key: 'lista',
            label: 'Estadísticas',
            tipo: 'lista',
            itemTemplate: {
              valor: { label: 'Número', tipo: 'texto', placeholder: '20+', maxLength: 10 },
              label: { label: 'Etiqueta', tipo: 'texto', placeholder: 'Años de experiencia' },
            },
            itemLabelKey: 'label',
            maxItems: 6,
            ayuda: 'Agrega los números clave de tu negocio. Se muestran en grande en el home.',
          },
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
          {
            key: 'lista',
            label: 'Pasos del proceso',
            tipo: 'lista',
            itemTemplate: {
              numero: { label: 'Número', tipo: 'texto', placeholder: '01', maxLength: 3 },
              titulo: { label: 'Título del paso', tipo: 'texto' },
              descripcion: { label: 'Descripción', tipo: 'textarea' },
            },
            itemLabelKey: 'titulo',
            maxItems: 8,
            ayuda: 'Define cómo trabajas con tus clientes paso a paso.',
          },
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
            ayuda: 'Usa *palabra* para itálica y ~palabra~ para azul',
          },
          { key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
          { key: 'imagenFondo', label: 'Imagen de fondo', tipo: 'imagen' },
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
          { key: 'foto', label: 'Foto', tipo: 'imagen' },
          { key: 'biografia', label: 'Biografía (párrafo 1)', tipo: 'textarea' },
          { key: 'biografia2', label: 'Biografía (párrafo 2)', tipo: 'textarea' },
          { key: 'email', label: 'Email de contacto', tipo: 'texto' },
          { key: 'linkedin', label: 'LinkedIn (URL)', tipo: 'url' },
        ],
      },
      {
        id: 'credenciales',
        nombre: 'Credenciales',
        icono: '🎓',
        campos: [
          {
            key: 'lista',
            label: 'Formación y certificaciones',
            tipo: 'lista',
            itemTemplate: {
              titulo: {
                label: 'Título / Certificación',
                tipo: 'texto',
                placeholder: 'Ej: Arquitecto Titulado',
              },
              institucion: { label: 'Institución', tipo: 'texto' },
              anio: { label: 'Año', tipo: 'texto', placeholder: '2003', maxLength: 4 },
            },
            itemLabelKey: 'titulo',
            maxItems: 20,
            ayuda: 'Agrega los grados académicos y certificaciones del arquitecto.',
          },
        ],
      },
      {
        id: 'hitos',
        nombre: 'Hitos / Timeline',
        icono: '📅',
        campos: [
          {
            key: 'lista',
            label: 'Hitos en la trayectoria',
            tipo: 'lista',
            itemTemplate: {
              anio: { label: 'Año', tipo: 'texto', placeholder: '2005', maxLength: 4 },
              titulo: { label: 'Título del hito', tipo: 'texto' },
              descripcion: { label: 'Descripción', tipo: 'textarea' },
            },
            itemLabelKey: 'titulo',
            maxItems: 20,
            ayuda:
              'Hitos importantes ordenados cronológicamente. Se muestran como timeline en el sitio.',
          },
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
          {
            key: 'lista',
            label: 'Valores',
            tipo: 'lista',
            itemTemplate: {
              icono: {
                label: 'Ícono',
                tipo: 'icono',
                catalogoIconos: 'valores',
              },
              titulo: { label: 'Título', tipo: 'texto' },
              descripcion: { label: 'Descripción', tipo: 'textarea' },
            },
            itemLabelKey: 'titulo',
            maxItems: 12,
          },
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
          {
            key: 'imagenFondo', // 👈 NUEVO
            label: 'Imagen de fondo',
            tipo: 'imagen',
            default: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920',
          },
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
  contenidoPaginas: Record<string, Record<string, Record<string, any>>> = {};

  // ============ PREVIEW EMBEBIDA ============
  mostrarPreviewPagina = false;
  paginaPrevisualizando: Pagina | null = null;
  urlPreviewSegura: SafeResourceUrl | null = null;
  dispositivoPreview: 'desktop' | 'tablet' | 'mobile' = 'desktop';

  private sanitizer = inject(DomSanitizer);
  private contenidoService = inject(ContenidoService);

  private rutasPublicas: Record<string, string> = {
    '/': '/',
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

  ngOnInit() {
    this.cargarPaginasDinamicas();
    this.cargarPreferenciaVista(); // 👈 NUEVO
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.aplicarParamsDeUrl());

    this.aplicarParamsDeUrl();
  }

  private cargarPaginasDinamicas() {
    this.paginasService.getAdmin().subscribe({
      next: (data) => {
        this.paginasDinamicas = data.map((p) => this.mapearBackend(p));
        this.cargando.set(false); // 👈 NUEVO
        this.cdr.markForCheck();
      },
      error: () => {
        this.paginasDinamicas = [];
        this.cargando.set(false); // 👈 NUEVO
        this.cdr.markForCheck();
      },
    });
  }

  private mapearBackend(p: PaginaBackend): Pagina {
    return {
      id: p.id,
      titulo: p.titulo,
      slug: `/p/${p.slug}`,
      tipo: 'personalizada',
      visible: p.visible,
      estado: p.estado, // 👈 NUEVO
      ultimaEdicion: this.tiempoRelativo(p.updatedAt),
      icono: p.icono || 'document',
      color: p.color || 'gray',
    };
  }

  private tiempoRelativo(iso?: string): string {
    if (!iso) return 'Recién creada';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Hace unos segundos';
    if (min < 60) return `Hace ${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `Hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    const sem = Math.floor(dias / 7);
    if (sem < 4) return `Hace ${sem} semana${sem > 1 ? 's' : ''}`;
    const meses = Math.floor(dias / 30);
    return `Hace ${meses} mes${meses > 1 ? 'es' : ''}`;
  }

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
      case 'borradores': // 👈 NUEVO
        resultado = resultado.filter((p) => p.estado === 'borrador');
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
    this.menuAbiertoId = null;

    if (pagina.tipo === 'fija') {
      // Las fijas son rutas de Angular - solo local, sin persistir.
      // (Si en futuro quieres ocultar fijas del menú, agrega columna en BD)
      pagina.visible = !pagina.visible;
      this.cdr.markForCheck();
      return;
    }

    // Personalizada → persistir al backend
    const nuevoVisible = !pagina.visible;
    this.paginasService.actualizar(pagina.id, { visible: nuevoVisible }).subscribe({
      next: () => {
        pagina.visible = nuevoVisible;
        this.cdr.markForCheck();
        this.flashMensaje(nuevoVisible ? 'Página visible' : 'Página oculta');
      },
      error: () => {
        this.flashMensaje('Error al cambiar visibilidad', 'info');
      },
    });
  }

  eliminarPagina(pagina: Pagina) {
    this.menuAbiertoId = null;
    if (pagina.tipo === 'fija') return; // Fijas no se eliminan
    this.paginaAEliminar = pagina; // Abre modal de confirmación
  }

  cancelarEliminarPagina() {
    this.paginaAEliminar = null;
  }

  confirmarEliminarPagina() {
    if (!this.paginaAEliminar) return;
    const id = this.paginaAEliminar.id;

    this.paginasService.eliminar(id).subscribe({
      next: () => {
        this.paginasDinamicas = this.paginasDinamicas.filter((p) => p.id !== id);
        this.paginaAEliminar = null;
        this.flashMensaje('Página eliminada');
        this.cdr.markForCheck();
      },
      error: () => {
        this.paginaAEliminar = null;
        this.flashMensaje('Error al eliminar la página', 'info');
        this.cdr.markForCheck();
      },
    });
  }

  @HostListener('document:click')
  cerrarMenus() {
    this.menuAbiertoId = null;
  }

  abrirNuevaPagina(): void {
    // Revisar si hay un borrador local pendiente
    const borradorRaw = localStorage.getItem(this.STORAGE_BORRADOR);

    if (borradorRaw) {
      try {
        const borrador: BorradorLocal = JSON.parse(borradorRaw);
        // Solo ofrecer restaurar si hay título mínimo
        if (borrador.formNuevaPagina?.titulo?.trim()) {
          this.borradorPendiente = borrador;
          return; // Espera decisión del usuario
        }
      } catch {
        localStorage.removeItem(this.STORAGE_BORRADOR);
      }
    }

    this.iniciarNuevaPaginaLimpia();
  }

  cerrarNuevaPagina(): void {
    this.mostrarNuevaPagina = false;
    this.mostrarMenuBloques = false;
    this.detenerActualizadorTiempo();
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
      nuevoBloque.serviciosIds = []; // empieza sin nada seleccionado
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
    if (!this.formNuevaPagina.titulo.trim()) {
      this.flashMensaje('El título es requerido', 'info');
      return;
    }

    // Construir payload limpio para el backend (sin campos de UI)
    const payload: Partial<PaginaBackend> = {
      titulo: this.formNuevaPagina.titulo.trim(),
      slug: this.formNuevaPagina.slug.trim() || undefined,
      descripcion: this.formNuevaPagina.descripcion || '',
      imagenDestacada: this.formNuevaPagina.imagenDestacada || '',
      categoria: this.formNuevaPagina.categoria,
      estado: publicar ? 'publicada' : 'borrador',
      visibilidad: this.formNuevaPagina.visibilidad,
      mostrarEnMenu: this.formNuevaPagina.mostrarEnMenu,
      visible: true,
      // Stripear "expandido" (UI state) antes de mandar al backend
      bloques: this.formNuevaPagina.bloques.map((b) => {
        const { expandido, ...resto } = b;
        return resto;
      }),
      seo: this.formNuevaPagina.seo,
      permitirComentarios: this.formNuevaPagina.permitirComentarios,
    };

    this.guardandoServicio = true;
    this.cdr.markForCheck();

    const obs$ = this.paginaEditandoId
      ? this.paginasService.actualizar(this.paginaEditandoId, payload)
      : this.paginasService.crear(payload);

    obs$.subscribe({
      next: (data) => {
        this.guardandoServicio = false;
        const mapeada = this.mapearBackend(data);

        if (this.paginaEditandoId) {
          const idx = this.paginasDinamicas.findIndex((p) => p.id === this.paginaEditandoId);
          if (idx >= 0) this.paginasDinamicas[idx] = mapeada;
        } else {
          this.paginasDinamicas.push(mapeada);
        }

        this.cdr.markForCheck();
        this.cerrarNuevaPagina();
        localStorage.removeItem(this.STORAGE_BORRADOR);
        this.estadoAutoSave = 'oculto';
        this.ultimoGuardado = null;
        this.flashMensaje(publicar ? 'Página publicada' : 'Borrador guardado');
      },
      error: (err) => {
        this.guardandoServicio = false;
        this.flashMensaje(err?.error?.message || 'Error al guardar', 'info');
        this.cdr.markForCheck();
      },
    });
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

    if (pagina.tipo === 'personalizada') {
      // Cargar datos del backend y abrir modal en modo edición
      this.paginasService.getAdminPorId(pagina.id).subscribe({
        next: (data) => {
          this.paginaEditandoId = data.id;
          this.formNuevaPagina = {
            titulo: data.titulo,
            slug: data.slug,
            descripcion: data.descripcion,
            imagenDestacada: data.imagenDestacada,
            categoria: data.categoria,
            mostrarEnMenu: data.mostrarEnMenu,
            posicionMenu: data.posicionMenu,
            bloques: (data.bloques || []).map((b, i) => ({
              ...b,
              id: b.id || Date.now() + i,
              expandido: false,
              serviciosIds: b.tipo === 'servicios' ? b.serviciosIds || [] : b.serviciosIds,
            })) as BloqueContenido[],
            seo: {
              metaTitle: data.seo?.metaTitle || '',
              metaDescription: data.seo?.metaDescription || '',
              keywords: data.seo?.keywords || '',
            },
            estado: data.estado,
            fechaPublicacion: data.fechaPublicacion
              ? String(data.fechaPublicacion).substring(0, 16)
              : '',
            visibilidad: data.visibilidad,
            permitirComentarios: data.permitirComentarios,
            plantillaLayout: 'default',
          };
          // Saltar la selección de plantilla cuando editamos
          this.plantillaSeleccionada = 'blanco';
          this.seccionActiva = 'info';
          this.mostrarNuevaPagina = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.flashMensaje('No se pudo cargar la página', 'info');
        },
      });
      return;
    }

    // Fija → flujo existente del schema editor
    this.paginaEditando = pagina;
    const schemaKey = this.slugASchema[pagina.slug];
    if (!schemaKey) return;

    this.contenidoPaginas[schemaKey] = {};
    this.schemasPaginas[schemaKey].forEach((seccion) => {
      this.contenidoPaginas[schemaKey][seccion.id] = {};
      seccion.campos.forEach((campo) => {
        if (campo.tipo === 'catalogo') return;

        // 👇 NUEVO: tipo 'lista'
        if (campo.tipo === 'lista') {
          const listaGuardada = this.contenidoService.getLista<any>(
            schemaKey,
            seccion.id,
            [],
            campo.key,
          );
          this.contenidoPaginas[schemaKey][seccion.id][campo.key] = listaGuardada.map((item) => ({
            ...item,
          })); // copia defensiva
          return;
        }

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

  get contenidoSeccionActual(): Record<string, any> {
    if (!this.paginaEditando) return {};
    const key = this.slugASchema[this.paginaEditando.slug];
    return this.contenidoPaginas[key]?.[this.seccionEditandoActiva] || {};
  }

  actualizarCampo(campoKey: string, valor: any) {
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
        cliente: p.cliente,
        imagenesPublicas: p.imagenesPublicas,
        videoUrl: p.videoUrl,
        publicado: true, // 👈 CRÍTICO
        orden: i + 1,
      })) as any[]; // 👈 cast (publicado no está en interface)
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
    const actual = String(this.contenidoSeccionActual[campoKey] || '');
    return actual
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(value);
  }

  contarSeleccionados(campoKey: string): number {
    const actual = String(this.contenidoSeccionActual[campoKey] || '');
    return actual
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean).length;
  }

  limiteAlcanzado(campo: CampoEdicion): boolean {
    return !!campo.limite && this.contarSeleccionados(campo.key) >= campo.limite;
  }

  toggleSeleccion(campo: CampoEdicion, value: string) {
    let seleccionados = String(this.contenidoSeccionActual[campo.key] || '')
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

  protected catalogo = inject(CatalogoService);

  opcionesDe(campo: CampoEdicion): { value: string; label: string }[] {
    if (campo.fuente === 'servicios') {
      return this.catalogo.getServicios().map((s) => ({
        value: String(s.id),
        label: s.titulo,
      }));
    }
    if (campo.fuente === 'proyectos') {
      return this.catalogo.getProyectos().map((p) => ({
        value: String(p.id),
        label: p.nombre,
      }));
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
      cliente: '', // 👈 NUEVO
      imagenesPublicas: [] as string[], // 👈 NUEVO
      videoUrl: '', // 👈 NUEVO
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
      cliente: p.cliente, // 👈 NUEVO
      imagenesPublicas: p.imagenesPublicas, // 👈 NUEVO
      videoUrl: p.videoUrl,
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
      cliente: p.cliente || '', // 👈 NUEVO
      imagenesPublicas: [...(p.imagenesPublicas || [])], // 👈 NUEVO
      videoUrl: p.videoUrl || '', // 👈 NUEVO
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
      if (idx >= 0)
        this.proyectosDraft[idx] = { ...this.proyectosDraft[idx], ...this.proyectoForm };
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

  /** Una página está "live" cuando es visible Y publicada. */
  estaLive(pagina: Pagina): boolean {
    return pagina.visible && pagina.estado === 'publicada';
  }

  get totalBorradores(): number {
    return this.paginas.filter((p) => p.estado === 'borrador').length;
  }

  toggleServicioEnBloque(bloque: BloqueContenido, servicioId: number) {
    if (!bloque.serviciosIds) bloque.serviciosIds = [];
    const idx = bloque.serviciosIds.indexOf(servicioId);
    if (idx >= 0) {
      bloque.serviciosIds.splice(idx, 1);
    } else {
      bloque.serviciosIds.push(servicioId);
    }
  }

  estaServicioEnBloque(bloque: BloqueContenido, servicioId: number): boolean {
    return (bloque.serviciosIds || []).includes(servicioId);
  }

  // ============ MANEJO DE LISTAS DINÁMICAS ============

  /** Obtiene la lista del campo actual (array de objetos) */
  obtenerLista(campo: CampoEdicion): any[] {
    if (!this.paginaEditando) return [];
    const key = this.slugASchema[this.paginaEditando.slug];
    const sec = this.seccionEditandoActiva;
    return this.contenidoPaginas[key]?.[sec]?.[campo.key] || [];
  }

  /** Agrega un item vacío a la lista */
  agregarItemLista(campo: CampoEdicion) {
    if (!this.paginaEditando) return;
    const key = this.slugASchema[this.paginaEditando.slug];
    const sec = this.seccionEditandoActiva;

    if (!this.contenidoPaginas[key][sec]) this.contenidoPaginas[key][sec] = {};
    if (!Array.isArray(this.contenidoPaginas[key][sec][campo.key])) {
      this.contenidoPaginas[key][sec][campo.key] = [];
    }

    const lista = this.contenidoPaginas[key][sec][campo.key] as any[];
    if (campo.maxItems && lista.length >= campo.maxItems) return;

    // Crear item vacío con todas las keys del template
    const nuevoItem: any = {};
    Object.keys(campo.itemTemplate || {}).forEach((k) => (nuevoItem[k] = ''));
    lista.push(nuevoItem);
  }

  /** Elimina un item de la lista por índice */
  eliminarItemLista(campo: CampoEdicion, index: number) {
    if (!this.paginaEditando) return;
    const key = this.slugASchema[this.paginaEditando.slug];
    const sec = this.seccionEditandoActiva;
    const lista = this.contenidoPaginas[key]?.[sec]?.[campo.key];
    if (Array.isArray(lista)) lista.splice(index, 1);
  }

  /** Actualiza un campo específico de un item de la lista */
  actualizarItemLista(campo: CampoEdicion, index: number, itemKey: string, valor: any) {
    if (!this.paginaEditando) return;
    const key = this.slugASchema[this.paginaEditando.slug];
    const sec = this.seccionEditandoActiva;
    const lista = this.contenidoPaginas[key]?.[sec]?.[campo.key];
    if (Array.isArray(lista) && lista[index]) {
      lista[index][itemKey] = valor;
    }
  }

  /** Reordena items con drag-and-drop */
  reordenarItemLista(campo: CampoEdicion, event: CdkDragDrop<any[]>) {
    if (!this.paginaEditando) return;
    const key = this.slugASchema[this.paginaEditando.slug];
    const sec = this.seccionEditandoActiva;
    const lista = this.contenidoPaginas[key]?.[sec]?.[campo.key];
    if (Array.isArray(lista)) {
      moveItemInArray(lista, event.previousIndex, event.currentIndex);
    }
  }

  /** Helper para iterar keys de itemTemplate en el HTML */
  keysDeTemplate(campo: CampoEdicion): string[] {
    return Object.keys(campo.itemTemplate || {});
  }

  /** Devuelve el label para mostrar un item colapsado */
  labelDeItem(campo: CampoEdicion, item: any, index: number): string {
    const key = campo.itemLabelKey;
    if (key && item[key]?.trim()) return item[key];
    return `Item ${index + 1}`;
  }

  /** trackBy para los items de lista (usa el índice porque no tienen ID propio) */
  trackItemLista = (index: number, _: any) => index;

  private aplicarParamsDeUrl() {
    const params = this.route.snapshot.queryParamMap;

    // Filtros
    const filtro = params.get('filtro');
    if (filtro && ['todas', 'fijas', 'personalizadas', 'borradores', 'ocultas'].includes(filtro)) {
      this.filtroActivo = filtro as any;
    }

    // Acciones
    const accion = params.get('accion');

    if (accion === 'nueva') {
      setTimeout(() => {
        this.abrirNuevaPagina();
        this.cdr.detectChanges();
      }, 400);
    } else if (accion === 'editar') {
      const paginaKey = params.get('pagina');
      if (paginaKey) {
        // Map: nombre amigable → slug real de página fija
        const slugMap: Record<string, string> = {
          inicio: '/',
          nosotros: '/nosotros',
          proyectos: '/proyectos',
          servicios: '/servicios',
          citas: '/citas',
        };
        const slugReal = slugMap[paginaKey];
        if (slugReal) {
          // Esperar un poco más para que las páginas carguen
          setTimeout(() => {
            const paginaFija = this.paginasFijas.find((p) => p.slug === slugReal);
            if (paginaFija) {
              this.editarPagina(paginaFija);
              this.cdr.detectChanges();
            }
          }, 500);
        }
      }
    }
  }

  get resumenSitio(): string {
    const publicadas = this.paginas.filter((p) => p.estado === 'publicada' && p.visible).length;
    const borradores = this.totalBorradores;
    const ocultas = this.totalOcultas;

    const partes: string[] = [];
    if (publicadas > 0) {
      partes.push(`${publicadas} ${publicadas === 1 ? 'página publicada' : 'páginas publicadas'}`);
    }
    if (borradores > 0) {
      partes.push(`${borradores} en borrador`);
    }
    if (ocultas > 0) {
      partes.push(`${ocultas} ${ocultas === 1 ? 'oculta' : 'ocultas'}`);
    }

    if (partes.length === 0) return 'Aún no tienes páginas. Crea la primera para empezar.';
    if (partes.length === 1) return `Tu sitio tiene ${partes[0]}.`;
    if (partes.length === 2) return `Tu sitio tiene ${partes[0]} y ${partes[1]}.`;
    return `Tu sitio tiene ${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}.`;
  }

  get hayAlertas(): boolean {
    return this.totalBorradores > 0 || this.totalOcultas > 0;
  }

  /** Estado consolidado de una página para mostrar en la card */
  estadoVisual(pagina: Pagina): 'live' | 'borrador' | 'programada' | 'oculta' {
    if (pagina.estado === 'borrador') return 'borrador';
    if (pagina.estado === 'programada') return 'programada';
    if (pagina.estado === 'publicada' && !pagina.visible) return 'oculta';
    return 'live'; // publicada y visible
  }

  textoEstadoVisual(pagina: Pagina): string {
    const map = {
      live: 'En vivo',
      borrador: 'Borrador',
      programada: 'Programada',
      oculta: 'Oculta',
    };
    return map[this.estadoVisual(pagina)];
  }

  claseEstadoVisual(pagina: Pagina): Record<string, boolean> {
    const e = this.estadoVisual(pagina);
    return {
      'bg-green-50 text-green-700': e === 'live',
      'bg-orange-50 text-orange-700': e === 'borrador',
      'bg-blue-50 text-blue-700': e === 'programada',
      'bg-gray-100 text-gray-600': e === 'oculta',
    };
  }

  dotEstadoVisual(pagina: Pagina): Record<string, boolean> {
    const e = this.estadoVisual(pagina);
    return {
      'bg-green-500 animate-pulse': e === 'live',
      'bg-orange-500': e === 'borrador',
      'bg-blue-500': e === 'programada',
      'bg-gray-400': e === 'oculta',
    };
  }

  // Junto a las demás propiedades:
  private readonly STORAGE_VISTA = 'vortiz_paginas_vista';

  cambiarVistaModo(modo: VistaModo): void {
    this.vistaModo = modo;
    localStorage.setItem(this.STORAGE_VISTA, modo);
  }

  private cargarPreferenciaVista(): void {
    const guardada = localStorage.getItem(this.STORAGE_VISTA);
    if (guardada === 'lista' || guardada === 'grid') {
      this.vistaModo = guardada;
    }
  }

  @HostListener('document:keydown', ['$event'])
  manejarAtajos(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const editando =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable;

    // Esc: cerrar modal activo (funciona incluso si está escribiendo)
    if (event.key === 'Escape') {
      this.cerrarModalActivo();
      return;
    }

    // Ctrl+S / Cmd+S: guardar cambios
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      if (this.mostrarEditarPaginaFija) {
        event.preventDefault();
        this.pedirGuardarEdicionPagina();
        return;
      }
      if (this.mostrarNuevaPagina && this.formNuevaPagina.titulo.trim()) {
        event.preventDefault();
        this.guardarPagina(false); // guarda como borrador
        return;
      }
    }

    // Si está editando o hay modal abierto, no activamos atajos simples
    if (editando || this.hayModalAbierto()) return;

    const key = event.key.toLowerCase();

    // N: nueva página
    if (key === 'n') {
      event.preventDefault();
      this.abrirNuevaPagina();
      return;
    }

    // G: alternar vista grid/lista
    if (key === 'g') {
      event.preventDefault();
      this.cambiarVistaModo(this.vistaModo === 'grid' ? 'lista' : 'grid');
      return;
    }
  }

  private hayModalAbierto(): boolean {
    return !!(
      this.mostrarNuevaPagina ||
      this.mostrarEditarPaginaFija ||
      this.mostrarPreviewPagina ||
      this.mostrarConfirmarSalir ||
      this.mostrarConfirmarGuardar ||
      this.paginaAEliminar ||
      this.proyectoAEliminar ||
      this.servicioAEliminar
    );
  }

  private cerrarModalActivo() {
    // Cerrar en orden: más interno primero
    if (this.mostrarConfirmarSalir) {
      this.cancelarSalirEditarPagina();
      return;
    }
    if (this.mostrarConfirmarGuardar) {
      this.cancelarGuardarEdicionPagina();
      return;
    }
    if (this.servicioAEliminar) {
      this.cancelarEliminarServicio();
      return;
    }
    if (this.proyectoAEliminar) {
      this.cancelarEliminarProyecto();
      return;
    }
    if (this.paginaAEliminar) {
      this.cancelarEliminarPagina();
      return;
    }
    if (this.mostrarPreviewPagina) {
      this.cerrarPreviewPagina();
      return;
    }
    if (this.mostrarEditarPaginaFija) {
      this.pedirCerrarEditarPagina();
      return;
    }
    if (this.mostrarNuevaPagina) {
      this.cerrarNuevaPagina();
      return;
    }
  }

  /** Llamar cuando hay cambios en el form del wizard */
  marcarCambios(): void {
    // No marcar cambios si no hay título mínimo o si está cargando inicial
    if (!this.mostrarNuevaPagina) return;

    this.estadoAutoSave = 'cambios';

    // Debounce: 2 segundos después del último cambio
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.guardarBorradorLocal();
    }, 2000);
  }

  private guardarBorradorLocal(): void {
    // No guardar si no hay nada relevante
    if (!this.formNuevaPagina.titulo.trim() && this.formNuevaPagina.bloques.length === 0) {
      this.estadoAutoSave = 'oculto';
      this.cdr.markForCheck();
      return;
    }

    this.estadoAutoSave = 'guardando';
    this.cdr.markForCheck();

    try {
      const borrador: BorradorLocal = {
        formNuevaPagina: this.formNuevaPagina,
        plantillaSeleccionada: this.plantillaSeleccionada,
        seccionActiva: this.seccionActiva,
        paginaEditandoId: this.paginaEditandoId,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.STORAGE_BORRADOR, JSON.stringify(borrador));

      this.ultimoGuardado = Date.now();
      this.estadoAutoSave = 'guardado';
      this.actualizarTextoTiempo();
      this.iniciarActualizadorTiempo();
      this.cdr.markForCheck();
    } catch (e) {
      this.estadoAutoSave = 'error';
      this.cdr.markForCheck();
    }
  }

  private actualizarTextoTiempo(): void {
    if (!this.ultimoGuardado) {
      this.tiempoUltimoGuardado = '';
      return;
    }

    const segundos = Math.floor((Date.now() - this.ultimoGuardado) / 1000);

    if (segundos < 5) this.tiempoUltimoGuardado = 'Guardado';
    else if (segundos < 60) this.tiempoUltimoGuardado = `Guardado hace ${segundos} seg`;
    else {
      const min = Math.floor(segundos / 60);
      this.tiempoUltimoGuardado = `Guardado hace ${min} min`;
    }
  }

  private iniciarActualizadorTiempo(): void {
    if (this.actualizadorTiempoTimer) clearInterval(this.actualizadorTiempoTimer);
    this.actualizadorTiempoTimer = setInterval(() => {
      this.actualizarTextoTiempo();
      this.cdr.markForCheck();
    }, 5000);
  }

  private detenerActualizadorTiempo(): void {
    if (this.actualizadorTiempoTimer) {
      clearInterval(this.actualizadorTiempoTimer);
      this.actualizadorTiempoTimer = null;
    }
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /** Restaura un borrador pendiente */
  restaurarBorradorPendiente(): void {
    if (!this.borradorPendiente) return;
    const b = this.borradorPendiente;

    this.formNuevaPagina = b.formNuevaPagina;
    this.plantillaSeleccionada = b.plantillaSeleccionada;
    this.seccionActiva = b.seccionActiva as any;
    this.paginaEditandoId = b.paginaEditandoId;
    this.ultimoGuardado = b.timestamp;

    this.borradorPendiente = null;
    this.mostrarNuevaPagina = true;
    this.estadoAutoSave = 'guardado';
    this.actualizarTextoTiempo();
    this.iniciarActualizadorTiempo();
    this.cdr.markForCheck();
  }

  /** Descarta el borrador y empieza limpio */
  descartarBorradorPendiente(): void {
    localStorage.removeItem(this.STORAGE_BORRADOR);
    this.borradorPendiente = null;
    this.iniciarNuevaPaginaLimpia();
  }

  private iniciarNuevaPaginaLimpia(): void {
    this.paginaEditandoId = null;
    this.mostrarNuevaPagina = true;
    this.seccionActiva = 'plantilla';
    this.plantillaSeleccionada = '';
    this.formNuevaPagina = this.crearFormVacio();
    this.estadoAutoSave = 'oculto';
    this.ultimoGuardado = null;
  }

  /** Devuelve el tiempo relativo del borrador pendiente */
  get tiempoBorradorPendiente(): string {
    if (!this.borradorPendiente) return '';
    const diff = Date.now() - this.borradorPendiente.timestamp;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'hace unos segundos';
    if (min < 60) return `hace ${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    return dias === 1 ? 'ayer' : `hace ${dias} días`;
  }

  /** Catálogos de íconos disponibles para el selector visual */
  catalogosIconos: Record<string, { id: string; label: string; uso: string }[]> = {
    valores: [
      { id: 'handshake', label: 'Apretón de manos', uso: 'Confianza, acuerdos' },
      { id: 'document-check', label: 'Documento verificado', uso: 'Claridad, cumplimiento' },
      { id: 'shield-check', label: 'Escudo', uso: 'Compromiso, seguridad' },
      { id: 'hard-hat', label: 'Casco de obra', uso: 'Construcción, resultados' },
      { id: 'leaf', label: 'Hoja', uso: 'Sustentabilidad, naturaleza' },
      { id: 'lightning', label: 'Rayo', uso: 'Eficiencia, rapidez' },
    ],
    servicios: [
      { id: 'document', label: 'Documento', uso: 'Trámites, gestión' },
      { id: 'badge', label: 'Insignia', uso: 'Permisos, certificados' },
      { id: 'users', label: 'Equipo', uso: 'Gerencia, personas' },
      { id: 'eye', label: 'Ojo', uso: 'Supervisión, observación' },
      { id: 'cube', label: 'Cubo 3D', uso: 'Modelado, BIM' },
      { id: 'map', label: 'Mapa', uso: 'Topografía, ubicación' },
      { id: 'structure', label: 'Estructura', uso: 'Edificios, obra' },
      { id: 'leaf', label: 'Hoja', uso: 'Áreas verdes, jardines' },
      { id: 'water', label: 'Gota', uso: 'Hidráulica, agua' },
      { id: 'bulb', label: 'Foco', uso: 'Eléctrica, instalaciones' },
      { id: 'home', label: 'Casa', uso: 'Residencial' },
      { id: 'factory', label: 'Fábrica', uso: 'Industrial, naves' },
      { id: 'chat', label: 'Chat', uso: 'Asesoría, consulta' },
      { id: 'calculator', label: 'Calculadora', uso: 'Cotización, presupuesto' },
    ],
  };

  /** Helper para obtener el label amigable de un ícono */
  labelDeIcono(catalogo: 'valores' | 'servicios', id: string): string {
    return this.catalogosIconos[catalogo]?.find((i) => i.id === id)?.label || id;
  }

  /** Previsualizar desde el modal de Nueva/Editar página */
  previsualizarDesdeNueva() {
    if (!this.paginaEditandoId) return;

    // Buscar la página actual en el array
    const pagina = this.paginasDinamicas.find((p) => p.id === this.paginaEditandoId);
    if (pagina) {
      this.previsualizarPagina(pagina);
    }
  }
}
