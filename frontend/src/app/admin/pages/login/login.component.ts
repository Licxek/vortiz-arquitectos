import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  signal,
  inject,
  HostListener,
} from '@angular/core';
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
  anio = new Date().getFullYear();

  // 🕐 Reloj arquitectónico
  horaActual = signal<string>('');
  private relojInterval: any = null;

  // Estados de focus para animaciones
  correoEnfocado = false;
  passwordEnfocado = false;

  // 🔒 Detector de Caps Lock
  capsLockActivo = signal<boolean>(false);

  // 🌗 Modo del card (para efecto tilt 3D)
  tiltX = signal<number>(0);
  tiltY = signal<number>(0);

  private route = inject(ActivatedRoute);

  constructor(
    private authService: AuthService,
    private router: Router,
    private configuracionService: ConfiguracionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    // 🌐 Detectar cambios de conexión
    window.addEventListener('online', this.actualizarConexion);
    window.addEventListener('offline', this.actualizarConexion);
    this.actualizarConexion();

    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => {
        this.configuracion = data;
        this.cdr.markForCheck();
      },
    });

    // 🧹 Limpiar cualquier ?expired=true residual de la URL
    // (el modal ya se encarga de explicar cuando la sesión expira)
    const params = this.route.snapshot.queryParamMap;
    if (params.get('expired')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('expired');
      window.history.replaceState({}, '', url.toString());
    }

    // 🕐 Iniciar reloj
    this.actualizarHora();
    this.relojInterval = setInterval(() => {
      this.actualizarHora();
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.relojInterval) clearInterval(this.relojInterval);
    window.removeEventListener('online', this.actualizarConexion);
    window.removeEventListener('offline', this.actualizarConexion);
  }

  private actualizarHora() {
    const ahora = new Date();
    const h = String(ahora.getHours()).padStart(2, '0');
    const m = String(ahora.getMinutes()).padStart(2, '0');
    const s = String(ahora.getSeconds()).padStart(2, '0');
    this.horaActual.set(`${h}:${m}:${s}`);
  }

  // 🔒 Detectar Caps Lock
  @HostListener('document:keydown', ['$event'])
  @HostListener('document:keyup', ['$event'])
  detectarCapsLock(event: KeyboardEvent) {
    if (event.getModifierState) {
      this.capsLockActivo.set(event.getModifierState('CapsLock'));
    }
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
  // EFECTO TILT 3D
  // ============================================================

  onMouseMove(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 3; // max 3deg
    const rotateX = ((centerY - y) / centerY) * 3;
    this.tiltX.set(rotateX);
    this.tiltY.set(rotateY);
  }

  onMouseLeave() {
    this.tiltX.set(0);
    this.tiltY.set(0);
  }

  get transformCard(): string {
    return `perspective(1200px) rotateX(${this.tiltX()}deg) rotateY(${this.tiltY()}deg)`;
  }

  // ============================================================
  // ACCIONES
  // ============================================================

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  iniciarSesion() {
    // 🌐 Validar conexión antes de intentar
    if (!navigator.onLine) {
      this.errorMensaje = 'Sin conexión a internet. Verifica tu red e intenta de nuevo.';
      return;
    }

    if (!this.correo || !this.password) {
      this.errorMensaje = 'Por favor completa todos los campos';
      return;
    }
    // ... resto del método
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
  // 🌐 Estado de conexión
  sinInternet = signal<boolean>(false);

  private actualizarConexion = () => {
    this.sinInternet.set(!navigator.onLine);
    this.cdr.markForCheck();
  };
}
