import { Component, OnInit, OnDestroy, signal, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, Usuario } from '../../core/services/auth.service';
import { ConfiguracionService, Configuracion } from '../../core/services/configuracion.service';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { BuscadorAdminComponent } from '../../shared/buscador-admin/buscador-admin.component';
import { FormsModule } from '@angular/forms';
import { NotificacionesBellComponent } from '../../shared/notificaciones-bell/notificaciones-bell.component';

interface MenuItem {
  label: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SkeletonComponent,
    BuscadorAdminComponent,
    FormsModule,
    NotificacionesBellComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  configuracion: Configuracion | null = null;
  usuario: Usuario | null = null;
  menuMovilAbierto = false;
  menuUsuarioAbierto = false;
  sidebarColapsado = false;
  cargando = signal(true);

  // ============ ESTADO PARA NUEVO HEADER ============
  fechaActual = signal(this.formatearFecha(new Date()));
  private intervalFecha: any = null;
  statusSitio: 'online' | 'mantenimiento' | 'offline' = 'online';
  scrollHeader = signal(false); // para animar el header al hacer scroll

  menuItems: MenuItem[] = [
    { label: 'Inicio', icon: 'home', path: '/admin/inicio' },
    { label: 'Páginas', icon: 'pages', path: '/admin/paginas' },
    { label: 'Proyectos', icon: 'folder', path: '/admin/proyectos' },
    { label: 'Perfil', icon: 'user', path: '/admin/perfil' },
    { label: 'Citas', icon: 'calendar', path: '/admin/citas' },
    { label: 'Consultas', icon: 'message', path: '/admin/consultas' },
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
    // Suscribirse al BehaviorSubject para reaccionar a cambios en vivo
    this.configuracionService.configPublica$.subscribe((data) => {
      if (data) {
        this.configuracion = data;
        this.cargando.set(false);
        this.cdr.detectChanges();
      }
    });

    // Disparar carga inicial (también actualiza el BehaviorSubject)
    this.configuracionService.cargarPublica();

    const guardado = localStorage.getItem('sidebar_colapsado');
    if (guardado) this.sidebarColapsado = guardado === 'true';
    // Actualizar fecha cada minuto
    this.intervalFecha = setInterval(() => {
      this.fechaActual.set(this.formatearFecha(new Date()));
    }, 60000);

    // Detectar mantenimiento para el status del sitio
    this.configuracionService.configPublica$.subscribe((data) => {
      if (data) {
        this.statusSitio = data.mantenimiento?.activo ? 'mantenimiento' : 'online';
      }
    });
  }

  ngOnDestroy() {
    if (this.intervalFecha) clearInterval(this.intervalFecha);
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
    // Si el buscador está expandido pero vacío, colapsar al hacer clic fuera
    if (this.buscadorExpandido() && !this.queryBuscador) {
      this.colapsarBuscador();
    }
  }

  @HostListener('document:keydown', ['$event'])
  manejarAtajos(event: KeyboardEvent) {
    // Esc cierra el modal de confirmación (prioridad alta)
    if (event.key === 'Escape' && this.confirmModal.abierto) {
      event.preventDefault();
      this.cerrarConfirm();
      return;
    }

    // Esc colapsa el buscador si está expandido
    if (event.key === 'Escape' && this.buscadorExpandido()) {
      event.preventDefault();
      this.colapsarBuscador();
      return;
    }

    // Ctrl+K abre/cierra el buscador expandido
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.buscadorExpandido()) {
        this.colapsarBuscador();
      } else {
        this.expandirBuscador();
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

  private formatearFecha(d: Date): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hora = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} · ${hora}:${min}`;
  }

  get seccionActual(): string {
    const url = this.router.url.split('?')[0];
    const map: Record<string, string> = {
      '/admin/inicio': 'Panel de inicio',
      '/admin/paginas': 'Gestión de páginas',
      '/admin/proyectos': 'Portafolio de proyectos',
      '/admin/perfil': 'Perfil administrativo',
      '/admin/citas': 'Agenda de citas',
      '/admin/consultas': 'Bandeja de consultas',
      '/admin/reportes': 'Reportes y analíticas',
      '/admin/configuracion': 'Configuración del sistema',
    };
    // Match parcial (para rutas con params como /admin/proyectos/123)
    for (const [ruta, label] of Object.entries(map)) {
      if (url.startsWith(ruta)) return label;
    }
    return 'Administrador';
  }

  get iniciales(): string {
    if (!this.usuario) return 'A';
    const nombre = this.usuario.nombre || '';
    const apellidos = this.usuario.apellidos || '';
    return ((nombre[0] || '') + (apellidos[0] || '')).toUpperCase() || 'A';
  }

  get tienesFotoPerfil(): boolean {
    return !!(this.usuario as any)?.avatar;
  }

  get fotoPerfilUrl(): string {
    return (this.usuario as any)?.avatar || '';
  }
  @HostListener('window:scroll', ['$event'])
  onWindowScroll(_event: Event) {
    this.scrollHeader.set(window.scrollY > 20);
  }

  // ============ MODAL DE PERFIL ============
  temaActual: 'claro' | 'oscuro' = 'oscuro'; // Placeholder, se conecta al service en el paso 3
  horaInicioSesion = signal(this.formatearHora(new Date()));

  private formatearHora(d: Date): string {
    const hora = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${hora}:${min}`;
  }

  get tiempoOnline(): string {
    // Placeholder — en el futuro puede calcularse contra el login real
    return 'ahora';
  }

  cambiarTema(nuevo: 'claro' | 'oscuro') {
    this.temaActual = nuevo;
    // En el mensaje 3 conectamos esto al ThemeService
  }

  // ============ BUSCADOR COLAPSABLE ============
  buscadorExpandido = signal(false);

  expandirBuscador() {
    this.buscadorExpandido.set(true);
    this.buscadorAdminAbierto = true;
    this.menuUsuarioAbierto = false;
    setTimeout(() => {
      const input = document.querySelector('[data-buscador-trigger]') as HTMLInputElement;
      input?.focus();
    }, 150); // esperar a que termine la animación de expansión
  }

  colapsarBuscador() {
    this.buscadorExpandido.set(false);
    this.buscadorAdminAbierto = false;
    this.queryBuscador = '';
  }

  toggleBuscadorExpandido(event: Event) {
    event.stopPropagation();
    if (this.buscadorExpandido()) {
      this.colapsarBuscador();
    } else {
      this.expandirBuscador();
    }
  }
}
