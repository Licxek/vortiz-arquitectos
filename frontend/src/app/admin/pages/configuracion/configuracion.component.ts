import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfiguracionService } from '../../../core/services/configuracion.service'; // ajusta la ruta si tu carpeta es distinta
import { forkJoin } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service'; // ajusta la ruta

interface DiaSemana {
  nombre: string;
  abrev: string;
  activo: boolean;
}

interface DiaFeriado {
  id: number;
  fecha: string;
  motivo: string;
}

interface RedSocial {
  nombre: string;
  icono: string;
  url: string;
  activa: boolean;
  color: string;
  personalizada?: boolean;
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.component.html',
})
export class ConfiguracionComponent implements OnInit {

  constructor(private configuracionService: ConfiguracionService, private theme: ThemeService, private cdr: ChangeDetectorRef) {}

  // Tab activa
  tabActiva: 'negocio' | 'contacto' | 'agenda' | 'apariencia' | 'notificaciones' | 'seo' = 'negocio';

  // Mensaje de éxito flotante
  mensajeExito = '';
  guardando = false;
  confirmacionAbierta = false;
  seccionARestaurar = '';
  confirmacionGuardarAbierta = false;
  seccionAGuardar = '';

  // =========== NEGOCIO ===========
  negocio = {
    nombre: 'Vortiz Arquitectos',
    eslogan: 'Diseñamos espacios, construimos confianza.',
    direccion: 'Milpillas 101, La Forestal',
    ciudad: 'Durango',
    estado: 'Dgo.',
    codigoPostal: '34217',
    rfc: 'VOR000000-001'
  };

  // =========== CONTACTO ===========
  contacto = {
    telefono: '+52 618 000 0000',
    whatsapp: '618 000 0000',
    correoPublico: 'contacto@vortizarquitectos.com',
    correoNotificaciones: 'alertas@vortizarquitectos.com'
  };

  redes: RedSocial[] = [
    { nombre: 'Instagram', icono: 'instagram', url: 'https://www.instagram.com/vortizarquitectos', activa: true, color: 'pink' },
    { nombre: 'Facebook', icono: 'facebook', url: 'https://www.facebook.com/vortizarquitectos', activa: true, color: 'blue' },
    { nombre: 'LinkedIn', icono: 'linkedin', url: 'https://www.linkedin.com/in/vortizarquitectos', activa: true, color: 'sky' },
    { nombre: 'Twitter / X', icono: 'twitter', url: '', activa: false, color: 'gray' },
    { nombre: 'YouTube', icono: 'youtube', url: '', activa: false, color: 'red' },
    { nombre: 'WhatsApp', icono: 'whatsapp', url: 'https://wa.me/526180000000', activa: true, color: 'green' },
  ];

  // =========== AGENDA ===========
  diasSemana: DiaSemana[] = [
    { nombre: 'Lunes', abrev: 'Lun', activo: true },
    { nombre: 'Martes', abrev: 'Mar', activo: true },
    { nombre: 'Miércoles', abrev: 'Mié', activo: true },
    { nombre: 'Jueves', abrev: 'Jue', activo: true },
    { nombre: 'Viernes', abrev: 'Vie', activo: true },
    { nombre: 'Sábado', abrev: 'Sáb', activo: false },
    { nombre: 'Domingo', abrev: 'Dom', activo: false },
  ];

  agenda = {
    horaInicio: '09:00',
    horaFin: '18:00',
    duracionCita: 60,
    tiempoEntreCitas: 15,
    limiteDiario: 8
  };

  diasFeriados: DiaFeriado[] = [
    { id: 1, fecha: '2026-12-25', motivo: 'Navidad' },
    { id: 2, fecha: '2026-01-01', motivo: 'Año nuevo' },
    { id: 3, fecha: '2026-12-12', motivo: 'Día de la Virgen de Guadalupe' },
  ];
  nuevoFeriado = { fecha: '', motivo: '' };

  // =========== APARIENCIA ===========
  apariencia = {
    logoUrl: '/assets/img/logo.png',
    logoFooterUrl: '/assets/img/logo_vortiz.png',
    faviconUrl: '/assets/img/logo.ico',
    colorPrimario: '#0a4d7a',
    colorSecundario: '#0a1f3d',
    colorTextoNav: '#ffffff',
    colorTextoFooter: '#ffffff',
    degradadoInicio: '#000000',
    degradadoFin: '#0a1f3d'
  };

