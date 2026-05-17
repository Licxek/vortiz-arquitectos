import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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
  tipo: 'hero' | 'texto' | 'imagen' | 'galeria' | 'cita' | 'cta' | 'estadisticas' | 'servicios' | 'contacto' | 'mapa';
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  imagenUrl?: string;
  textoBoton?: string;
  expandido: boolean;
  items?: { titulo: string; valor?: string; descripcion?: string; icono?: string; }[];
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

@Component({
  selector: 'app-paginas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './paginas.component.html',
})
export class PaginasComponent implements OnInit {
  busqueda = '';
  filtroActivo: 'todas' | 'fijas' | 'personalizadas' | 'ocultas' = 'todas';
  menuAbiertoId: number | null = null;

  paginas: Pagina[] = [
    { id: 1, titulo: 'Inicio', slug: '/', tipo: 'fija', visible: true, ultimaEdicion: 'Hace 2 días', icono: 'home', color: 'blue' },
    { id: 2, titulo: 'Nosotros', slug: '/nosotros', tipo: 'fija', visible: true, ultimaEdicion: 'Hace 1 semana', icono: 'users', color: 'green' },
    { id: 3, titulo: 'Proyectos', slug: '/proyectos', tipo: 'fija', visible: true, ultimaEdicion: 'Hace 3 días', icono: 'building', color: 'orange' },
    { id: 4, titulo: 'Servicios', slug: '/servicios', tipo: 'fija', visible: true, ultimaEdicion: 'Ayer', icono: 'briefcase', color: 'purple' },
    { id: 5, titulo: 'Citas', slug: '/citas', tipo: 'fija', visible: true, ultimaEdicion: 'Hace 5 días', icono: 'calendar', color: 'pink' },
    { id: 6, titulo: 'Política de Privacidad', slug: '/p/privacidad', tipo: 'personalizada', visible: true, ultimaEdicion: 'Hace 2 semanas', icono: 'document', color: 'gray' },
    { id: 7, titulo: 'Términos y Condiciones', slug: '/p/terminos', tipo: 'personalizada', visible: false, ultimaEdicion: 'Hace 1 mes', icono: 'document', color: 'gray' },
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
    { id: 'config' as const, label: 'Configuración' }
  ];

  plantillas: Plantilla[] = [
    { id: 'blanco', nombre: 'En blanco', descripcion: 'Empieza desde cero con total libertad', bloquesIniciales: [] },
    { id: 'servicio', nombre: 'Página de Servicio', descripcion: 'Ideal para presentar un servicio específico', bloquesIniciales: ['hero', 'texto', 'estadisticas', 'cta'] },
    { id: 'nosotros', nombre: 'Nosotros / About', descripcion: 'Cuenta la historia de tu empresa', bloquesIniciales: ['hero', 'texto', 'imagen', 'estadisticas'] },
    { id: 'landing', nombre: 'Landing Page', descripcion: 'Página de aterrizaje con CTA fuerte', bloquesIniciales: ['hero', 'estadisticas', 'servicios', 'cta', 'contacto'] },
    { id: 'blog', nombre: 'Artículo de Blog', descripcion: 'Para publicaciones y artículos', bloquesIniciales: ['hero', 'texto', 'imagen', 'texto', 'cita'] },
    { id: 'portfolio', nombre: 'Portafolio', descripcion: 'Muestra tus proyectos destacados', bloquesIniciales: ['hero', 'galeria', 'cta'] }
  ];

