import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 = token inválido, sesión cerrada o expirada
      if (error.status === 401) {
        // Evitar loop infinito: si ya estamos en login, no hacer nada
        if (!router.url.includes('/login')) {
          authService.logout(); // limpia el token local
          router.navigate(['/login'], {
            queryParams: { expired: 'true' },
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
