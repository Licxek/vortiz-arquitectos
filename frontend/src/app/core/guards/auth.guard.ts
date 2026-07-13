import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  // 🎯 Solo verificamos el token
  // El user puede aún estar cargándose async - no importa aquí
  if (!token) {
    router.navigate(['/admin/login']);
    return false;
  }

  return true;
};
