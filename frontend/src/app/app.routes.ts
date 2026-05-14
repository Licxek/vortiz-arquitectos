import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [

  // ============ RUTAS DEL ADMIN (más específicas primero) ============

  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin/recuperar',
    loadComponent: () =>
      import('./admin/pages/recuperar-password/recuperar-password.component').then(m => m.RecuperarPasswordComponent)
  },
  {
    path: 'admin/verificar-codigo',
    loadComponent: () =>
      import('./admin/pages/verificar-codigo/verificar-codigo.component').then(m => m.VerificarCodigoComponent)
  },
  {
    path: 'admin/nueva-password',
    loadComponent: () =>
      import('./admin/pages/nueva-password/nueva-password.component').then(m => m.NuevaPasswordComponent)
  },

  // Dashboard del admin (protegido)
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./admin/pages/login/login.component').then(m => m.LoginComponent)
    // Cuando hagamos el dashboard real, cambiar esta línea
  },

  // ============ RUTAS PÚBLICAS ============

  // Home (cuando hagamos el componente)
  // {
  //   path: '',
  //   loadComponent: () =>
  //     import('./public/pages/home/home.component').then(m => m.HomeComponent)
  // },

  // ============ RUTA WILDCARD AL FINAL ============

  // Si no coincide ninguna, regresa al inicio
  {
    path: '**',
    redirectTo: ''
  }
];
