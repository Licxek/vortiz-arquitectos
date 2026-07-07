import { Component, OnInit, ChangeDetectorRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ConfiguracionService, Configuracion } from '../../../core/services/configuracion.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recuperar-password.component.html',
})
export class RecuperarPasswordComponent implements OnInit {
  configuracion: Configuracion | null = null;
  correo = '';
  cargando = false;
  errorMensaje = '';
  correoEnfocado = false;
  anio = new Date().getFullYear();

  constructor(
    private router: Router,
    private authService: AuthService,
    private configuracionService: ConfiguracionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => {
        this.configuracion = data;
        this.cdr.markForCheck();
      },
    });
  }

  // ============================================================
  // VALIDACIÓN
  // ============================================================

  get correoValido(): boolean {
    if (!this.correo) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo);
  }

  // ============================================================
  // GETTERS COMPUTADOS
  // ============================================================

  get nombreEmpresa(): string {
    return this.configuracion?.nombre || 'Vortiz Arquitectos';
  }

  get eslogan(): string {
    return this.configuracion?.eslogan || 'Diseñamos espacios, construimos confianza.';
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

  // ============================================================
  // ACCIONES
  // ============================================================

  enviarRecuperacion() {
    if (!this.correo) {
      this.errorMensaje = 'Por favor ingresa tu correo electrónico';
      return;
    }
    if (!this.correoValido) {
      this.errorMensaje = 'El correo no tiene un formato válido';
      return;
    }
    this.cargando = true;
    this.errorMensaje = '';
    this.authService.solicitarRecuperacion(this.correo).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/admin/verificar-codigo'], { queryParams: { correo: this.correo } });
      },
      error: () => {
        this.cargando = false;
        this.errorMensaje = 'No se pudo enviar el código. Intenta de nuevo.';
      },
    });
  }

  volver() {
    this.router.navigate(['/admin/login']);
  }
}
