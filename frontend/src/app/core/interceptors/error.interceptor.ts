import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

const MENSAJES_AMIGABLES: Record<number, string> = {
  0: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.',
  400: 'Algunos datos no son válidos. Revisa los campos e intenta de nuevo.',
  401: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No encontramos lo que buscas. Puede haber sido eliminado.',
  408: 'La solicitud tardó demasiado. Intenta de nuevo.',
  409: 'Ya existe un registro con esos datos.',
  413: 'El archivo es demasiado grande. Intenta con uno más pequeño.',
  422: 'No pudimos procesar tu información. Revisa los datos.',
  429: 'Demasiadas solicitudes en poco tiempo. Espera un momento.',
  500: 'Algo salió mal de nuestro lado. Por favor intenta más tarde.',
  502: 'El servidor no responde. Intenta más tarde.',
  503: 'Servicio no disponible temporalmente. Intenta más tarde.',
  504: 'El servidor tardó demasiado en responder.',
};

const MENSAJES_GENERICOS = new Set([
  'Internal Server Error',
  'Bad Request',
  'Not Found',
  'Forbidden',
  'Unauthorized',
  'Service Unavailable',
  'Bad Gateway',
  'Gateway Timeout',
]);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const mensajeBackend = err.error?.message || err.statusText;

      // 🎯 Detección de conexión offline (status 0 + navigator.onLine === false)
      if (err.status === 0 && !navigator.onLine) {
        const errorSinInternet = new HttpErrorResponse({
          error: {
            ...err.error,
            message: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.',
          },
          headers: err.headers,
          status: 0,
          statusText: 'Offline',
          url: err.url || undefined,
        });
        return throwError(() => errorSinInternet);
      }

      const esGenerico =
        !mensajeBackend ||
        MENSAJES_GENERICOS.has(mensajeBackend) ||
        mensajeBackend.toLowerCase().includes('internal server error');

      const mensajeFinal = esGenerico
        ? MENSAJES_AMIGABLES[err.status] || 'Algo salió mal. Intenta de nuevo.'
        : mensajeBackend;

      const errorAmigable = new HttpErrorResponse({
        error: { ...err.error, message: mensajeFinal },
        headers: err.headers,
        status: err.status,
        statusText: err.statusText,
        url: err.url || undefined,
      });

      return throwError(() => errorAmigable);
    }),
  );
};
