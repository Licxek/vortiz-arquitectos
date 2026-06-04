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

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
      withViewTransitions(),
      withPreloading(PreloadAllModules), // 👈 NUEVO
    ),
    provideHttpClient(withInterceptors([authInterceptor, timezoneInterceptor])),
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
  ],
};
