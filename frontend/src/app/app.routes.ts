import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Pantalla de login del admin
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/pages/login/login.component').then(m => m.LoginComponent)
  },

  // Panel del admin (protegido por guard)
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./admin/pages/login/login.component').then(m => m.LoginComponent)
    // Después cambiamos esto por el dashboard real
  },

  // Ruta default (home)
  {
    path: '',
    pathMatch: 'full',
    redirectTo: ''
  }
];
