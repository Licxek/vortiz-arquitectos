import { Component, OnInit, ChangeDetectorRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ConfiguracionService, Configuracion } from '../../../core/services/configuracion.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-nueva-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './nueva-password.component.html',
})
export class NuevaPasswordComponent implements OnInit {
  configuracion: Configuracion | null = null;
  correo = '';
  codigo = '';
  password = '';
  confirmarPassword = '';
  mostrarPassword = false;
  mostrarConfirmar = false;
  cargando = false;
  errorMensaje = '';
  exitoso = false;
  passwordEnfocado = false;
  confirmarEnfocado = false;
  anio = new Date().getFullYear();

  constructor(
    private router: Router,
    private authService: AuthService,
    private route: ActivatedRoute,
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

    this.route.queryParams.subscribe((params) => {
      this.correo = params['correo'] || '';
      this.codigo = params['codigo'] || '';
      if (!this.correo || !this.codigo) {
        this.router.navigate(['/admin/recuperar']);
      }
    });
  }

  // ============================================================
  // VALIDACIONES INDIVIDUALES
  // ============================================================

  get tieneLongitud(): boolean {
    return this.password.length >= 8;
  }

  get tieneMayuscula(): boolean {
    return /[A-Z]/.test(this.password);
  }

  get tieneNumero(): boolean {
    return /\d/.test(this.password);
  }

  get tieneSimbolo(): boolean {
    return /[!@#$%^&*(),.?":{}|<>_\-+=/[\]\\;']/.test(this.password);
  }

  get coincide(): boolean {
    return this.password.length > 0 && this.password === this.confirmarPassword;
  }

  get esSegura(): boolean {
    return this.tieneLongitud && this.tieneMayuscula && this.tieneNumero;
  }

  // ============================================================
  // MEDIDOR DE FUERZA
  // ============================================================

  get fuerzaPassword(): number {
    let fuerza = 0;
    if (this.tieneLongitud) fuerza += 25;
    if (this.tieneMayuscula) fuerza += 25;
    if (this.tieneNumero) fuerza += 25;
    if (this.tieneSimbolo) fuerza += 25;
    return fuerza;
  }

  get etiquetaFuerza(): string {
    const f = this.fuerzaPassword;
    if (f === 0) return 'Sin contraseña';
    if (f <= 25) return 'Muy débil';
    if (f <= 50) return 'Débil';
    if (f <= 75) return 'Buena';
    return 'Excelente';
  }

  get colorFuerza(): string {
    const f = this.fuerzaPassword;
    if (f <= 25) return '#ef4444'; // rojo
    if (f <= 50) return '#f59e0b'; // ámbar
    if (f <= 75) return '#3b82f6'; // azul
    return '#10b981'; // verde
  }

  // ============================================================
  // GETTERS COMPUTADOS
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

  cambiar() {
    this.errorMensaje = '';
    if (!this.esSegura) {
      this.errorMensaje = 'La contraseña no cumple los requisitos';
      return;
    }
    if (!this.coincide) {
      this.errorMensaje = 'Las contraseñas no coinciden';
      return;
    }
    this.cargando = true;
    this.authService.restablecer(this.correo, this.codigo, this.password).subscribe({
      next: () => {
        this.cargando = false;
        this.exitoso = true;
      },
      error: (e) => {
        this.cargando = false;
        this.errorMensaje = e.error?.message || 'No se pudo cambiar la contraseña.';
      },
    });
  }

  irLogin() {
    this.router.navigate(['/admin/login']);
  }
}