  // =========== NOTIFICACIONES ===========
  notificaciones = {
    nuevaCita: true,
    nuevaConsulta: true,
    resumenDiario: false,
    resumenSemanal: true,
    recordatorio24h: true,
    recordatorio1h: false,
    canalRecordatorio: 'email' as 'email' | 'whatsapp' | 'ambos'
  };

  // =========== SEO ===========
  seo = {
    metaTitle: 'Vortiz Arquitectos - Diseño y construcción profesional en Durango',
    metaDescription: 'Firma de arquitectura en Durango especializada en proyectos residenciales, comerciales e industriales. Diseñamos espacios, construimos confianza.',
    keywords: 'arquitectos durango, diseño residencial, proyectos comerciales, construcción',
    ogImageUrl: '/assets/img/og-image.png'
  };

  ngOnInit() {
    for (let h = 6; h <= 23; h++) {
      this.horasDisponibles.push(`${h.toString().padStart(2, '0')}:00`);
      this.horasDisponibles.push(`${h.toString().padStart(2, '0')}:30`);
    }

    this.configuracionService.obtenerCompleta().subscribe({
      next: (c) => {
        if (c.negocio) this.negocio = { ...this.negocio, ...c.negocio };
        if (c.contacto) this.contacto = { ...this.contacto, ...c.contacto };
        if (c.redes?.length) this.redes = c.redes;
        if (c.agenda) {
          const { diasSemana, diasFeriados, ...scalars } = c.agenda;
          this.agenda = { ...this.agenda, ...scalars };
          if (diasSemana?.length) this.diasSemana = diasSemana;
          if (diasFeriados) this.diasFeriados = diasFeriados;
        }
        if (c.apariencia) this.apariencia = { ...this.apariencia, ...c.apariencia };
        if (c.notificaciones) this.notificaciones = { ...this.notificaciones, ...c.notificaciones };
        if (c.seo) this.seo = { ...this.seo, ...c.seo };
        this.cdr.markForCheck();
      },
      error: () => {} // si falla, se quedan los valores por defecto
    });
  }

  cambiarTab(tab: 'negocio' | 'contacto' | 'agenda' | 'apariencia' | 'notificaciones' | 'seo') {
    this.tabActiva = tab;
  }

  toggleDia(dia: DiaSemana) {
    dia.activo = !dia.activo;
  }

  toggleRed(red: RedSocial) {
    red.activa = !red.activa;
  }

  agregarRed() {
    this.redes.push({ nombre: '', icono: 'generico', url: '', activa: true, color: 'gray', personalizada: true });
  }

  private detectarIcono(nombre: string): string {
    const n = (nombre || '').toLowerCase().trim();
    if (n.includes('instagram') || n.includes('insta')) return 'instagram';
    if (n.includes('facebook') || n.includes('face')) return 'facebook';
    if (n.includes('linkedin')) return 'linkedin';
    if (n.includes('whatsapp') || n.includes('whats')) return 'whatsapp';
    if (n.includes('youtube')) return 'youtube';
    if (n.includes('tiktok') || n.includes('tik tok')) return 'tiktok';
    if (n.includes('pinterest')) return 'pinterest';
    if (n.includes('telegram')) return 'telegram';
    if (n.includes('twitter') || n === 'x') return 'twitter';
    return 'generico';
  }

  actualizarIcono(red: RedSocial) {
    red.icono = this.detectarIcono(red.nombre);
  }

  eliminarRed(red: RedSocial) {
    this.redes = this.redes.filter((r) => r !== red);
  }

  get redesActivas() {
    return this.redes.filter((r) => r.activa).length;
  }

  agregarFeriado() {
    if (this.nuevoFeriado.fecha && this.nuevoFeriado.motivo) {
      this.diasFeriados.push({
        id: Date.now(),
        fecha: this.nuevoFeriado.fecha,
        motivo: this.nuevoFeriado.motivo
      });
      this.nuevoFeriado = { fecha: '', motivo: '' };
    }
  }

  eliminarFeriado(id: number) {
    this.diasFeriados = this.diasFeriados.filter(f => f.id !== id);
  }

