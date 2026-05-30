import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ContenidoService } from './core/services/contenido.service'; // ajusta la ruta
import { provideAppInitializer, inject } from '@angular/core';
import { CatalogoService } from './core/services/catalogo.service'; // ajusta la ruta
import { timezoneInterceptor } from './core/interceptors/timezone.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      }),
      withViewTransitions()
    ),
    provideHttpClient(withInterceptors([authInterceptor, timezoneInterceptor])),
    provideAppInitializer(() => inject(ContenidoService).cargarTodo()),
    provideAppInitializer(() => inject(CatalogoService).precargar()),
  ]
};
