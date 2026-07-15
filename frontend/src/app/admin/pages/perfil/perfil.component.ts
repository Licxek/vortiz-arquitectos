import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  signal,
  HostListener,
  ElementRef,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService, PerfilUsuario, Sesion } from '../../../core/services/perfil.service';
import { TelefonoInputComponent } from '../../../shared/telefono-input/telefono-input.component'; // ⚠️ ajusta la ruta
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import { ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TelefonoInputComponent,
    ImageUploadComponent,
    SkeletonComponent,
  ],
  templateUrl: './perfil.component.html',
})
export class PerfilComponent implements OnInit {
  private authService = inject(AuthService);
  private perfilService = inject(PerfilService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  // ====== Estado del PIN ======
  mostrarPin = false;
  digitos: string[] = ['', '', '', '', '', '']; // 👈 array de 6
  pinProposito: 'cambiar_correo' | 'cambiar_password' = 'cambiar_correo';
  enviandoCodigo = false;
  verificandoCodigo = false;
  errorPin = '';
  correoOriginal = '';
  tiempoRestante = 0; // 👈 NUEVO contador para reenvío
  private intervaloReenvio: any; // 👈 NUEVO

  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  usuario: PerfilUsuario | null = null;
  modoEdicion = false;
  guardando = false;
  mensajeExito = '';
  mensajeError = '';
  cargando = signal(true);

  perfil = {
    nombre: '',
    apellidos: '',
    correo: '',
    telefono: '',
    empresa: 'Vortiz Arquitectos',
    cargo: 'Arquitecto / Administrador',
    avatar: '',
  };

  password = {
    actual: '',
    nueva: '',
    confirmar: '',
  };
  mostrarActual = false;
  mostrarNueva = false;
  mostrarConfirmar = false;
  guardandoPassword = false;
  mensajePassword = '';
  mensajeErrorPassword = '';

  estadisticas = {
    proyectosTotales: 0,
    clientesAtendidos: 0,
    miembroDesde: '—',
  };

  cargandoEstadisticas = signal(true); // 👈 NUEVO

  sesiones: Sesion[] = [];
  cargandoSesiones = signal(true);
  private accionEjecutada = new Set<string>();

  confirmModal = {
    abierto: false,
    titulo: '',
    mensaje: '',
    textoConfirmar: 'Confirmar',
    textoCancelar: 'Cancelar',
    variante: 'danger' as 'danger' | 'warning' | 'info',
    alConfirmar: () => {},
  };

  ngOnInit() {
    this.cargarPerfil();
    this.cargarSesiones();
    this.cargarEstadisticas(); // ← NUEVO
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.aplicarParamsDeUrl());

    this.aplicarParamsDeUrl();
  }

  private cargarPerfil() {
    this.perfilService.obtener().subscribe({
      next: (u) => {
        this.usuario = u;
        this.aplicarUsuarioAForm(u);
        this.correoOriginal = u.correo || '';
        this.estadisticas.miembroDesde = this.formatearMiembroDesde(u.createdAt);
        this.cargando.set(false); // 👈 NUEVO
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensajeError = 'No se pudo cargar tu perfil. Recarga la página.';
        this.cargando.set(false); // 👈 NUEVO: aunque falle, sale del skeleton
        this.cdr.detectChanges();
      },
    });
  }

  private aplicarUsuarioAForm(u: PerfilUsuario) {
    this.perfil.nombre = u.nombre || '';
    this.perfil.apellidos = u.apellidos || '';
    this.perfil.correo = u.correo || '';
    this.perfil.telefono = u.telefono || '';
    this.perfil.avatar = u.avatar || '';
    this.perfil.cargo = this.cargoDesdeRol(u.rol);
  }

  private cargoDesdeRol(rol: string): string {
    if (rol === 'admin') return 'Arquitecto / Administrador';
    return rol;
  }

  private formatearMiembroDesde(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return `${meses[d.getMonth()]} ${d.getFullYear()}`;
  }

  activarEdicion() {
    this.modoEdicion = true;
    this.mensajeExito = '';
    this.mensajeError = '';
  }

  cancelarEdicion() {
    if (!this.hayCambios) {
      this.modoEdicion = false;
      this.mensajeError = '';
      if (this.usuario) this.aplicarUsuarioAForm(this.usuario);
      return;
    }

    this.abrirConfirm({
      titulo: 'Descartar cambios',
      mensaje: 'Hay cambios sin guardar. Si continúas se perderán los cambios.',
      textoConfirmar: 'Sí, descartar',
      textoCancelar: 'Seguir editando',
      variante: 'warning',
      alConfirmar: () => {
        this.modoEdicion = false;
        this.mensajeError = '';
        if (this.usuario) this.aplicarUsuarioAForm(this.usuario);
      },
    });
  }

