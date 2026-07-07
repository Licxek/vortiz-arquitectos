import { Component, ChangeDetectionStrategy, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionExpiredService } from '../../core/services/session-expired.service';
import { ConfiguracionService, Configuracion } from '../../core/services/configuracion.service';

@Component({
  selector: 'app-session-expired-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './session-expired-modal.component.html',
})
export class SessionExpiredModalComponent implements OnInit {
  private service = inject(SessionExpiredService);
  private configuracionService = inject(ConfiguracionService);

  visible = this.service.visible;
  motivo = this.service.motivo;

  configuracion: Configuracion | null = null;

  ngOnInit() {
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => (this.configuracion = data),
    });
  }

  // ============================================================
  // COMPUTED PROPERTIES
  // ============================================================

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

  etiqueta = computed(() =>
    this.motivo() === 'cerrada-remota'
      ? 'Cierre remoto detectado'
      : 'Sesión inactiva',
  );

  // ============================================================
  // GETTERS DE CONFIGURACIÓN
  // ============================================================

  get nombreEmpresa(): string {
    return this.configuracion?.nombre || 'Vortiz Arquitectos';
  }

  get logoUrl(): string {
    return this.configuracion?.logo_url || '';
  }

  get tieneLogo(): boolean {
    return !!this.logoUrl;
  }

  get colorInicio(): string {
    return this.configuracion?.color_degradado_inicio || '#0a1f3d';
  }

  get colorFin(): string {
    return this.configuracion?.color_degradado_fin || '#0a4d7a';
  }

  get colorPrimario(): string {
    return this.configuracion?.color_primario || '#0a4d7a';
  }

  get gradientPanel(): string {
    return `linear-gradient(135deg, ${this.colorInicio} 0%, ${this.colorFin} 100%)`;
  }

  get gradientBoton(): string {
    return `linear-gradient(135deg, ${this.colorPrimario}, ${this.oscurecerHex(this.colorPrimario, -15)})`;
  }

  private oscurecerHex(hex: string, porcentaje: number): string {
    const s = hex.replace('#', '');
    if (s.length !== 6) return hex;
    const num = parseInt(s, 16);
    const factor = 1 + porcentaje / 100;
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.min(255, Math.floor(r * factor)));
    g = Math.max(0, Math.min(255, Math.floor(g * factor)));
    b = Math.max(0, Math.min(255, Math.floor(b * factor)));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  confirmar() {
    this.service.confirmar();
  }
}
