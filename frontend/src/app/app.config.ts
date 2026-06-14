import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withInMemoryScrolling,
  withViewTransitions,
  withPreloading, // 👈 NUEVO
  PreloadAllModules, // 👈 NUEVO
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ContenidoService } from './core/services/contenido.service';
import { provideAppInitializer, inject } from '@angular/core';
import { CatalogoService } from './core/services/catalogo.service';
import { timezoneInterceptor } from './core/interceptors/timezone.interceptor';
import { IMAGE_CONFIG } from '@angular/common';
import { withRouterConfig } from '@angular/router';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-MX';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload',
        paramsInheritanceStrategy: 'always',
      }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        // 👆 SIN anchorScrolling (lo manejamos manualmente en el componente)
      }),
      // withViewTransitions(),  // 👈 COMENTADO temporalmente
      withPreloading(PreloadAllModules),
    ),
    provideHttpClient(withInterceptors([authInterceptor, timezoneInterceptor,errorInterceptor,authErrorInterceptor, ])),
    provideAppInitializer(() => inject(ContenidoService).cargarTodo()),
    provideAppInitializer(() => inject(CatalogoService).precargar()),
    {
      provide: IMAGE_CONFIG,
      useValue: {
        placeholder: true, // blur placeholder mientras carga
        disableImageSizeWarning: false, // dejarlo en false para ver warnings
        disableImageLazyLoadWarning: false,
      },
    },
    { provide: LOCALE_ID, useValue: 'es-MX' },

  ],
};
