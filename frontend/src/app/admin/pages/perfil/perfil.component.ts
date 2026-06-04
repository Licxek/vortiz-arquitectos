import { Component, OnInit, inject, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService, PerfilUsuario } from '../../../core/services/perfil.service';
import { TelefonoInputComponent } from '../../../shared/telefono-input/telefono-input.component'; // ⚠️ ajusta la ruta
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload.component';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';

interface SesionActiva {
  dispositivo: string;
  ubicacion: string;
  ultimoAcceso: string;
  esActual: boolean;
}

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
    proyectosTotales: 47,
    clientesAtendidos: 124,
    miembroDesde: '—',
  };

  sesiones: SesionActiva[] = [
    {
      dispositivo: 'Chrome en Windows',
      ubicacion: 'Durango, México',
      ultimoAcceso: 'Activa ahora',
      esActual: true,
    },
    {
      dispositivo: 'Safari en iPhone 17',
      ubicacion: 'Durango, México',
      ultimoAcceso: 'Hace 2 horas',
      esActual: false,
    },
    {
      dispositivo: 'Firefox en macOS',
      ubicacion: 'Durango, México',
      ultimoAcceso: 'Hace 3 días',
      esActual: false,
    },
  ];

  ngOnInit() {
    this.cargarPerfil();
  }

  private cargarPerfil() {
    this.perfilService.obtener().subscribe({
      next: (u) => {
        this.usuario = u;
        this.aplicarUsuarioAForm(u);
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
    this.modoEdicion = false;
    this.mensajeError = '';
    if (this.usuario) this.aplicarUsuarioAForm(this.usuario);
  }

  guardarCambios() {
    this.guardando = true;
    this.mensajeError = '';
    this.perfilService
      .actualizar({
        nombre: this.perfil.nombre,
        apellidos: this.perfil.apellidos,
        correo: this.perfil.correo,
        telefono: this.perfil.telefono?.trim() || null,
      })
      .subscribe({
        next: (u) => {
          this.guardando = false;
          this.modoEdicion = false;
          this.usuario = u;
          this.aplicarUsuarioAForm(u);
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
            this.cdr.detectChanges(); // también al limpiar el mensaje
          }, 3000);
        },
        error: (err) => {
          this.guardando = false;
          this.mensajeError = err?.error?.message || 'No se pudo guardar. Intenta de nuevo.';
          this.cdr.detectChanges();
        },
      });
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
    this.guardandoPassword = true;
    this.mensajeErrorPassword = '';
    this.perfilService.cambiarPassword(this.password.actual, this.password.nueva).subscribe({
      next: () => {
        this.guardandoPassword = false;
        this.password = { actual: '', nueva: '', confirmar: '' };
        this.mensajePassword = 'Contraseña actualizada correctamente';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensajePassword = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.guardandoPassword = false;
        this.mensajeErrorPassword = err?.error?.message || 'No se pudo cambiar la contraseña.';
        this.cdr.detectChanges();
      },
    });
  }

  cerrarSesion(sesion?: SesionActiva) {
    if (sesion && !sesion.esActual) {
      this.sesiones = this.sesiones.filter((s) => s !== sesion);
    } else {
      this.authService.logout();
      this.router.navigate(['/admin/login']);
    }
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
}
