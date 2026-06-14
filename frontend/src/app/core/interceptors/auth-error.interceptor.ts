import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionExpiredService } from '../services/session-expired.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sessionExpired = inject(SessionExpiredService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // No mostrar el modal si:
        // 1. Ya estamos en login (loop)
        // 2. Es la petición de login (credenciales incorrectas)
        const enLogin = router.url.includes('/admin/login');
        const esLogin = req.url.includes('/auth/login');

        if (!enLogin && !esLogin) {
          sessionExpired.mostrar('cerrada-remota');
        }
      }
      return throwError(() => error);
    }),
  );
};
