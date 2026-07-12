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
          // 🎯 Leer el código del backend para diferenciar
          const code = error.error?.code;

          if (code === 'SESION_CERRADA_REMOTA') {
            // Alguien cerró tu sesión desde otro dispositivo (o admin la revocó)
            sessionExpired.mostrar('cerrada-remota');
          } else {
            // TOKEN_EXPIRADO (JWT vencido por tiempo)
            // TOKEN_INVALIDO (JWT alterado)
            // NO_AUTENTICADO (sin token)
            // O cualquier otro 401 sin code
            sessionExpired.mostrar('expirada');
          }
        }
      }
      return throwError(() => error);
    }),
  );
};
