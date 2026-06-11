import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfiguracionService, Configuracion } from '../../../core/services/configuracion.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  configuracion: Configuracion | null = null;
  correo = '';
  password = '';
  mostrarPassword = false;
  cargando = false;
  errorMensaje = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private configuracionService: ConfiguracionService
  ) {}

  ngOnInit() {
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => this.configuracion = data
    });
  }

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

    this.authService.login(this.correo, this.password).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = err.error?.message || 'Credenciales inválidas o servidor no disponible';
      }
    });
  }
}
