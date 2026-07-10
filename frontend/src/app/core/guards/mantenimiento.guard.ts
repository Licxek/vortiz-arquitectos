import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { ConfiguracionService } from '../services/configuracion.service';
import { AuthService } from '../services/auth.service';

export const mantenimientoGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const configService = inject(ConfiguracionService);
  const authService = inject(AuthService);

  // 🔓 BYPASS PARA PREVISUALIZACIÓN DEL ADMIN
  // Requiere DOS condiciones simultáneas:
  //   1. La URL incluye ?admin-preview=1
  //   2. El usuario tiene un token válido de admin (logueado)
  // Si falta cualquiera, se trata como visitante normal y se aplica el mantenimiento.
  const esAdminPreview = route.queryParamMap.get('admin-preview') === '1';
  const estaLogueado = authService.isLoggedIn();

  if (esAdminPreview && estaLogueado) {
    return true;
  }

  // SIEMPRE fetcha el estado actual del backend al evaluar la ruta
  return configService.getConfiguracion().pipe(
    take(1),
    map((config) => {
      const activo = config?.mantenimiento?.activo ?? false;
      const enMantenimientoUrl = state.url.startsWith('/mantenimiento');

      if (activo && !enMantenimientoUrl) {
        return router.parseUrl('/mantenimiento');
      }
      if (!activo && enMantenimientoUrl) {
        return router.parseUrl('/');
      }
      return true;
    }),
  );
};
