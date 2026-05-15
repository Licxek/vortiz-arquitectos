import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.component.html',
})
export class ConfiguracionComponent implements OnInit {

  // Tab activa
  tabActiva: 'negocio' | 'contacto' | 'agenda' | 'apariencia' | 'notificaciones' | 'seo' = 'negocio';

  // Mensaje de éxito flotante
  mensajeExito = '';
  guardando = false;

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
    this.guardando = true;
    setTimeout(() => {
      this.guardando = false;
      this.mensajeExito = `Cambios de "${seccion}" guardados correctamente`;
      setTimeout(() => this.mensajeExito = '', 3000);
    }, 1000);
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
}