  guardarCambios(seccion: string) {
    const cambios: { key: string; datos: any }[] = [];

    switch (seccion) {
      case 'Negocio':
        cambios.push({ key: 'negocio', datos: this.negocio });
        break;
      case 'Contacto':
        cambios.push({ key: 'contacto', datos: this.contacto });
        cambios.push({ key: 'redes', datos: this.redes });
        break;
      case 'Agenda':
        cambios.push({ key: 'agenda', datos: {
          ...this.agenda,
          diasSemana: this.diasSemana,
          diasFeriados: this.diasFeriados
        }});
        break;
      case 'Apariencia':
        cambios.push({ key: 'apariencia', datos: this.apariencia });
        break;
      case 'Notificaciones':
        cambios.push({ key: 'notificaciones', datos: this.notificaciones });
        break;
      case 'SEO':
        cambios.push({ key: 'seo', datos: this.seo });
        break;
    }

    this.guardando = true;
    forkJoin(cambios.map(c => this.configuracionService.guardarSeccion(c.key, c.datos))).subscribe({
      next: () => {
        this.guardando = false;
        this.configuracionService.cargarPublica();
        this.mensajeExito = `Cambios de "${seccion}" guardados correctamente`;
        this.cdr.markForCheck();
        setTimeout(() => { this.mensajeExito = ''; this.cdr.markForCheck(); }, 3000);
      },
      error: () => {
        this.guardando = false;
        this.mensajeExito = 'Error al guardar. Intenta de nuevo.';
        this.cdr.markForCheck();
        setTimeout(() => { this.mensajeExito = ''; this.cdr.markForCheck(); }, 3000);
      }
    });
  }

  pedirGuardar(seccion: string) {
    this.seccionAGuardar = seccion;
    this.confirmacionGuardarAbierta = true;
  }

  cancelarGuardado() {
    this.confirmacionGuardarAbierta = false;
    this.seccionAGuardar = '';
  }

  confirmarGuardado() {
    const seccion = this.seccionAGuardar;
    this.confirmacionGuardarAbierta = false;
    this.seccionAGuardar = '';
    this.guardarCambios(seccion);
  }

  // Selectores personalizados de la pestaña Agenda
  horasDisponibles: string[] = [];
  selectorHoraInicioAbierto = false;
  selectorHoraFinAbierto = false;
  selectorDuracionAbierto = false;
  selectorTiempoEntreAbierto = false;

