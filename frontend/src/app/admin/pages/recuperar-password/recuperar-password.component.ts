import { Component, OnInit } from '@angular/core';
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

  constructor(
    private router: Router,
    private authService: AuthService,
    private configuracionService: ConfiguracionService
  ) {}

  ngOnInit() {
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => this.configuracion = data
    });
  }

  enviarRecuperacion() {
    if (!this.correo) { this.errorMensaje = 'Por favor ingresa tu correo electrónico'; return; }
    this.cargando = true; this.errorMensaje = '';
    this.authService.solicitarRecuperacion(this.correo).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/admin/verificar-codigo'], { queryParams: { correo: this.correo } });
      },
      error: () => { this.cargando = false; this.errorMensaje = 'No se pudo enviar el código. Intenta de nuevo.'; }
    });
  }

  volver() {
    this.router.navigate(['/admin/login']);
  }
}
