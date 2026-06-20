import { Component, ChangeDetectorRef, HostListener, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificacionesService, Notificacion, TipoNotificacion } from '../../core/services/notificaciones.service';

type Filtro = 'todas' | 'citas' | 'consultas';

@Component({
  selector: 'app-notificaciones-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones-bell.component.html',
})
export class NotificacionesBellComponent implements OnInit, OnDestroy {
  notifService = inject(NotificacionesService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  abierto = false;
  filtro: Filtro = 'todas';
  private intervalTiempo: any = null;

  ngOnInit() {
    this.notifService.inicializar();

    // Refrescar los textos "Hace X min" cada 30s
    this.intervalTiempo = setInterval(() => {
      this.cdr.detectChanges();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.intervalTiempo) clearInterval(this.intervalTiempo);
  }

  toggle(event: Event) {
    event.stopPropagation();
    this.abierto = !this.abierto;
  }

  cerrar() {
    this.abierto = false;
  }

  @HostListener('document:click')
  onClickFuera() {
    if (this.abierto) this.abierto = false;
  }

  get notificacionesFiltradas(): Notificacion[] {
    const all = this.notifService.notificaciones();
    if (this.filtro === 'citas') return all.filter((n) => n.tipo.startsWith('cita'));
    if (this.filtro === 'consultas') return all.filter((n) => n.tipo.startsWith('consulta'));
    return all;
  }

  get noLeidasFiltro(): number {
    if (this.filtro === 'citas') return this.notifService.noLeidasCitas();
    if (this.filtro === 'consultas') return this.notifService.noLeidasConsultas();
    return this.notifService.noLeidas();
  }

  cambiarFiltro(f: Filtro, event: Event) {
    event.stopPropagation();
    this.filtro = f;
  }

  abrirNotificacion(notif: Notificacion, event: Event) {
    event.stopPropagation();
    this.notifService.marcarLeida(notif.id);
    this.abierto = false;
    if (notif.ruta) {
      this.router.navigateByUrl(notif.ruta);
    }
  }

  marcarTodas(event: Event) {
    event.stopPropagation();
    this.notifService.marcarTodasLeidas();
  }

  toggleSonido(event: Event) {
    event.stopPropagation();
    this.notifService.toggleSonido();
  }

  refrescar(event: Event) {
    event.stopPropagation();
    this.notifService.refrescarManual();
  }

  iconoPorTipo(tipo: TipoNotificacion): string {
    switch (tipo) {
      case 'cita_nueva':
      case 'cita_pendiente':
        return 'calendar-warning';
      case 'cita_confirmada':
        return 'calendar-check';
      case 'consulta_servicio':
        return 'service';
      case 'consulta_general':
      default:
        return 'message';
    }
  }

  colorPorTipo(tipo: TipoNotificacion): { bg: string; text: string } {
    switch (tipo) {
      case 'cita_pendiente':
        return { bg: 'bg-orange-100', text: 'text-orange-600' };
      case 'cita_confirmada':
        return { bg: 'bg-green-100', text: 'text-green-600' };
      case 'consulta_servicio':
        return { bg: 'bg-blue-100', text: 'text-blue-600' };
      case 'consulta_general':
        return { bg: 'bg-purple-100', text: 'text-purple-600' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600' };
    }
  }
}