  tiposBloques = [
    { tipo: 'hero', label: 'Hero', descripcion: 'Sección destacada con imagen y título', color: 'blue' },
    { tipo: 'texto', label: 'Texto', descripcion: 'Párrafos de contenido', color: 'gray' },
    { tipo: 'imagen', label: 'Imagen', descripcion: 'Imagen individual destacada', color: 'green' },
    { tipo: 'galeria', label: 'Galería', descripcion: 'Grid de varias imágenes', color: 'purple' },
    { tipo: 'cita', label: 'Cita / Testimonio', descripcion: 'Frase destacada con autor', color: 'orange' },
    { tipo: 'cta', label: 'CTA', descripcion: 'Llamado a la acción con botón', color: 'red' },
    { tipo: 'estadisticas', label: 'Estadísticas', descripcion: 'Números importantes destacados', color: 'blue' },
    { tipo: 'servicios', label: 'Servicios', descripcion: 'Lista de servicios ofrecidos', color: 'green' },
    { tipo: 'contacto', label: 'Formulario contacto', descripcion: 'Formulario de contacto', color: 'orange' },
    { tipo: 'mapa', label: 'Mapa', descripcion: 'Mapa con ubicación', color: 'gray' }
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
        keywords: ''
      },
      estado: 'borrador' as 'borrador' | 'publicada' | 'programada',
      fechaPublicacion: '',
      visibilidad: 'publica' as 'publica' | 'registrados' | 'contrasena',
      permitirComentarios: true,
      plantillaLayout: 'default'
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
    { value: 'legal', label: 'Legal', descripcion: 'Términos, privacidad, etc.' }
  ];

  get categoriaLabel() {
    return this.categoriasOpciones.find(c => c.value === this.formNuevaPagina.categoria)?.label || '';
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
      resultado = resultado.filter(p =>
        p.titulo.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
    }

    switch (this.filtroActivo) {
      case 'fijas': resultado = resultado.filter(p => p.tipo === 'fija'); break;
      case 'personalizadas': resultado = resultado.filter(p => p.tipo === 'personalizada'); break;
      case 'ocultas': resultado = resultado.filter(p => !p.visible); break;
    }

    return resultado;
  }

  get totalPaginas(): number { return this.paginas.length; }
  get totalVisibles(): number { return this.paginas.filter(p => p.visible).length; }
  get totalOcultas(): number { return this.paginas.filter(p => !p.visible).length; }
  get totalPersonalizadas(): number { return this.paginas.filter(p => p.tipo === 'personalizada').length; }

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
    this.paginas = this.paginas.filter(p => p.id !== pagina.id);
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
    const plantilla = this.plantillas.find(p => p.id === id);
    if (plantilla) {
      this.formNuevaPagina.bloques = plantilla.bloquesIniciales.map((tipo, i) => ({
        id: Date.now() + i,
        tipo: tipo as any,
        expandido: false
      }));
    }
  }

  actualizarSlug() {
    this.formNuevaPagina.slug = this.formNuevaPagina.titulo
      .toLowerCase()
      .trim()
      .replace(/[áéíóú]/g, m => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }[m] || ''))
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  agregarBloque(tipo: string) {
    const nuevoBloque: BloqueContenido = {
      id: Date.now(),
      tipo: tipo as any,
      expandido: true
    };

    // Inicializar campos según el tipo
    if (tipo === 'estadisticas') {
      nuevoBloque.items = [
        { titulo: 'Proyectos completados', valor: '50+' },
        { titulo: 'Clientes satisfechos', valor: '120+' },
        { titulo: 'Años de experiencia', valor: '15' }
      ];
    } else if (tipo === 'galeria') {
      nuevoBloque.imagenes = [];
    } else if (tipo === 'servicios') {
      nuevoBloque.items = [
        { titulo: 'Diseño arquitectónico', descripcion: 'Planos y renders 3D profesionales', icono: '✏️' },
        { titulo: 'Construcción', descripcion: 'Supervisión completa de obra', icono: '🏗️' }
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
    this.formNuevaPagina.bloques = this.formNuevaPagina.bloques.filter(b => b.id !== id);
  }

  moverBloque(id: number, dir: 'arriba' | 'abajo') {
    const idx = this.formNuevaPagina.bloques.findIndex(b => b.id === id);
    if (dir === 'arriba' && idx > 0) {
      [this.formNuevaPagina.bloques[idx], this.formNuevaPagina.bloques[idx - 1]] =
      [this.formNuevaPagina.bloques[idx - 1], this.formNuevaPagina.bloques[idx]];
    } else if (dir === 'abajo' && idx < this.formNuevaPagina.bloques.length - 1) {
      [this.formNuevaPagina.bloques[idx], this.formNuevaPagina.bloques[idx + 1]] =
      [this.formNuevaPagina.bloques[idx + 1], this.formNuevaPagina.bloques[idx]];
    }
  }

  toggleBloque(id: number) {
    const bloque = this.formNuevaPagina.bloques.find(b => b.id === id);
    if (bloque) bloque.expandido = !bloque.expandido;
  }

  irASeccion(s: 'plantilla' | 'info' | 'contenido' | 'seo' | 'config') {
    this.seccionActiva = s;
  }

  irSiguiente() {
    const idx = this.secciones.findIndex(s => s.id === this.seccionActiva);
    if (idx < this.secciones.length - 1) this.seccionActiva = this.secciones[idx + 1].id;
  }

  irAnterior() {
    const idx = this.secciones.findIndex(s => s.id === this.seccionActiva);
    if (idx > 0) this.seccionActiva = this.secciones[idx - 1].id;
  }

  guardarPagina(publicar: boolean) {
    this.formNuevaPagina.estado = publicar ? 'publicada' : 'borrador';
    console.log('Página guardada:', this.formNuevaPagina);
    this.cerrarNuevaPagina();
  }

  obtenerLabelBloque(tipo: string): string {
    return this.tiposBloques.find(t => t.tipo === tipo)?.label || tipo;
  }

  agregarItemBloque(bloqueId: number) {
    const b = this.formNuevaPagina.bloques.find(b => b.id === bloqueId);
    if (!b) return;
    if (!b.items) b.items = [];

    if (b.tipo === 'estadisticas') {
      b.items.push({ titulo: '', valor: '' });
    } else if (b.tipo === 'servicios') {
      b.items.push({ titulo: '', descripcion: '', icono: '⭐' });
    }
  }

  eliminarItemBloque(bloqueId: number, index: number) {
    const b = this.formNuevaPagina.bloques.find(b => b.id === bloqueId);
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
}
