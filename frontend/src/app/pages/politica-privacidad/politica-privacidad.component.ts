import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ContenidoService } from '../../core/services/contenido.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe';

interface ItemLista {
  titulo?: string;
  descripcion?: string;
}

@Component({
  selector: 'app-politica-privacidad',
  standalone: true,
  imports: [CommonModule, RouterModule, FormatoTextoPipe],
  templateUrl: './politica-privacidad.component.html',
})
export class PoliticaPrivacidadComponent implements OnInit {
  private contenido = inject(ContenidoService);

  // Hero
  heroBadge = signal('');
  heroTitulo = signal('');
  heroDescripcion = signal('');
  fechaActualizacion = signal('');

  // Secciones simples (título + contenido)
  introduccion = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
  terceros = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
  cookies = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
  seguridad = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
  cambios = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });

  // Responsable
  responsable = signal<{
    titulo: string;
    razonSocial: string;
    rfc: string;
    domicilio: string;
    contactoLegal: string;
  }>({ titulo: '', razonSocial: '', rfc: '', domicilio: '', contactoLegal: '' });

  // Secciones con lista
  datosRecopilados = signal<{ titulo: string; introduccion: string; lista: ItemLista[] }>({
    titulo: '',
    introduccion: '',
    lista: [],
  });
  finalidades = signal<{ titulo: string; introduccion: string; lista: ItemLista[] }>({
    titulo: '',
    introduccion: '',
    lista: [],
  });
  derechosARCO = signal<{
    titulo: string;
    introduccion: string;
    lista: ItemLista[];
    comoEjercer: string;
  }>({ titulo: '', introduccion: '', lista: [], comoEjercer: '' });

  // Contacto
  contacto = signal<{ titulo: string; descripcion: string }>({ titulo: '', descripcion: '' });

  ngOnInit() {
    const key = 'politicaPrivacidad';

    // Hero
    this.heroBadge.set(this.contenido.getCampo(key, 'hero', 'badge'));
    this.heroTitulo.set(this.contenido.getCampo(key, 'hero', 'titulo'));
    this.heroDescripcion.set(this.contenido.getCampo(key, 'hero', 'descripcion'));
    this.fechaActualizacion.set(this.contenido.getCampo(key, 'hero', 'fechaActualizacion'));

    // Introducción
    this.introduccion.set({
      titulo: this.contenido.getCampo(key, 'introduccion', 'titulo'),
      contenido: this.contenido.getCampo(key, 'introduccion', 'contenido'),
    });

    // Responsable
    this.responsable.set({
      titulo: this.contenido.getCampo(key, 'responsable', 'titulo'),
      razonSocial: this.contenido.getCampo(key, 'responsable', 'razonSocial'),
      rfc: this.contenido.getCampo(key, 'responsable', 'rfc'),
      domicilio: this.contenido.getCampo(key, 'responsable', 'domicilio'),
      contactoLegal: this.contenido.getCampo(key, 'responsable', 'contactoLegal'),
    });

    // Datos recopilados
    this.datosRecopilados.set({
      titulo: this.contenido.getCampo(key, 'datosRecopilados', 'titulo'),
      introduccion: this.contenido.getCampo(key, 'datosRecopilados', 'introduccion'),
      lista: this.contenido.getLista<ItemLista>(key, 'datosRecopilados', [], 'lista'),
    });

    // Finalidades
    this.finalidades.set({
      titulo: this.contenido.getCampo(key, 'finalidades', 'titulo'),
      introduccion: this.contenido.getCampo(key, 'finalidades', 'introduccion'),
      lista: this.contenido.getLista<ItemLista>(key, 'finalidades', [], 'lista'),
    });

    // Terceros
    this.terceros.set({
      titulo: this.contenido.getCampo(key, 'terceros', 'titulo'),
      contenido: this.contenido.getCampo(key, 'terceros', 'contenido'),
    });

    // Cookies
    this.cookies.set({
      titulo: this.contenido.getCampo(key, 'cookies', 'titulo'),
      contenido: this.contenido.getCampo(key, 'cookies', 'contenido'),
    });

    // Derechos ARCO
    this.derechosARCO.set({
      titulo: this.contenido.getCampo(key, 'derechosARCO', 'titulo'),
      introduccion: this.contenido.getCampo(key, 'derechosARCO', 'introduccion'),
      lista: this.contenido.getLista<ItemLista>(key, 'derechosARCO', [], 'lista'),
      comoEjercer: this.contenido.getCampo(key, 'derechosARCO', 'comoEjercer'),
    });

    // Seguridad
    this.seguridad.set({
      titulo: this.contenido.getCampo(key, 'seguridad', 'titulo'),
      contenido: this.contenido.getCampo(key, 'seguridad', 'contenido'),
    });

    // Cambios
    this.cambios.set({
      titulo: this.contenido.getCampo(key, 'cambios', 'titulo'),
      contenido: this.contenido.getCampo(key, 'cambios', 'contenido'),
    });

    // Contacto
    this.contacto.set({
      titulo: this.contenido.getCampo(key, 'contacto', 'titulo'),
      descripcion: this.contenido.getCampo(key, 'contacto', 'descripcion'),
    });

     // Retención
    this.retencion.set({
      titulo: this.contenido.getCampo(key, 'retencion', 'titulo'),
      contenido: this.contenido.getCampo(key, 'retencion', 'contenido'),
    });

    // Scroll top al cargar
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  scrollASeccion(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  retencion = signal<{ titulo: string; contenido: string }>({ titulo: '', contenido: '' });
}
