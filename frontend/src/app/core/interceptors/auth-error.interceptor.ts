import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionExpiredService } from '../services/session-expired.service';

// 🎯 Ventana silenciosa al cargar la app: los primeros 3 segundos NO mostramos modal
// Esto evita que una petición fallida al iniciar (por race conditions) saque al usuario
const APP_LOADED_AT = Date.now();
const VENTANA_SILENCIOSA_MS = 3000;

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sessionExpired = inject(SessionExpiredService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const enLogin = router.url.includes('/admin/login');
        const esLogin = req.url.includes('/auth/login');
        const esSilenciosa = req.headers.get('X-Silent-Auth') === '1';
        // 🎯 Ventana de gracia al cargar la app
        const enVentanaSilenciosa = Date.now() - APP_LOADED_AT < VENTANA_SILENCIOSA_MS;

        if (!enLogin && !esLogin && !esSilenciosa && !enVentanaSilenciosa) {
          const code = error.error?.code;

          if (code === 'SESION_CERRADA_REMOTA') {
            sessionExpired.mostrar('cerrada-remota');
          } else {
            sessionExpired.mostrar('expirada');
          }
        }
      }
      return throwError(() => error);
    }),
  );
};
