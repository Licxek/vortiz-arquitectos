import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [

  // Login y recuperación (sin layout)
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

  // Panel admin (todas las rutas hijas usan el layout)
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./admin/layout/layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      // Estas se irán agregando conforme creemos cada pestaña
      // { path: 'inicio', loadComponent: ... },
      // { path: 'paginas', loadComponent: ... },
    ]
  },

{
    path: 'home',
    loadComponent: () =>
      import('./public/home/home.component').then(m => m.HomeComponent),
  },

  {
  path: 'nosotros',
  loadComponent: () =>
    import('./public/aboutus/nosotros.component').then(m => m.NosotrosComponent),
},

{
  path: 'proyectos',
  loadComponent: () =>
    import('./public/proyectos/proyectos.component').then(m => m.ProyectosComponent),
},

  // Wildcard
  {
    path: '**',
    redirectTo: ''
  }
];
