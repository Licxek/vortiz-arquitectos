import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, Usuario } from '../../core/services/auth.service';
import { ConfiguracionService, Configuracion } from '../../core/services/configuracion.service';
import { HostListener } from '@angular/core';

interface MenuItem {
  label: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class AdminLayoutComponent implements OnInit {
  configuracion: Configuracion | null = null;
  usuario: Usuario | null = null;
  menuMovilAbierto = false;
  menuUsuarioAbierto = false;
  sidebarColapsado = false;

  menuItems: MenuItem[] = [
    { label: 'Inicio', icon: 'home', path: '/admin/inicio' },
    { label: 'Páginas', icon: 'pages', path: '/admin/paginas' },
    { label: 'Perfil', icon: 'user', path: '/admin/perfil' },
    { label: 'Citas', icon: 'calendar', path: '/admin/citas' },
  ];

  // Estado del buscador
  buscadorAdminAbierto = false;

  toggleBuscadorAdmin(event: Event) {
    event.stopPropagation();
    this.buscadorAdminAbierto = !this.buscadorAdminAbierto;
    // Cierra otros menús abiertos para no traslaparlos
    this.menuUsuarioAbierto = false;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private configuracionService: ConfiguracionService
  ) {}

  ngOnInit() {
    this.usuario = this.authService.getUser();
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => this.configuracion = data
    });

    const guardado = localStorage.getItem('sidebar_colapsado');
    if (guardado) this.sidebarColapsado = guardado === 'true';
  }

  cerrarSesion() {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }

  toggleMenuMovil() {
    this.menuMovilAbierto = !this.menuMovilAbierto;
  }

  toggleMenuUsuario() {
    this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
  }

  toggleSidebar() {
    this.sidebarColapsado = !this.sidebarColapsado;
    localStorage.setItem('sidebar_colapsado', String(this.sidebarColapsado));
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.menuUsuarioAbierto = false;
    this.buscadorAdminAbierto = false;
  }
}
