import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfiguracionService, Configuracion } from '../../../core/services/configuracion.service';
import { timeout } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { signal, inject } from '@angular/core';

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
  // En la clase
  mensajeSesion = signal<string>('');
  private route = inject(ActivatedRoute);

  constructor(
    private authService: AuthService,
    private router: Router,
    private configuracionService: ConfiguracionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => (this.configuracion = data),
    });
    // Detectar redirect por sesión expirada/cerrada
    const params = this.route.snapshot.queryParamMap;
    if (params.get('expired') === 'true') {
      this.mensajeSesion.set(
        'Tu sesión fue cerrada desde otro dispositivo o expiró. Por favor inicia sesión de nuevo.',
      );
    }
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

    this.authService
      .login(this.correo, this.password)
      .pipe(timeout(15000))
      .subscribe({
        next: () => {
          this.cargando = false;
          this.cdr.detectChanges(); // 👈 NUEVO
          this.router.navigate(['/admin']);
        },
        error: (err) => {
          this.cargando = false;
          if (err.name === 'TimeoutError') {
            this.errorMensaje = 'El servidor tardó demasiado. Intenta de nuevo.';
          } else {
            this.errorMensaje = err.error?.message || 'Credenciales inválidas';
          }
          this.cdr.detectChanges(); // 👈 NUEVO — fuerza el re-render
        },
      });
  }
}