  opcionesDuracion = [
    { value: 30, label: '30 minutos' },
    { value: 45, label: '45 minutos' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1 hora 30 min' },
    { value: 120, label: '2 horas' },
  ];

  opcionesTiempoEntre = [
    { value: 0, label: 'Sin descanso' },
    { value: 10, label: '10 minutos' },
    { value: 15, label: '15 minutos' },
    { value: 30, label: '30 minutos' },
  ];

  toggleSelectorHora(tipo: 'inicio' | 'fin', event: Event) {
    event.stopPropagation();
    this.cerrarTodos();
    if (tipo === 'inicio') this.selectorHoraInicioAbierto = true;
    else this.selectorHoraFinAbierto = true;
  }

  seleccionarHora(tipo: 'inicio' | 'fin', hora: string) {
    if (tipo === 'inicio') this.agenda.horaInicio = hora;
    else this.agenda.horaFin = hora;
    this.cerrarTodos();
  }

  toggleSelectorDuracion(event: Event) {
    event.stopPropagation();
    const estado = this.selectorDuracionAbierto;
    this.cerrarTodos();
    this.selectorDuracionAbierto = !estado;
  }

  seleccionarDuracion(valor: number) {
    this.agenda.duracionCita = valor;
    this.cerrarTodos();
  }

  get duracionLabel() {
    return this.opcionesDuracion.find(o => o.value === this.agenda.duracionCita)?.label || '';
  }

  toggleSelectorTiempoEntre(event: Event) {
    event.stopPropagation();
    const estado = this.selectorTiempoEntreAbierto;
    this.cerrarTodos();
    this.selectorTiempoEntreAbierto = !estado;
  }

  seleccionarTiempoEntre(valor: number) {
    this.agenda.tiempoEntreCitas = valor;
    this.cerrarTodos();
  }

  get tiempoEntreLabel() {
    return this.opcionesTiempoEntre.find(o => o.value === this.agenda.tiempoEntreCitas)?.label || '';
  }

  private cerrarTodos() {
    this.selectorHoraInicioAbierto = false;
    this.selectorHoraFinAbierto = false;
    this.selectorDuracionAbierto = false;
    this.selectorTiempoEntreAbierto = false;
  }

  @HostListener('document:click')
  cerrarSelectoresPorDocumento() {
    this.cerrarTodos();
  }

  restaurar(seccion: string) {
    this.seccionARestaurar = seccion;
    this.confirmacionAbierta = true;
  }

  cancelarRestauracion() {
    this.confirmacionAbierta = false;
    this.seccionARestaurar = '';
  }

  confirmarRestauracion() {
    const seccion = this.seccionARestaurar;
    this.confirmacionAbierta = false;
    this.seccionARestaurar = '';

    switch (seccion) {
      case 'Negocio':
        this.negocio = {
          nombre: 'Vortiz Arquitectos',
          eslogan: 'Diseñamos espacios, construimos confianza.',
          direccion: 'Milpillas 101, La Forestal',
          ciudad: 'Durango',
          estado: 'Dgo.',
          codigoPostal: '34217',
          rfc: 'VOR000000-001',
        };
        break;
      case 'Contacto':
        this.contacto = {
          telefono: '+52 618 000 0000',
          whatsapp: '618 000 0000',
          correoPublico: 'contacto@vortizarquitectos.com',
          correoNotificaciones: 'alertas@vortizarquitectos.com',
        };
        this.redes = [
          { nombre: 'Instagram', icono: 'instagram', url: 'https://www.instagram.com/vortizarquitectos', activa: true, color: 'pink' },
          { nombre: 'Facebook', icono: 'facebook', url: 'https://www.facebook.com/vortizarquitectos', activa: true, color: 'blue' },
          { nombre: 'LinkedIn', icono: 'linkedin', url: 'https://www.linkedin.com/in/vortizarquitectos', activa: true, color: 'sky' },
          { nombre: 'Twitter / X', icono: 'twitter', url: '', activa: false, color: 'gray' },
          { nombre: 'YouTube', icono: 'youtube', url: '', activa: false, color: 'red' },
          { nombre: 'WhatsApp', icono: 'whatsapp', url: 'https://wa.me/526180000000', activa: true, color: 'green' },
        ];
        break;
      case 'Agenda':
        this.diasSemana = [
          { nombre: 'Lunes', abrev: 'Lun', activo: true },
          { nombre: 'Martes', abrev: 'Mar', activo: true },
          { nombre: 'Miércoles', abrev: 'Mié', activo: true },
          { nombre: 'Jueves', abrev: 'Jue', activo: true },
          { nombre: 'Viernes', abrev: 'Vie', activo: true },
          { nombre: 'Sábado', abrev: 'Sáb', activo: false },
          { nombre: 'Domingo', abrev: 'Dom', activo: false },
        ];
        this.agenda = { horaInicio: '09:00', horaFin: '18:00', duracionCita: 60, tiempoEntreCitas: 15, limiteDiario: 8 };
        this.diasFeriados = [
          { id: 1, fecha: '2026-12-25', motivo: 'Navidad' },
          { id: 2, fecha: '2026-01-01', motivo: 'Año nuevo' },
          { id: 3, fecha: '2026-12-12', motivo: 'Día de la Virgen de Guadalupe' },
        ];
        break;
      case 'Apariencia':
        this.apariencia = {
          logoUrl: '/assets/img/logo.png',
          logoFooterUrl: '/assets/img/logo_vortiz.png',
          faviconUrl: '/assets/img/logo.ico',
          colorPrimario: '#0a4d7a',
          colorSecundario: '#0a1f3d',
          colorTextoNav: '#ffffff',
          colorTextoFooter: '#ffffff',
          degradadoInicio: '#000000',
          degradadoFin: '#0a1f3d',
        };
        break;
      case 'Notificaciones':
        this.notificaciones = {
          nuevaCita: true,
          nuevaConsulta: true,
          resumenDiario: false,
          resumenSemanal: true,
          recordatorio24h: true,
          recordatorio1h: false,
          canalRecordatorio: 'email' as 'email' | 'whatsapp' | 'ambos',
        };
        break;
      case 'SEO':
        this.seo = {
          metaTitle: 'Vortiz Arquitectos - Diseño y construcción profesional en Durango',
          metaDescription: 'Firma de arquitectura en Durango especializada en proyectos residenciales, comerciales e industriales. Diseñamos espacios, construimos confianza.',
          keywords: 'arquitectos durango, diseño residencial, proyectos comerciales, construcción',
          ogImageUrl: '/assets/img/og-image.png',
        };
        break;
    }

    this.guardarCambios(seccion);
  }
}