  guardarCambios() {
    // Si cambió el correo, pedir PIN primero
    if (this.perfil.correo !== this.correoOriginal) {
      return this.solicitarPinParaCorreo();
    }
    // Sin cambio sensible → guardar normal
    this.ejecutarGuardarPerfil();
  }
  // Validaciones de contraseña
  get tieneLongitud(): boolean {
    return this.password.nueva.length >= 8;
  }
  get tieneMayuscula(): boolean {
    return /[A-Z]/.test(this.password.nueva);
  }
  get tieneNumero(): boolean {
    return /\d/.test(this.password.nueva);
  }
  get coincide(): boolean {
    return this.password.nueva.length > 0 && this.password.nueva === this.password.confirmar;
  }
  get passwordValida(): boolean {
    return (
      this.tieneLongitud &&
      this.tieneMayuscula &&
      this.tieneNumero &&
      this.coincide &&
      !!this.password.actual
    );
  }

  actualizarPassword() {
    if (!this.passwordValida) return;
    // Siempre pedir PIN para cambiar contraseña
    this.solicitarPinParaPassword();
  }

  /** Cierra la sesión actual (logout propio) */
  cerrarMiSesion() {
    this.abrirConfirm({
      titulo: 'Cerrar sesión',
      mensaje: '¿Cerrar tu sesión? Tendrás que iniciar sesión de nuevo para volver a acceder.',
      textoConfirmar: 'Sí, cerrar sesión',
      textoCancelar: 'Cancelar',
      variante: 'danger',
      alConfirmar: () => {
        this.authService.logout();
        this.router.navigate(['/admin/login']);
      },
    });
  }

  // Estado del modal de foto
  mostrarModalFoto = false;
  avatarTemp = '';
  guardandoFoto = false;

  /** Abre el modal de cambio de foto */
  abrirModalFoto() {
    this.avatarTemp = this.perfil.avatar || '';
    this.mostrarModalFoto = true;
  }

  /** Cierra sin guardar */
  cerrarModalFoto() {
    this.avatarTemp = '';
    this.mostrarModalFoto = false;
  }

  /** Guarda la foto nueva al backend y actualiza el círculo */
  guardarFotoModal() {
    if (this.avatarTemp === (this.perfil.avatar || '')) {
      this.mostrarModalFoto = false;
      return;
    }

    this.guardandoFoto = true;
    this.cdr.markForCheck(); // 👈

    this.perfilService.actualizar({ avatar: this.avatarTemp || null }).subscribe({
      next: (actualizado) => {
        this.perfil.avatar = actualizado.avatar || '';
         // 🔥 NUEVO: propagar la actualización al AuthService para que el header/modal se enteren
        const usuarioActual = this.authService.getUser();
        if (usuarioActual) {
          this.authService.setUser({ ...usuarioActual, avatar: actualizado.avatar || null });
        }
        this.guardandoFoto = false;
        this.mostrarModalFoto = false;
        this.mensajeExito = 'Foto actualizada correctamente';
        this.cdr.markForCheck(); // 👈
        setTimeout(() => {
          this.mensajeExito = '';
          this.cdr.markForCheck(); // 👈
        }, 3000);
      },
      error: (err) => {
        this.guardandoFoto = false;
        this.mensajeError = err?.error?.message || 'No se pudo actualizar la foto';
        this.cdr.markForCheck(); // 👈
        setTimeout(() => {
          this.mensajeError = '';
          this.cdr.markForCheck(); // 👈
        }, 3000);
      },
    });
  }

