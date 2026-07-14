import { Injectable, signal } from '@angular/core';

/**
 * Servicio para controlar la UI de la campanita de notificaciones
 * desde cualquier parte de la app (ej. buscador admin).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesUiService {
  /** Cuando incrementa, la campanita se abre */
  abrirTrigger = signal(0);

  /** Cuando incrementa, se marcan todas como leídas */
  marcarTodasTrigger = signal(0);

  abrirBell() {
    this.abrirTrigger.update((v) => v + 1);
  }

  marcarTodasLeidas() {
    this.marcarTodasTrigger.update((v) => v + 1);
  }
}
