import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const user = authService.getUser();

  // 🎯 Si no hay token O no hay usuario, no dejar pasar
  if (!token || !user) {
    // Limpiar cualquier residuo por si acaso
    authService.logoutLocal();
    router.navigate(['/admin/login']);
    return false;
  }

  return true;
};
