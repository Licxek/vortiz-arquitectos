import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionExpiredService } from '../services/session-expired.service';

// 🎯 Ventana silenciosa al cargar la app: los primeros 3 segundos NO mostramos modal
const APP_LOADED_AT = Date.now();
const VENTANA_SILENCIOSA_MS = 3000;

// 🎯 Rutas del admin donde el usuario NO está autenticado (flujo de recuperación)
// El modal de sesión expirada NUNCA debe salir en estas rutas
const RUTAS_ADMIN_PUBLICAS = [
  '/admin/login',
  '/admin/recuperar',
  '/admin/verificar-codigo',
  '/admin/nueva-password',
];

// 🎯 Rutas del backend del flujo de autenticación (login, forgot, verificar, reset)
// Un 401 en estas rutas NUNCA debe mostrar modal (son errores de credenciales, no de sesión)
const RUTAS_BACKEND_AUTH_PUBLICAS = [
  '/auth/login',
  '/auth/forgot',
  '/auth/verificar',
  '/auth/reset',
];

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sessionExpired = inject(SessionExpiredService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Ruta actual del navegador (sin query params)
        const rutaActual = router.url.split('?')[0];

        // ¿Estamos en una ruta pública del admin? (login/recuperar/verificar/nueva-password)
        const enRutaPublica = RUTAS_ADMIN_PUBLICAS.some((r) => rutaActual.startsWith(r));

        // ¿La petición al backend es del flujo de auth?
        const esBackendAuth = RUTAS_BACKEND_AUTH_PUBLICAS.some((r) => req.url.includes(r));

        // ¿La petición vino con header silencioso?
        const esSilenciosa = req.headers.get('X-Silent-Auth') === '1';

        // ¿Estamos en ventana silenciosa del arranque?
        const enVentanaSilenciosa = Date.now() - APP_LOADED_AT < VENTANA_SILENCIOSA_MS;

        // Solo mostrar modal si NADA de lo anterior aplica
        if (!enRutaPublica && !esBackendAuth && !esSilenciosa && !enVentanaSilenciosa) {
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
