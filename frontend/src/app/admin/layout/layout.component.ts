import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, Usuario } from '../../core/services/auth.service';
import { ConfiguracionService, Configuracion } from '../../core/services/configuracion.service';
import { HostListener } from '@angular/core';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { BuscadorAdminComponent } from '../../shared/buscador-admin/buscador-admin.component';
import { FormsModule } from '@angular/forms';

interface MenuItem {
  label: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SkeletonComponent, BuscadorAdminComponent, FormsModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class AdminLayoutComponent implements OnInit {
  configuracion: Configuracion | null = null;
  usuario: Usuario | null = null;
  menuMovilAbierto = false;
  menuUsuarioAbierto = false;
  sidebarColapsado = false;
  cargando = signal(true);

  menuItems: MenuItem[] = [
    { label: 'Inicio', icon: 'home', path: '/admin/inicio' },
    { label: 'Páginas', icon: 'pages', path: '/admin/paginas' },
    { label: 'Perfil', icon: 'user', path: '/admin/perfil' },
    { label: 'Citas', icon: 'calendar', path: '/admin/citas' },
    { label: 'Reportes', icon: 'history', path: '/admin/reportes' },
  ];

  confirmModal = {
    abierto: false,
    titulo: '',
    mensaje: '',
    textoConfirmar: 'Confirmar',
    textoCancelar: 'Cancelar',
    variante: 'danger' as 'danger' | 'warning' | 'info',
    alConfirmar: () => {},
  };

  // Estado del buscador
  buscadorAdminAbierto = false;

  toggleBuscadorAdmin(event: Event) {
    event.stopPropagation();
    this.buscadorAdminAbierto = !this.buscadorAdminAbierto;
    this.menuUsuarioAbierto = false;
    if (!this.buscadorAdminAbierto) {
      this.queryBuscador = '';
    }
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private configuracionService: ConfiguracionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.authService.usuario$.subscribe((u) => {
      this.usuario = u;
      this.cdr.detectChanges();
    });
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => {
        this.configuracion = data;
        this.cargando.set(false); // 👈 NUEVO
      },
      error: () => {
        this.cargando.set(false); // 👈 NUEVO: aunque falle, sale del skeleton
      },
    });

    const guardado = localStorage.getItem('sidebar_colapsado');
    if (guardado) this.sidebarColapsado = guardado === 'true';
  }

  cerrarSesion() {
    this.menuUsuarioAbierto = false; // cerrar el menú del usuario primero
    this.abrirConfirm({
      titulo: 'Cerrar sesión',
      mensaje: '¿Cerrar tu sesión? Tendrás que iniciar sesión de nuevo para volver a acceder.',
      textoConfirmar: 'Sí, cerrar sesión',
      textoCancelar: 'Cancelar',
      variante: 'danger',
      alConfirmar: () => {
        this.authService.logout();
        this.router.navigate(['/admin/login']);
      },
    });
  }

  toggleMenuMovil() {
    this.menuMovilAbierto = !this.menuMovilAbierto;
  }

  toggleMenuUsuario(event: Event) {
    event.stopPropagation();
    this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
    this.buscadorAdminAbierto = false; // cierra el buscador si estaba abierto
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

  @HostListener('document:keydown', ['$event'])
  manejarAtajos(event: KeyboardEvent) {
    // Esc cierra el modal de confirmación (prioridad alta)
    if (event.key === 'Escape' && this.confirmModal.abierto) {
      event.preventDefault();
      this.cerrarConfirm();
      return;
    }

    // Ctrl+K abre el buscador (lo que ya tienes)
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.buscadorAdminAbierto = !this.buscadorAdminAbierto;
      this.menuUsuarioAbierto = false;
      if (this.buscadorAdminAbierto) {
        setTimeout(() => {
          const input = document.querySelector('[data-buscador-trigger]') as HTMLInputElement;
          input?.focus();
        }, 50);
      } else {
        this.queryBuscador = '';
      }
    }
  }
  queryBuscador = '';

  onQueryBuscadorChange(valor: string) {
    this.queryBuscador = valor;
    if (!this.buscadorAdminAbierto) {
      this.buscadorAdminAbierto = true;
    }
  }

  abrirBuscador() {
    this.buscadorAdminAbierto = true;
    this.menuUsuarioAbierto = false;
  }

  cerrarBuscador() {
    this.buscadorAdminAbierto = false;
    this.queryBuscador = '';
  }

  private abrirConfirm(opts: {
    titulo: string;
    mensaje: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    variante?: 'danger' | 'warning' | 'info';
    alConfirmar: () => void;
  }) {
    this.confirmModal = {
      abierto: true,
      titulo: opts.titulo,
      mensaje: opts.mensaje,
      textoConfirmar: opts.textoConfirmar ?? 'Confirmar',
      textoCancelar: opts.textoCancelar ?? 'Cancelar',
      variante: opts.variante ?? 'danger',
      alConfirmar: opts.alConfirmar,
    };
  }

  cerrarConfirm() {
    this.confirmModal.abierto = false;
  }

  ejecutarConfirm() {
    const accion = this.confirmModal.alConfirmar;
    this.cerrarConfirm();
    accion();
  }
}
