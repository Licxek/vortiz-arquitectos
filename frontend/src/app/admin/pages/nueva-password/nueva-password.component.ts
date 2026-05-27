import { Component, OnInit } from '@angular/core';
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

  constructor(
    private router: Router,
    private authService: AuthService,
    private route: ActivatedRoute,
    private configuracionService: ConfiguracionService
  ) {}

  ngOnInit() {
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => this.configuracion = data
    });

    this.route.queryParams.subscribe(params => {
      this.correo = params['correo'] || '';
      this.codigo = params['codigo'] || '';
      if (!this.correo || !this.codigo) {
        this.router.navigate(['/admin/recuperar']);
      }
    });
  }

  // Validación visual de seguridad
  get tieneLongitud(): boolean {
    return this.password.length >= 8;
  }

  get tieneMayuscula(): boolean {
    return /[A-Z]/.test(this.password);
  }

  get tieneNumero(): boolean {
    return /\d/.test(this.password);
  }

  get coincide(): boolean {
    return this.password.length > 0 && this.password === this.confirmarPassword;
  }

  get esSegura(): boolean {
    return this.tieneLongitud && this.tieneMayuscula && this.tieneNumero;
  }

  cambiar() {
    this.errorMensaje = '';
    if (!this.esSegura) { this.errorMensaje = 'La contraseña no cumple los requisitos'; return; }
    if (!this.coincide) { this.errorMensaje = 'Las contraseñas no coinciden'; return; }
    this.cargando = true;
    this.authService.restablecer(this.correo, this.codigo, this.password).subscribe({
      next: () => { this.cargando = false; this.exitoso = true; },
      error: (e) => { this.cargando = false; this.errorMensaje = e.error?.message || 'No se pudo cambiar la contraseña.'; }
    });
  }

  irLogin() {
    this.router.navigate(['/admin/login']);
  }
}
