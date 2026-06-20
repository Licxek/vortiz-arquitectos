import {
  Component,
  ChangeDetectorRef,
  HostListener,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  NotificacionesService,
  Notificacion,
  TipoNotificacion,
} from '../../core/services/notificaciones.service';

type Filtro = 'todas' | 'citas' | 'consultas';
type TipoVisual = 'cita' | 'consulta' | 'confirmacion' | 'cancelacion' | 'mensaje';

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
    this.intervalTiempo = setInterval(() => this.cdr.detectChanges(), 30000);
  }

  ngOnDestroy() {
    if (this.intervalTiempo) clearInterval(this.intervalTiempo);
  }

  toggle(event: Event) {
    event.stopPropagation();
    this.abierto = !this.abierto;
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

  get conteoCitas(): number {
    return this.notifService.notificaciones().filter((n) => n.tipo.startsWith('cita')).length;
  }

  get conteoConsultas(): number {
    return this.notifService.notificaciones().filter((n) => n.tipo.startsWith('consulta')).length;
  }

  cambiarFiltro(f: Filtro, event: Event) {
    event.stopPropagation();
    this.filtro = f;
  }

  // Click en la card → marca como leída + navega
  abrirNotificacion(notif: Notificacion, event: Event) {
    event.stopPropagation();
    this.notifService.marcarLeida(notif.id);
    this.abierto = false;
    if (notif.ruta) this.router.navigateByUrl(notif.ruta);
  }

  // Botón "Marcar leída" sin navegar
  marcarLeida(notif: Notificacion, event: Event) {
    event.stopPropagation();
    if (notif.leida) return;
    this.notifService.marcarLeida(notif.id);
  }

  // Botón acción rápida
  accionRapida(notif: Notificacion, event: Event) {
    event.stopPropagation();
    this.notifService.marcarLeida(notif.id);
    this.abierto = false;
    if (notif.ruta) this.router.navigateByUrl(notif.ruta);
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

  // Mapeo de tipos del servicio → tipo visual (igual que el inicio)
  tipoVisual(tipo: TipoNotificacion): TipoVisual {
    if (tipo === 'cita_pendiente' || tipo === 'cita_nueva') return 'cita';
    if (tipo === 'cita_confirmada') return 'confirmacion';
    if (tipo === 'consulta_general') return 'consulta';
    if (tipo === 'consulta_servicio') return 'mensaje';
    return 'cita';
  }

  // Iniciales del cliente
  iniciales(nombre?: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  // Color avatar por hash del nombre (idéntico al inicio)
  colorAvatar(nombre?: string): string {
    if (!nombre) return 'bg-gray-400';
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-amber-500',
      'bg-emerald-500',
      'bg-indigo-500',
      'bg-rose-500',
      'bg-teal-500',
      'bg-cyan-500',
    ];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  textoAccionRapida(tipo: TipoNotificacion): string {
    const vis = this.tipoVisual(tipo);
    if (vis === 'consulta' || vis === 'mensaje') return 'Responder';
    if (vis === 'cita') return 'Ver en calendario';
    return 'Ver detalles';
  }

  colorAccionRapida(tipo: TipoNotificacion): string {
    const vis = this.tipoVisual(tipo);
    if (vis === 'consulta' || vis === 'mensaje') return 'bg-green-500 hover:bg-green-600';
    if (vis === 'cita') return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-gray-500 hover:bg-gray-600';
  }

  borrar(notif: Notificacion, event: Event) {
    event.stopPropagation();
    this.notifService.borrar(notif.id);
  }
}
