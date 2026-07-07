import { Component, OnInit, OnDestroy, ChangeDetectorRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfiguracionService, Configuracion } from '../../../core/services/configuracion.service';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit, OnDestroy {
  configuracion: Configuracion | null = null;
  correo = '';
  password = '';
  mostrarPassword = false;
  cargando = false;
  errorMensaje = '';
  mensajeSesion = signal<string>('');
  anio = new Date().getFullYear();

  // 🕐 Reloj arquitectónico
  horaActual = signal<string>('');
  private relojInterval: any = null;

  // Estados de focus para animaciones
  correoEnfocado = false;
  passwordEnfocado = false;

  private route = inject(ActivatedRoute);

  constructor(
    private authService: AuthService,
    private router: Router,
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

    // Detectar redirect por sesión expirada/cerrada
    const params = this.route.snapshot.queryParamMap;
    if (params.get('expired') === 'true') {
      this.mensajeSesion.set(
        'Tu sesión fue cerrada desde otro dispositivo o expiró. Por favor inicia sesión de nuevo.',
      );
    }

    // 🕐 Iniciar reloj arquitectónico
    this.actualizarHora();
    this.relojInterval = setInterval(() => {
      this.actualizarHora();
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.relojInterval) clearInterval(this.relojInterval);
  }

  private actualizarHora() {
    const ahora = new Date();
    const h = String(ahora.getHours()).padStart(2, '0');
    const m = String(ahora.getMinutes()).padStart(2, '0');
    const s = String(ahora.getSeconds()).padStart(2, '0');
    this.horaActual.set(`${h}:${m}:${s}`);
  }

  // ============================================================
  // VALIDACIÓN VISUAL EN TIEMPO REAL
  // ============================================================

  get correoValido(): boolean {
    if (!this.correo) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo);
  }

  get passwordValido(): boolean {
    return this.password.length >= 6;
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

  get inicialNombre(): string {
    return this.nombreEmpresa.charAt(0).toUpperCase();
  }

  // ============================================================
  // GETTERS DE COLORES DESDE CONFIGURACIÓN
  // ============================================================

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

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  iniciarSesion() {
    if (!this.correo || !this.password) {
      this.errorMensaje = 'Por favor completa todos los campos';
      return;
    }

    this.cargando = true;
    this.errorMensaje = '';

    this.authService
      .login(this.correo, this.password)
      .pipe(timeout(15000))
      .subscribe({
        next: () => {
          this.cargando = false;
          this.cdr.detectChanges();
          this.router.navigate(['/admin']);
        },
        error: (err) => {
          this.cargando = false;
          if (err.name === 'TimeoutError') {
            this.errorMensaje = 'El servidor tardó demasiado. Intenta de nuevo.';
          } else {
            this.errorMensaje = err.error?.message || 'Credenciales inválidas';
          }
          this.cdr.detectChanges();
        },
      });
  }
}
