import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SessionExpiredService {
  private authService = inject(AuthService);
  private router = inject(Router);

  visible = signal(false);
  motivo = signal<'expirada' | 'cerrada-remota'>('expirada');

  mostrar(motivo: 'expirada' | 'cerrada-remota' = 'expirada') {
    if (this.visible()) return; // ya visible, no duplicar
    this.motivo.set(motivo);
    this.visible.set(true);
  }

  confirmar() {
    this.visible.set(false);
    this.authService.logoutLocal(); // limpia sin llamar al backend
    this.router.navigate(['/admin/login'], {
      queryParams: { expired: 'true' },
    });
  }
}