  private aplicarParamsDeUrl() {
    const params = this.route.snapshot.queryParamMap;
    const fragment = this.route.snapshot.fragment;
    const accion = params.get('accion');

    // ============ ACCIÓN: editar perfil ============
    if (accion === 'editar' && !this.accionEjecutada.has('editar')) {
      this.accionEjecutada.add('editar');
      setTimeout(() => {
        this.activarEdicion();
        this.cdr.detectChanges();
      }, 300);
      // Limpiar el accion de la URL
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { accion: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    // ============ ACCIÓN: cambiar foto ============
    if (accion === 'cambiar-foto' && !this.accionEjecutada.has('cambiar-foto')) {
      this.accionEjecutada.add('cambiar-foto');
      setTimeout(() => {
        this.abrirModalFoto();
        this.cdr.detectChanges();
      }, 300);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { accion: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    // ============ FRAGMENT: scroll a sección ============
    if (fragment && !this.accionEjecutada.has(`fragment-${fragment}`)) {
      this.accionEjecutada.add(`fragment-${fragment}`);
      setTimeout(() => {
        const el = document.getElementById(fragment);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('vortiz-highlight-flash');
          setTimeout(() => el.classList.remove('vortiz-highlight-flash'), 2000);

          // Limpiar el fragment de la URL con history API (más confiable que router.navigate)
          const urlLimpia = window.location.pathname + window.location.search;
          window.history.replaceState({}, '', urlLimpia);
        }
      }, 400);
    }
  }
  get emailValido(): boolean {
    if (!this.perfil.correo) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.perfil.correo);
  }

  get emailInvalido(): boolean {
    return !!this.perfil.correo && !this.emailValido;
  }
  get hayCambios(): boolean {
    if (!this.usuario) return false;
    return (
      this.perfil.nombre !== (this.usuario.nombre || '') ||
      this.perfil.apellidos !== (this.usuario.apellidos || '') ||
      this.perfil.correo !== (this.usuario.correo || '') ||
      this.perfil.telefono !== (this.usuario.telefono || '')
    );
  }
  @HostListener('document:keydown', ['$event'])
  @HostListener('document:keydown', ['$event'])
  manejarAtajos(event: KeyboardEvent) {
    // Esc → cerrar confirm si está abierto (prioridad alta)
    if (event.key === 'Escape' && this.confirmModal.abierto) {
      event.preventDefault();
      this.cerrarConfirm();
      return;
    }

    if (!this.modoEdicion) return;

    const target = event.target as HTMLElement;
    const enInput =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // Ctrl+S / Cmd+S → guardar
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (!this.guardando && this.hayCambios && !this.emailInvalido) {
        this.guardarCambios();
      }
      return;
    }

    // Esc → cancelar (solo si NO estás escribiendo)
    if (event.key === 'Escape' && !enInput) {
      event.preventDefault();
      this.cancelarEdicion();
    }
  }

  private abrirConfirm(opts: {
    titulo: string;
    mensaje: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    variante?: 'danger' | 'warning' | 'info';
    alConfirmar: () => void;
  }) {
    this.confirmModal = {
      abierto: true,
      titulo: opts.titulo,
      mensaje: opts.mensaje,
      textoConfirmar: opts.textoConfirmar ?? 'Confirmar',
      textoCancelar: opts.textoCancelar ?? 'Cancelar',
      variante: opts.variante ?? 'danger',
      alConfirmar: opts.alConfirmar,
    };
  }

  cerrarConfirm() {
    this.confirmModal.abierto = false;
  }

  ejecutarConfirm() {
    const accion = this.confirmModal.alConfirmar;
    this.cerrarConfirm();
    accion();
  }
  // ====== Manejo de los 6 inputs ======

  codigoCompleto(): string {
    return this.digitos.join('');
  }

  private resetearDigitos() {
    this.digitos = ['', '', '', '', '', ''];
    this.errorPin = '';
    setTimeout(() => {
      const primero = this.digitInputs?.first?.nativeElement;
      primero?.focus();
    }, 100);
  }

  private iniciarTimerReenvio() {
    this.tiempoRestante = 60;
    if (this.intervaloReenvio) clearInterval(this.intervaloReenvio);
    this.intervaloReenvio = setInterval(() => {
      this.tiempoRestante--;
      if (this.tiempoRestante <= 0) {
        clearInterval(this.intervaloReenvio);
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  onInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = input.value.replace(/\D/g, '');
    this.digitos[index] = valor.slice(0, 1);
    input.value = this.digitos[index];
    this.errorPin = '';

    // Auto-avanzar al siguiente
    if (this.digitos[index] && index < 5) {
      const siguiente = this.digitInputs.get(index + 1)?.nativeElement;
      siguiente?.focus();
      siguiente?.select();
    }

    // Auto-verificar cuando los 6 estén llenos
    if (this.digitos.every((d) => d.length === 1)) {
      setTimeout(() => this.verificarPin(), 200);
    }
  }

  onKeyDown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !this.digitos[index] && index > 0) {
      const anterior = this.digitInputs.get(index - 1)?.nativeElement;
      anterior?.focus();
      anterior?.select();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.digitInputs.get(index - 1)?.nativeElement.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      this.digitInputs.get(index + 1)?.nativeElement.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.digitos.every((d) => d.length === 1)) {
        this.verificarPin();
      }
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') || '';
    const digitos = text.replace(/\D/g, '').slice(0, 6).split('');

    this.digitos = ['', '', '', '', '', ''];
    digitos.forEach((d, i) => {
      if (i < 6) this.digitos[i] = d;
    });

    const proximoVacio = this.digitos.findIndex((d) => !d);
    const focusIndex = proximoVacio === -1 ? 5 : proximoVacio;
    setTimeout(() => {
      this.digitInputs.get(focusIndex)?.nativeElement.focus();
    }, 0);

    if (this.digitos.every((d) => d.length === 1)) {
      setTimeout(() => this.verificarPin(), 200);
    }
  }

  // ====== Flujo de PIN ======

  private solicitarPinParaCorreo() {
    this.enviandoCodigo = true;
    this.mensajeError = '';

    this.perfilService
      .solicitarCodigo('cambiar_correo', { nuevoCorreo: this.perfil.correo })
      .subscribe({
        next: () => {
          this.enviandoCodigo = false;
          this.pinProposito = 'cambiar_correo';
          this.errorPin = '';
          this.mostrarPin = true;
          this.resetearDigitos();
          this.iniciarTimerReenvio();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.enviandoCodigo = false;
          this.mensajeError = err?.error?.message || 'No se pudo enviar el código.';
          this.cdr.detectChanges();
        },
      });
  }

  private solicitarPinParaPassword() {
    this.enviandoCodigo = true;
    this.mensajeErrorPassword = '';

    this.perfilService.solicitarCodigo('cambiar_password').subscribe({
      next: () => {
        this.enviandoCodigo = false;
        this.pinProposito = 'cambiar_password';
        this.errorPin = '';
        this.mostrarPin = true;
        this.resetearDigitos();
        this.iniciarTimerReenvio();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.enviandoCodigo = false;
        this.mensajeErrorPassword = err?.error?.message || 'No se pudo enviar el código.';
        this.cdr.detectChanges();
      },
    });
  }

  verificarPin() {
    const codigo = this.codigoCompleto();
    if (codigo.length !== 6) return;
    this.errorPin = '';

    if (this.pinProposito === 'cambiar_correo') {
      this.ejecutarGuardarPerfil(codigo);
    } else if (this.pinProposito === 'cambiar_password') {
      this.ejecutarCambioPassword(codigo);
    }
  }

  reenviarCodigo() {
    if (this.tiempoRestante > 0) return;
    if (this.pinProposito === 'cambiar_correo') {
      this.solicitarPinParaCorreo();
    } else {
      this.solicitarPinParaPassword();
    }
  }

  cerrarPin() {
    this.mostrarPin = false;
    this.digitos = ['', '', '', '', '', ''];
    this.errorPin = '';
    if (this.intervaloReenvio) {
      clearInterval(this.intervaloReenvio);
      this.intervaloReenvio = null;
    }
    this.tiempoRestante = 0;
  }

  private ejecutarGuardarPerfil(codigo?: string) {
    this.guardando = true;
    this.mensajeError = '';

    const payload: any = {
      nombre: this.perfil.nombre,
      apellidos: this.perfil.apellidos,
      correo: this.perfil.correo,
      telefono: this.perfil.telefono?.trim() || null,
    };
    if (codigo) payload.codigo = codigo;

    this.perfilService.actualizar(payload).subscribe({
      next: (u) => {
        this.guardando = false;
        this.modoEdicion = false;
        this.usuario = u;
        this.aplicarUsuarioAForm(u);
        this.correoOriginal = u.correo;
        this.cerrarPin();
        this.authService.setUser({
          id: u.id,
          nombre: u.nombre,
          apellidos: u.apellidos,
          correo: u.correo,
          rol: u.rol,
          telefono: u.telefono,
        });
        this.mensajeExito = 'Los cambios se guardaron correctamente';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensajeExito = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.guardando = false;
        const msg = err?.error?.message || 'No se pudo guardar.';
        if (this.mostrarPin) {
          this.errorPin = msg;
          this.resetearDigitos();
        } else {
          this.mensajeError = msg;
        }
        this.cdr.detectChanges();
      },
    });
  }

  private ejecutarCambioPassword(codigo: string) {
    this.guardandoPassword = true;
    this.perfilService
      .cambiarPassword(this.password.actual, this.password.nueva, codigo)
      .subscribe({
        next: () => {
          this.guardandoPassword = false;
          this.password = { actual: '', nueva: '', confirmar: '' };
          this.cerrarPin();
          this.mensajePassword = 'Contraseña actualizada correctamente';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.mensajePassword = '';
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (err) => {
          this.guardandoPassword = false;
          const msg = err?.error?.message || 'No se pudo cambiar la contraseña.';
          if (this.mostrarPin) {
            this.errorPin = msg;
            this.resetearDigitos();
          } else {
            this.mensajeErrorPassword = msg;
          }
          this.cdr.detectChanges();
        },
      });
  }

  cargarSesiones() {
    this.cargandoSesiones.set(true);
    this.perfilService.listarSesiones().subscribe({
      next: (s) => {
        this.sesiones = s;
        this.cargandoSesiones.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoSesiones.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  solicitarCerrarSesion(sesion: Sesion) {
    this.abrirConfirm({
      titulo: 'Cerrar esta sesión',
      mensaje: `¿Cerrar la sesión de ${sesion.navegador} en ${sesion.sistemaOperativo}? Tendrá que volver a iniciar sesión en ese dispositivo.`,
      textoConfirmar: 'Sí, cerrar sesión',
      textoCancelar: 'Cancelar',
      variante: 'danger',
      alConfirmar: () => this.ejecutarCerrarSesion(sesion),
    });
  }

  private ejecutarCerrarSesion(sesion: Sesion) {
    this.perfilService.cerrarSesion(sesion.id).subscribe({
      next: () => {
        this.sesiones = this.sesiones.filter((s) => s.id !== sesion.id);
        this.mensajeExito = 'Sesión cerrada correctamente';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensajeExito = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.mensajeError = err?.error?.message || 'No se pudo cerrar la sesión.';
        this.cdr.detectChanges();
      },
    });
  }

  solicitarCerrarOtrasSesiones() {
    const otras = this.sesiones.filter((s) => !s.esActual);
    if (otras.length === 0) return;

    this.abrirConfirm({
      titulo: 'Cerrar otras sesiones',
      mensaje: `¿Cerrar las ${otras.length} otras sesiones activas? Solo mantendrás abierta la sesión actual.`,
      textoConfirmar: 'Sí, cerrar todas',
      textoCancelar: 'Cancelar',
      variante: 'danger',
      alConfirmar: () => this.ejecutarCerrarOtras(),
    });
  }

  private ejecutarCerrarOtras() {
    this.perfilService.cerrarOtrasSesiones().subscribe({
      next: (resp) => {
        this.sesiones = this.sesiones.filter((s) => s.esActual);
        this.mensajeExito = `${resp.cerradas} sesión${resp.cerradas !== 1 ? 'es' : ''} cerrada${resp.cerradas !== 1 ? 's' : ''}`;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensajeExito = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.mensajeError = err?.error?.message || 'No se pudieron cerrar las sesiones.';
        this.cdr.detectChanges();
      },
    });
  }

  // ====== Helpers ======

  formatearTiempoRelativo(fecha: string): string {
    const ahora = new Date();
    const f = new Date(fecha);
    const diffMs = ahora.getTime() - f.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Activa ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;

    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `Hace ${diffHoras} h`;

    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;

    const diffSemanas = Math.floor(diffDias / 7);
    if (diffSemanas < 4) return `Hace ${diffSemanas} sem`;

    return f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  limpiarIP(ip: string | null): string {
    if (!ip) return 'IP desconocida';
    // Quitar prefijo IPv4-mapped IPv6 (::ffff:)
    const limpia = ip.replace(/^::ffff:/, '');
    if (
      limpia === '::1' ||
      limpia.startsWith('172.') ||
      limpia.startsWith('192.168.') ||
      limpia.startsWith('10.')
    ) {
      return 'Red local';
    }
    return limpia;
  }

  iconoDispositivo(dispositivo: string): 'computer' | 'phone' | 'tablet' {
    if (!dispositivo) return 'computer';
    const d = dispositivo.toLowerCase();
    if (d.includes('iphone') || d.includes('móvil')) return 'phone';
    if (d.includes('ipad') || d.includes('tablet')) return 'tablet';
    return 'computer';
  }

  private cargarEstadisticas() {
    this.cargandoEstadisticas.set(true);
    this.perfilService.obtenerEstadisticas().subscribe({
      next: (stats) => {
        this.estadisticas.proyectosTotales = stats.proyectosTotales;
        this.estadisticas.clientesAtendidos = stats.clientesAtendidos;
        this.cargandoEstadisticas.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        // No es crítico — mantener en 0 si falla
        this.cargandoEstadisticas.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  irAReportes() {
    this.router.navigate(['/admin/inicio'], { fragment: 'vision-general' });
  }
}
