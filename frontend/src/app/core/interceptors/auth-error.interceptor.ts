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
        const enLogin = router.url.includes('/admin/login');
        const esLogin = req.url.includes('/auth/login');
        // 🎯 Peticiones silenciosas NO muestran modal
        const esSilenciosa = req.headers.get('X-Silent-Auth') === '1';

        if (!enLogin && !esLogin && !esSilenciosa) {
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
