import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, Usuario } from '../../../core/services/auth.service';

interface SesionActiva {
  dispositivo: string;
  ubicacion: string;
  ultimoAcceso: string;
  esActual: boolean;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
})
export class PerfilComponent implements OnInit {
  usuario: Usuario | null = null;
  modoEdicion = false;
  guardando = false;
  mensajeExito = '';

  // Información personal
  perfil = {
    nombre: '',
    apellidos: '',
    correo: '',
    telefono: '',
    empresa: 'Vortiz Arquitectos',
    cargo: 'Arquitecto / Administrador',
    avatar: ''
  };

  // Cambio de contraseña
  password = {
    actual: '',
    nueva: '',
    confirmar: ''
  };
  mostrarActual = false;
  mostrarNueva = false;
  mostrarConfirmar = false;
  guardandoPassword = false;
  mensajePassword = '';

  // Estadísticas
  estadisticas = {
    proyectosTotales: 47,
    clientesAtendidos: 124,
    miembroDesde: 'Marzo 2023'
  };

  // Sesiones activas
  sesiones: SesionActiva[] = [
    { dispositivo: 'Chrome en Windows', ubicacion: 'Durango, México', ultimoAcceso: 'Activa ahora', esActual: true },
    { dispositivo: 'Safari en iPhone 17', ubicacion: 'Durango, México', ultimoAcceso: 'Hace 2 horas', esActual: false },
    { dispositivo: 'Firefox en macOS', ubicacion: 'Durango, México', ultimoAcceso: 'Hace 3 días', esActual: false },
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.usuario = this.authService.getUser();
    this.perfil.nombre = this.usuario?.nombre || '';
    this.perfil.apellidos = this.usuario?.apellidos || '';
    this.perfil.correo = this.usuario?.correo || '';
  }

  activarEdicion() {
    this.modoEdicion = true;
    this.mensajeExito = '';
  }

  cancelarEdicion() {
    this.modoEdicion = false;
    this.perfil.nombre = this.usuario?.nombre || '';
    this.perfil.apellidos = this.usuario?.apellidos || '';
    this.perfil.correo = this.usuario?.correo || '';
  }

  guardarCambios() {
    this.guardando = true;
    setTimeout(() => {
      this.guardando = false;
      this.modoEdicion = false;
      this.mensajeExito = 'Los cambios se guardaron correctamente';
      setTimeout(() => this.mensajeExito = '', 3000);
    }, 1200);
  }

  // Validaciones de contraseña
  get tieneLongitud(): boolean { return this.password.nueva.length >= 8; }
  get tieneMayuscula(): boolean { return /[A-Z]/.test(this.password.nueva); }
  get tieneNumero(): boolean { return /\d/.test(this.password.nueva); }
  get coincide(): boolean { return this.password.nueva.length > 0 && this.password.nueva === this.password.confirmar; }
  get passwordValida(): boolean { return this.tieneLongitud && this.tieneMayuscula && this.tieneNumero && this.coincide && !!this.password.actual; }

  actualizarPassword() {
    if (!this.passwordValida) return;

    this.guardandoPassword = true;
    setTimeout(() => {
      this.guardandoPassword = false;
      this.password = { actual: '', nueva: '', confirmar: '' };
      this.mensajePassword = 'Contraseña actualizada correctamente';
      setTimeout(() => this.mensajePassword = '', 3000);
    }, 1200);
  }

  cerrarSesion(sesion?: SesionActiva) {
    if (sesion && !sesion.esActual) {
      this.sesiones = this.sesiones.filter(s => s !== sesion);
    } else {
      this.authService.logout();
      this.router.navigate(['/admin/login']);
    }
  }

  cambiarFoto() {
    // Aquí iría la lógica para subir imagen al backend
    console.log('Cambiar foto');
  }
}
