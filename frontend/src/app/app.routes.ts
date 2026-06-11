import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { mantenimientoGuard } from './core/guards/mantenimiento.guard';

export const routes: Routes = [
  // Login y recuperación (sin layout)
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin/recuperar',
    loadComponent: () =>
      import('./admin/pages/recuperar-password/recuperar-password.component').then(
        (m) => m.RecuperarPasswordComponent,
      ),
  },
  {
    path: 'admin/verificar-codigo',
    loadComponent: () =>
      import('./admin/pages/verificar-codigo/verificar-codigo.component').then(
        (m) => m.VerificarCodigoComponent,
      ),
  },
  {
    path: 'admin/nueva-password',
    loadComponent: () =>
      import('./admin/pages/nueva-password/nueva-password.component').then(
        (m) => m.NuevaPasswordComponent,
      ),
  },

  // Panel admin (todas las rutas hijas usan el layout)
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./admin/layout/layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./admin/pages/inicio/inicio.component').then((m) => m.InicioComponent),
      },
      {
        path: 'paginas',
        loadComponent: () =>
          import('./admin/pages/paginas/paginas.component').then((m) => m.PaginasComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./admin/pages/perfil/perfil.component').then((m) => m.PerfilComponent),
      },
      {
        path: 'citas',
        loadComponent: () =>
          import('./admin/pages/citas/citas.component').then((m) => m.CitasComponent),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./admin/pages/configuracion/configuracion.component').then(
            (m) => m.ConfiguracionComponent,
          ),
      },
      {
        path: 'reportes/historial',
        loadComponent: () =>
          import('./admin/pages/historial-reportes/historial-reportes.component').then(
            (m) => m.HistorialReportesComponent,
          ),
      },
      {
        path: 'reportes/:tipo',
        loadComponent: () =>
          import('./admin/pages/reportes-detalle/reportes-detalle.component').then(
            (m) => m.ReportesDetalleComponent,
          ),
      },
    ],
  },

  {
    path: 'mantenimiento',
    canActivate: [mantenimientoGuard],
    loadComponent: () =>
      import('./pages/mantenimiento/mantenimiento.component').then((m) => m.MantenimientoComponent),
  },

  // Públicas (todas con el guard de mantenimiento)
  {
    path: 'home',
    canActivate: [mantenimientoGuard],
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'nosotros',
    canActivate: [mantenimientoGuard],
    loadComponent: () =>
      import('./pages/nosotros/nosotros.component').then((m) => m.NosotrosComponent),
  },
  {
    path: 'proyectos',
    canActivate: [mantenimientoGuard],
    loadComponent: () =>
      import('./pages/proyectos/proyectos.component').then((m) => m.ProyectosComponent),
  },
  {
    path: 'servicios',
    canActivate: [mantenimientoGuard],
    loadComponent: () =>
      import('./pages/servicios/servicios.component').then((m) => m.ServiciosComponent),
  },
  {
    path: 'citas',
    canActivate: [mantenimientoGuard],
    loadComponent: () => import('./pages/citas/citas.component').then((m) => m.CitasComponent),
  },
  {
    path: 'p/:slug',
    canActivate: [mantenimientoGuard],
    loadComponent: () =>
      import('./pages/pagina-dinamica/pagina-dinamica.component').then(
        (m) => m.PaginaDinamicaComponent,
      ),
  },

  // Default y wildcard ← AQUÍ ESTABA EL PROBLEMA
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
