import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { ConfiguracionService } from '../services/configuracion.service';

export const mantenimientoGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const configService = inject(ConfiguracionService);

  // 🔓 BYPASS PARA PREVISUALIZACIÓN DEL ADMIN
  // Cuando el admin previsualiza una página, la URL trae ?admin-preview=1
  // En ese caso, ignoramos el modo mantenimiento para permitir ver la página real.
  const esAdminPreview = route.queryParamMap.get('admin-preview') === '1';
  if (esAdminPreview) {
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
