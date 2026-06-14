import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionExpiredService } from '../../core/services/session-expired.service';

@Component({
  selector: 'app-session-expired-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './session-expired-modal.component.html',
})
export class SessionExpiredModalComponent {
  private service = inject(SessionExpiredService);

  visible = this.service.visible;
  motivo = this.service.motivo;

  titulo = computed(() =>
    this.motivo() === 'cerrada-remota'
      ? 'Sesión cerrada desde otro dispositivo'
      : 'Tu sesión expiró',
  );

  mensaje = computed(() =>
    this.motivo() === 'cerrada-remota'
      ? 'Por seguridad, esta sesión se cerró desde otro dispositivo. Inicia sesión de nuevo para continuar.'
      : 'Por seguridad, tu sesión expiró tras un período de inactividad. Vuelve a iniciar sesión para continuar.',
  );

  confirmar() {
    this.service.confirmar();
  }
}
