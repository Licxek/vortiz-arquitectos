import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ContenidoService } from '../../core/services/contenido.service';
import { CatalogoService, Servicio, Proyecto } from '../../core/services/catalogo.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe'; // ajusta ruta


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
  imports: [CommonModule, RouterModule , FormatoTextoPipe],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {

  stats: Stat[] = [
    { valor: '20+', label: 'Años de experiencia' },
    { valor: '150+', label: 'Proyectos completados' },
    { valor: '120+', label: 'Clientes satisfechos' },
    { valor: '12', label: 'Especialistas en el equipo' }
  ];

  servicios: Servicio[] = [];
  proyectosDestacados: Proyecto[] = [];


  pasos: Paso[] = [
    { numero: '01', titulo: 'Conversación inicial', descripcion: 'Escuchamos tu visión, necesidades y presupuesto para entender el proyecto.' },
    { numero: '02', titulo: 'Diseño y planeación', descripcion: 'Desarrollamos planos, renders 3D y cronograma detallado.' },
    { numero: '03', titulo: 'Ejecución supervisada', descripcion: 'Construimos con metodología BIM y supervisión técnica constante.' },
    { numero: '04', titulo: 'Entrega y acompañamiento', descripcion: 'Te entregamos el proyecto terminado con soporte post-construcción.' }
  ];

  // en el componente de la página pública (ej: home.component.ts)
  private contenidoService = inject(ContenidoService);

  // ---- Contenido editable del HERO (con sus valores por defecto) ----
  heroBadge = 'Arquitectura · Construcción · Diseño';
   heroTitulo = 'Diseñamos *espacios*, construimos *confianza*';
  heroDescripcion = 'Más de 20 años transformando ideas en proyectos arquitectónicos que perduran en el tiempo, en Durango y todo México.';
  heroImagenFondo = 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1920';
  heroCta1 = 'Ver nuestros proyectos';
  heroCta2 = 'Agendar consulta';

  // ---- FILOSOFÍA ----
  filoBadge = 'Sobre Vortiz Arquitectos';
  filoTitulo = 'Confianza y experiencia desde ~2005~';
  filoParrafo1 = 'Somos una firma de arquitectura con sede en Durango que combina diseño contemporáneo, tecnología BIM y metodología PMI para entregar proyectos residenciales, comerciales e industriales que superan las expectativas.';
  filoParrafo2 = 'Cada proyecto que tomamos lo tratamos como único: escuchamos, planeamos a detalle, ejecutamos con precisión y acompañamos hasta mucho después de la entrega.';
  filoImagen = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800';

  // ---- SERVICIOS (encabezado de la sección) ----
  servBadge = 'Servicios';
  servTitulo = 'Soluciones arquitectónicas a tu medida';
  servDescripcion = 'Desde el primer trazo hasta la entrega de llaves, te acompañamos con un equipo multidisciplinario.';

  // ---- PROCESO (encabezado) ----
  procBadge = 'Proceso';
  procTitulo = 'Así trabajamos contigo';

  // ---- CTA FINAL ----
  ctaBadge = 'Empieza tu proyecto';
  ctaTitulo  = '¿Listo para construir tu próximo *gran proyecto?*';
  ctaDescripcion = 'Agenda una conversación inicial sin compromiso. Te escuchamos, evaluamos tu idea y te decimos cómo podemos ayudarte a hacerla realidad.';
  ctaBoton1 = 'Agenda tu consulta inicial';
  ctaBoton2 = 'Escríbenos por WhatsApp';
  ctaImagenFondo = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920';

   // ---- PROYECTOS DESTACADOS (encabezado) ----
  proyBadge = 'Portafolio';
  proyTitulo = 'Marcas que confiaron en *nuestro trabajo*';

  // ---- Listas que realmente se muestran (filtradas por la selección del admin) ----
  serviciosVisibles: Servicio[] = [];
  proyectosVisibles: Proyecto[] = [];
  private catalogo = inject(CatalogoService);

  ngOnInit() {
    // Cargar catálogo (fuente única)
    this.servicios = this.catalogo.getServicios();
    this.proyectosDestacados = this.catalogo.getProyectos();
    // HERO
    this.heroBadge       = this.contenidoService.getCampo('inicio', 'hero', 'badge', this.heroBadge);
    this.heroTitulo      = this.contenidoService.getCampo('inicio', 'hero', 'titulo', this.heroTitulo);
    this.heroDescripcion = this.contenidoService.getCampo('inicio', 'hero', 'descripcion', this.heroDescripcion);
    this.heroImagenFondo = this.contenidoService.getCampo('inicio', 'hero', 'imagenFondo', this.heroImagenFondo);
    this.heroCta1        = this.contenidoService.getCampo('inicio', 'hero', 'cta1', this.heroCta1);
    this.heroCta2        = this.contenidoService.getCampo('inicio', 'hero', 'cta2', this.heroCta2);

    // FILOSOFÍA
    this.filoBadge    = this.contenidoService.getCampo('inicio', 'filosofia', 'badge', this.filoBadge);
    this.filoTitulo   = this.contenidoService.getCampo('inicio', 'filosofia', 'titulo', this.filoTitulo);
    this.filoParrafo1 = this.contenidoService.getCampo('inicio', 'filosofia', 'parrafo1', this.filoParrafo1);
    this.filoParrafo2 = this.contenidoService.getCampo('inicio', 'filosofia', 'parrafo2', this.filoParrafo2);
    this.filoImagen   = this.contenidoService.getCampo('inicio', 'filosofia', 'imagen', this.filoImagen);

    // STATS (sobre el array)
    this.stats[0].valor = this.contenidoService.getCampo('inicio', 'stats', 'stat1Valor', this.stats[0].valor);
    this.stats[0].label = this.contenidoService.getCampo('inicio', 'stats', 'stat1Label', this.stats[0].label);
    this.stats[1].valor = this.contenidoService.getCampo('inicio', 'stats', 'stat2Valor', this.stats[1].valor);
    this.stats[1].label = this.contenidoService.getCampo('inicio', 'stats', 'stat2Label', this.stats[1].label);
    this.stats[2].valor = this.contenidoService.getCampo('inicio', 'stats', 'stat3Valor', this.stats[2].valor);
    this.stats[2].label = this.contenidoService.getCampo('inicio', 'stats', 'stat3Label', this.stats[2].label);
    this.stats[3].valor = this.contenidoService.getCampo('inicio', 'stats', 'stat4Valor', this.stats[3].valor);
    this.stats[3].label = this.contenidoService.getCampo('inicio', 'stats', 'stat4Label', this.stats[3].label);

    // SERVICIOS (encabezado)
    this.servBadge       = this.contenidoService.getCampo('inicio', 'servicios', 'badge', this.servBadge);
    this.servTitulo      = this.contenidoService.getCampo('inicio', 'servicios', 'titulo', this.servTitulo);
    this.servDescripcion = this.contenidoService.getCampo('inicio', 'servicios', 'descripcion', this.servDescripcion);

    // PROCESO
    this.procBadge  = this.contenidoService.getCampo('inicio', 'proceso', 'badge', this.procBadge);
    this.procTitulo = this.contenidoService.getCampo('inicio', 'proceso', 'titulo', this.procTitulo);
    this.pasos[0].titulo      = this.contenidoService.getCampo('inicio', 'proceso', 'paso1Titulo', this.pasos[0].titulo);
    this.pasos[0].descripcion = this.contenidoService.getCampo('inicio', 'proceso', 'paso1Desc', this.pasos[0].descripcion);
    this.pasos[1].titulo      = this.contenidoService.getCampo('inicio', 'proceso', 'paso2Titulo', this.pasos[1].titulo);
    this.pasos[1].descripcion = this.contenidoService.getCampo('inicio', 'proceso', 'paso2Desc', this.pasos[1].descripcion);
    this.pasos[2].titulo      = this.contenidoService.getCampo('inicio', 'proceso', 'paso3Titulo', this.pasos[2].titulo);
    this.pasos[2].descripcion = this.contenidoService.getCampo('inicio', 'proceso', 'paso3Desc', this.pasos[2].descripcion);
    this.pasos[3].titulo      = this.contenidoService.getCampo('inicio', 'proceso', 'paso4Titulo', this.pasos[3].titulo);
    this.pasos[3].descripcion = this.contenidoService.getCampo('inicio', 'proceso', 'paso4Desc', this.pasos[3].descripcion);

    // CTA FINAL
    this.ctaBadge       = this.contenidoService.getCampo('inicio', 'cta', 'badge', this.ctaBadge);
    this.ctaTitulo      = this.contenidoService.getCampo('inicio', 'cta', 'titulo', this.ctaTitulo);
    this.ctaDescripcion = this.contenidoService.getCampo('inicio', 'cta', 'descripcion', this.ctaDescripcion);
    this.ctaBoton1      = this.contenidoService.getCampo('inicio', 'cta', 'cta1', this.ctaBoton1);
    this.ctaBoton2      = this.contenidoService.getCampo('inicio', 'cta', 'cta2', this.ctaBoton2);
    this.ctaImagenFondo = this.contenidoService.getCampo('inicio', 'cta', 'imagenFondo', this.ctaImagenFondo);

    // SERVICIOS - cuáles mostrar
    const servSel = this.contenidoService.getCampo('inicio', 'servicios', 'visibles', '');
    this.serviciosVisibles = this.filtrarPorSeleccion(this.servicios, servSel).slice(0, 6);

    // PROYECTOS - encabezado + cuáles mostrar
    this.proyBadge  = this.contenidoService.getCampo('inicio', 'proyectos', 'badge', this.proyBadge);
    this.proyTitulo = this.contenidoService.getCampo('inicio', 'proyectos', 'titulo', this.proyTitulo);
    const proySel = this.contenidoService.getCampo('inicio', 'proyectos', 'visibles', '');
    this.proyectosVisibles = this.filtrarPorSeleccion(this.proyectosDestacados, proySel);
  }

  private filtrarPorSeleccion<T>(lista: T[], seleccion: string): T[] {
    if (!seleccion.trim()) return lista; // nada guardado = mostrar todos
    const indices = seleccion.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    return lista.filter((_, i) => indices.includes(i));
  }

  etiquetaServicio(cat: string): string {
    return this.catalogo.etiquetaCategoriaServicio(cat);
  }
}
