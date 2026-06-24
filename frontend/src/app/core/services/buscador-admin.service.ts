import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HistorialReportesService } from './historial-reportes.service';
import { InicioService } from './inicio.service';

export type CategoriaResultado =
  | 'pagina'
  | 'config'
  | 'accion'
  | 'proyecto'
  | 'cita'
  | 'consulta'
  | 'reporte';

export interface ResultadoBusqueda {
  id: string;
  categoria: CategoriaResultado;
  titulo: string;
  subtitulo: string;
  icono: string;
  ruta: string;
  fragment?: string;
  queryParams?: Record<string, string>;
  keywords?: string[];
  meta?: any;
  _reciente?: boolean;
  _recomendado?: boolean; // 👈 NUEVO
}

@Injectable({ providedIn: 'root' })
export class BuscadorAdminService {
  private historialService = inject(HistorialReportesService);
  private inicioService = inject(InicioService);

  private cache: ResultadoBusqueda[] = [];
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 60_000;

  private readonly STORAGE_KEY = 'vortiz_busquedas_recientes';
  private readonly MAX_RECIENTES = 5;

  // ============ PÁGINAS PRINCIPALES ============
  private paginasEstaticas: ResultadoBusqueda[] = [
    {
      id: 'p-inicio',
      categoria: 'pagina',
      titulo: 'Inicio',
      subtitulo: 'Dashboard y estadísticas',
      icono: '🏠',
      ruta: '/admin/inicio',
      keywords: ['dashboard', 'home', 'principal', 'resumen'],
    },
    {
      id: 'p-citas',
      categoria: 'pagina',
      titulo: 'Citas',
      subtitulo: 'Calendario y gestión',
      icono: '📅',
      ruta: '/admin/citas',
      keywords: ['calendario', 'agenda', 'reservas', 'consultas'],
    },
    {
      id: 'p-paginas',
      categoria: 'pagina',
      titulo: 'Páginas',
      subtitulo: 'Editor de contenido del sitio',
      icono: '📄',
      ruta: '/admin/paginas',
      keywords: ['contenido', 'editor', 'sitio web', 'public'],
    },
    {
      id: 'p-perfil',
      categoria: 'pagina',
      titulo: 'Mi perfil',
      subtitulo: 'Tus datos personales',
      icono: '👤',
      ruta: '/admin/perfil',
      keywords: ['cuenta', 'usuario', 'datos personales'],
    },
    {
      id: 'p-config',
      categoria: 'pagina',
      titulo: 'Configuración',
      subtitulo: 'Ajustes generales del sistema',
      icono: '⚙️',
      ruta: '/admin/configuracion',
      keywords: ['settings', 'opciones', 'ajustes', 'preferencias'],
    },
    {
      id: 'p-historial',
      categoria: 'pagina',
      titulo: 'Historial de reportes',
      subtitulo: 'PDFs generados',
      icono: '📚',
      ruta: '/admin/reportes/historial',
      keywords: ['historial', 'archivo', 'pdfs guardados'],
    },
  ];

  private configuraciones: ResultadoBusqueda[] = [
    // ============ NEGOCIO ============
    {
      id: 'c-neg-general',
      categoria: 'config',
      titulo: 'Nombre de la empresa y eslogan',
      subtitulo: 'Información general del negocio',
      icono: '🏢',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'negocio' },
      fragment: 'info-general',
      keywords: ['nombre', 'empresa', 'razon social', 'eslogan', 'slogan', 'tagline'],
    },
    {
      id: 'c-neg-direccion',
      categoria: 'config',
      titulo: 'Dirección de la oficina',
      subtitulo: 'Calle, ciudad, estado, CP',
      icono: '📍',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'negocio' },
      fragment: 'direccion',
      keywords: [
        'direccion',
        'calle',
        'ciudad',
        'estado',
        'codigo postal',
        'cp',
        'ubicacion',
        'oficina',
      ],
    },
    {
      id: 'c-neg-rfc',
      categoria: 'config',
      titulo: 'RFC y datos fiscales',
      subtitulo: 'Información para facturación',
      icono: '📋',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'negocio' },
      fragment: 'datos-fiscales',
      keywords: ['rfc', 'fiscal', 'facturacion', 'sat', 'tributario', 'impuestos'],
    },

    // ============ CONTACTO ============
    {
      id: 'c-con-telefonos',
      categoria: 'config',
      titulo: 'Teléfono y WhatsApp',
      subtitulo: 'Números de contacto públicos',
      icono: '📞',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'contacto' },
      fragment: 'info-contacto',
      keywords: ['telefono', 'whatsapp', 'celular', 'wa', 'numero', 'llamada'],
    },
    {
      id: 'c-con-correos',
      categoria: 'config',
      titulo: 'Correos electrónicos',
      subtitulo: 'Email público y de notificaciones',
      icono: '📧',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'contacto' },
      fragment: 'info-contacto',
      keywords: ['correo', 'email', 'mail', 'notificaciones', 'alertas'],
    },
    {
      id: 'c-con-redes',
      categoria: 'config',
      titulo: 'Redes sociales',
      subtitulo: 'Facebook, Instagram, LinkedIn, TikTok',
      icono: '🌐',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'contacto' },
      fragment: 'redes-sociales',
      keywords: [
        'redes sociales',
        'facebook',
        'instagram',
        'linkedin',
        'twitter',
        'tiktok',
        'youtube',
        'pinterest',
        'telegram',
        'social media',
      ],
    },

    // ============ AGENDA ============
    {
      id: 'c-ag-horarios',
      categoria: 'config',
      titulo: 'Días laborales y horarios',
      subtitulo: 'Cuándo aceptas citas',
      icono: '⏰',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'agenda' },
      fragment: 'dias-horarios',
      keywords: [
        'horario',
        'horas',
        'dias laborales',
        'lunes',
        'martes',
        'disponibilidad',
        'abierto',
        'apertura',
        'cierre',
      ],
    },
    {
      id: 'c-ag-duracion',
      categoria: 'config',
      titulo: 'Duración y límites de citas',
      subtitulo: 'Tiempo por cita, intervalos, máximo diario',
      icono: '⏱️',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'agenda' },
      fragment: 'config-citas',
      keywords: ['duracion', 'tiempo entre', 'limite diario', 'intervalo', 'minutos', 'cita 30 60'],
    },
    {
      id: 'c-ag-feriados',
      categoria: 'config',
      titulo: 'Días feriados y vacaciones',
      subtitulo: 'Cuando no se pueden agendar citas',
      icono: '🎄',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'agenda' },
      fragment: 'dias-feriados',
      keywords: ['feriado', 'vacaciones', 'cerrado', 'navidad', 'descanso', 'no laboral'],
    },

    // ============ APARIENCIA ============
    {
      id: 'c-ap-logos',
      categoria: 'config',
      titulo: 'Logos y favicon',
      subtitulo: 'Logo del sitio, footer y favicon',
      icono: '🎨',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'apariencia' },
      fragment: 'logos',
      keywords: ['logo', 'favicon', 'marca', 'imagen', 'identidad', 'branding', 'icono pestaña'],
    },
    {
      id: 'c-ap-colores',
      categoria: 'config',
      titulo: 'Colores y degradado',
      subtitulo: 'Color primario, secundario, gradiente del header',
      icono: '🌈',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'apariencia' },
      fragment: 'colores',
      keywords: [
        'colores',
        'color primario',
        'secundario',
        'degradado',
        'gradiente',
        'paleta',
        'tema',
        'nav',
        'footer',
      ],
    },
    {
      id: 'c-ap-preview',
      categoria: 'config',
      titulo: 'Vista previa de apariencia',
      subtitulo: 'Cómo se verán los elementos',
      icono: '👁️',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'apariencia' },
      fragment: 'vista-previa',
      keywords: ['vista previa', 'preview', 'ejemplo'],
    },

    // ============ NOTIFICACIONES ============
    {
      id: 'c-not-para-ti',
      categoria: 'config',
      titulo: 'Mis notificaciones',
      subtitulo: 'Alertas de citas, consultas, resúmenes',
      icono: '🔔',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'notificaciones' },
      fragment: 'notif-para-ti',
      keywords: [
        'notificaciones',
        'alertas',
        'avisos',
        'resumen diario',
        'resumen semanal',
        'email',
      ],
    },
    {
      id: 'c-not-clientes',
      categoria: 'config',
      titulo: 'Recordatorios para clientes',
      subtitulo: 'Avisos automáticos antes de las citas',
      icono: '⏰',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'notificaciones' },
      fragment: 'notif-clientes',
      keywords: ['recordatorio', 'aviso cliente', '24 horas', '1 hora', 'recordatorios'],
    },
    {
      id: 'c-not-canal',
      categoria: 'config',
      titulo: 'Canal de recordatorios',
      subtitulo: 'Email, WhatsApp o ambos',
      icono: '📨',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'notificaciones' },
      fragment: 'notif-clientes',
      keywords: ['canal', 'email', 'whatsapp', 'envio', 'metodo'],
    },

    // ============ SEO ============
    {
      id: 'c-seo-meta',
      categoria: 'config',
      titulo: 'Meta título y descripción',
      subtitulo: 'Cómo aparece en Google',
      icono: '🔍',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'seo' },
      fragment: 'seo-meta',
      keywords: [
        'seo',
        'meta',
        'titulo',
        'descripcion',
        'google',
        'posicionamiento',
        'buscadores',
        'keywords',
        'palabras clave',
      ],
    },
    {
      id: 'c-seo-preview',
      categoria: 'config',
      titulo: 'Vista previa en Google',
      subtitulo: 'Simulación del resultado',
      icono: '🔎',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'seo' },
      fragment: 'seo-preview',
      keywords: ['vista previa', 'google preview', 'simulacion'],
    },
    {
      id: 'c-seo-og',
      categoria: 'config',
      titulo: 'Imagen para redes sociales',
      subtitulo: 'Open Graph - aparece al compartir',
      icono: '🖼️',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'seo' },
      fragment: 'og-image',
      keywords: [
        'og',
        'open graph',
        'imagen compartir',
        'facebook share',
        'twitter card',
        'preview',
      ],
    },

    // ============ MANTENIMIENTO ============
    {
      id: 'c-mant-activar',
      categoria: 'config',
      titulo: 'Modo mantenimiento',
      subtitulo: 'Cerrar el sitio temporalmente',
      icono: '🚧',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'mantenimiento' },
      fragment: 'modo-mantenimiento',
      keywords: [
        'mantenimiento',
        'cerrar sitio',
        'offline',
        'fuera de servicio',
        'pausar',
        'desactivar sitio',
      ],
    },
    {
      id: 'c-mant-mensaje',
      categoria: 'config',
      titulo: 'Mensaje y fecha de regreso',
      subtitulo: 'Qué verán los visitantes',
      icono: '✉️',
      ruta: '/admin/configuracion',
      queryParams: { tab: 'mantenimiento' },
      fragment: 'modo-mantenimiento',
      keywords: ['mensaje mantenimiento', 'fecha regreso', 'aviso visitantes'],
    },
  ];

  private accionesCitas: ResultadoBusqueda[] = [
    // ====== Acciones rápidas ======
    {
      id: 'cit-nueva',
      categoria: 'accion',
      titulo: 'Nueva cita',
      subtitulo: 'Agendar una cita manualmente',
      icono: '➕',
      ruta: '/admin/citas',
      queryParams: { accion: 'nueva' },
      keywords: ['nueva cita', 'agendar', 'crear cita', 'reservar', 'añadir cita', 'agregar cita'],
    },
    {
      id: 'cit-historial',
      categoria: 'accion',
      titulo: 'Historial de citas pasadas',
      subtitulo: 'Ver citas anteriores',
      icono: '🕐',
      ruta: '/admin/citas',
      queryParams: { accion: 'historial' },
      fragment: 'historial',
      keywords: ['historial citas', 'citas pasadas', 'antiguas', 'previas', 'anteriores'],
    },

    // ====== Vistas ======
    {
      id: 'cit-vista-lista',
      categoria: 'accion',
      titulo: 'Vista de lista de citas',
      subtitulo: 'Citas agrupadas en lista',
      icono: '📋',
      ruta: '/admin/citas',
      queryParams: { vista: 'lista' },
      keywords: ['lista citas', 'listado citas', 'ver lista'],
    },
    {
      id: 'cit-vista-cal',
      categoria: 'accion',
      titulo: 'Calendario de citas',
      subtitulo: 'Vista de calendario',
      icono: '📅',
      ruta: '/admin/citas',
      queryParams: { vista: 'calendario' },
      keywords: ['calendario citas', 'agenda', 'calendar', 'ver calendario'],
    },
    {
      id: 'cit-cal-mes',
      categoria: 'accion',
      titulo: 'Calendario - Vista mensual',
      subtitulo: 'Ver el mes completo',
      icono: '🗓️',
      ruta: '/admin/citas',
      queryParams: { vista: 'calendario', modo: 'mes' },
      keywords: ['vista mensual', 'mes completo', 'calendario mes'],
    },
    {
      id: 'cit-cal-semana',
      categoria: 'accion',
      titulo: 'Calendario - Vista semanal',
      subtitulo: 'Ver la semana',
      icono: '📆',
      ruta: '/admin/citas',
      queryParams: { vista: 'calendario', modo: 'semana' },
      keywords: ['vista semanal', 'semana', 'calendario semana'],
    },
    {
      id: 'cit-cal-dia',
      categoria: 'accion',
      titulo: 'Calendario - Vista diaria',
      subtitulo: 'Ver el día actual',
      icono: '☀️',
      ruta: '/admin/citas',
      queryParams: { vista: 'calendario', modo: 'dia' },
      keywords: ['vista diaria', 'dia', 'jornada', 'hoy agenda', 'calendario dia'],
    },

    // ====== Filtros por estado ======
    {
      id: 'cit-filt-pend',
      categoria: 'accion',
      titulo: 'Citas pendientes',
      subtitulo: 'Filtrar por estado pendiente',
      icono: '⏳',
      ruta: '/admin/citas',
      queryParams: { estado: 'pendiente', vista: 'lista' },
      keywords: ['pendientes', 'sin confirmar', 'esperando aprobacion', 'por aprobar'],
    },
    {
      id: 'cit-filt-conf',
      categoria: 'accion',
      titulo: 'Citas confirmadas',
      subtitulo: 'Filtrar por estado confirmado',
      icono: '✅',
      ruta: '/admin/citas',
      queryParams: { estado: 'confirmada', vista: 'lista' },
      keywords: ['confirmadas', 'aprobadas', 'aceptadas', 'agendadas'],
    },
    {
      id: 'cit-filt-canc',
      categoria: 'accion',
      titulo: 'Citas canceladas',
      subtitulo: 'Filtrar por estado cancelado',
      icono: '❌',
      ruta: '/admin/citas',
      queryParams: { estado: 'cancelada', vista: 'lista' },
      keywords: ['canceladas', 'rechazadas', 'anuladas'],
    },
    {
      id: 'cit-filt-todas',
      categoria: 'accion',
      titulo: 'Ver todas las citas',
      subtitulo: 'Quitar filtros de estado',
      icono: '📊',
      ruta: '/admin/citas',
      queryParams: { estado: 'todas', vista: 'lista' },
      keywords: ['todas las citas', 'sin filtro', 'limpiar filtro', 'mostrar todas'],
    },
  ];
  private accionesPerfil: ResultadoBusqueda[] = [
    {
      id: 'per-mi-perfil',
      categoria: 'accion',
      titulo: 'Mi perfil',
      subtitulo: 'Información de tu cuenta',
      icono: '👤',
      ruta: '/admin/perfil',
      keywords: ['perfil', 'mi cuenta', 'mis datos', 'cuenta'],
    },
    {
      id: 'per-editar',
      categoria: 'accion',
      titulo: 'Editar mi perfil',
      subtitulo: 'Modificar datos personales',
      icono: '✏️',
      ruta: '/admin/perfil',
      queryParams: { accion: 'editar' },
      fragment: 'info-personal',
      keywords: ['editar perfil', 'modificar perfil', 'cambiar datos', 'actualizar perfil'],
    },
    {
      id: 'per-foto',
      categoria: 'accion',
      titulo: 'Cambiar foto de perfil',
      subtitulo: 'Subir nuevo avatar',
      icono: '📷',
      ruta: '/admin/perfil',
      queryParams: { accion: 'cambiar-foto' },
      keywords: ['foto perfil', 'avatar', 'imagen perfil', 'picture', 'cambiar foto'],
    },
    {
      id: 'per-info',
      categoria: 'accion',
      titulo: 'Información personal',
      subtitulo: 'Nombre, correo, teléfono, empresa',
      icono: '📝',
      ruta: '/admin/perfil',
      fragment: 'info-personal',
      keywords: ['nombre', 'apellidos', 'correo personal', 'mi telefono', 'empresa', 'mis datos'],
    },
    {
      id: 'per-pass',
      categoria: 'accion',
      titulo: 'Cambiar contraseña',
      subtitulo: 'Actualizar tu contraseña de acceso',
      icono: '🔒',
      ruta: '/admin/perfil',
      fragment: 'seguridad',
      keywords: ['contraseña', 'password', 'cambiar password', 'seguridad cuenta', 'clave', 'pass'],
    },
    {
      id: 'per-sesiones',
      categoria: 'accion',
      titulo: 'Sesiones activas',
      subtitulo: 'Dispositivos donde estás conectado',
      icono: '💻',
      ruta: '/admin/perfil',
      fragment: 'sesiones',
      keywords: [
        'sesiones',
        'dispositivos conectados',
        'devices',
        'sesion activa',
        'mis dispositivos',
      ],
    },
    {
      id: 'per-logout',
      categoria: 'accion',
      titulo: 'Cerrar sesión',
      subtitulo: 'Salir de tu cuenta',
      icono: '🚪',
      ruta: '/admin/perfil',
      fragment: 'cerrar-sesion',
      keywords: ['cerrar sesion', 'logout', 'salir', 'sign out', 'desconectar', 'cerrar admin'],
    },
  ];

  private accionesPaginas: ResultadoBusqueda[] = [
    // ====== Página principal ======
    {
      id: 'pag-listado',
      categoria: 'pagina',
      titulo: 'Páginas del sitio',
      subtitulo: 'Administrar las páginas del sitio web',
      icono: '📄',
      ruta: '/admin/paginas',
      keywords: ['paginas', 'sitio web', 'contenido sitio', 'pages', 'cms'],
    },

    // ====== Acción rápida ======
    {
      id: 'pag-nueva',
      categoria: 'accion',
      titulo: 'Nueva página',
      subtitulo: 'Crear una página personalizada',
      icono: '➕',
      ruta: '/admin/paginas',
      queryParams: { accion: 'nueva' },
      keywords: ['nueva pagina', 'crear pagina', 'agregar pagina', 'nueva página', 'pagina nueva'],
    },

    // ====== Filtros ======
    {
      id: 'pag-fijas',
      categoria: 'accion',
      titulo: 'Páginas fijas del sitio',
      subtitulo: 'Inicio, Nosotros, Servicios y otras',
      icono: '📌',
      ruta: '/admin/paginas',
      queryParams: { filtro: 'fijas' },
      keywords: ['paginas fijas', 'paginas principales', 'inicio nosotros', 'home about'],
    },
    {
      id: 'pag-personalizadas',
      categoria: 'accion',
      titulo: 'Páginas personalizadas',
      subtitulo: 'Páginas creadas manualmente',
      icono: '✨',
      ruta: '/admin/paginas',
      queryParams: { filtro: 'personalizadas' },
      keywords: ['personalizadas', 'custom', 'creadas manualmente', 'mis paginas'],
    },
    {
      id: 'pag-borradores',
      categoria: 'accion',
      titulo: 'Borradores de páginas',
      subtitulo: 'Páginas sin publicar',
      icono: '📝',
      ruta: '/admin/paginas',
      queryParams: { filtro: 'borradores' },
      keywords: ['borradores', 'drafts', 'sin publicar', 'no publicadas', 'pendientes publicar'],
    },
    {
      id: 'pag-ocultas',
      categoria: 'accion',
      titulo: 'Páginas ocultas',
      subtitulo: 'Páginas no visibles al público',
      icono: '🙈',
      ruta: '/admin/paginas',
      queryParams: { filtro: 'ocultas' },
      keywords: ['paginas ocultas', 'no visibles', 'invisibles', 'hidden pages'],
    },
  ];

  private accionesReportes: ResultadoBusqueda[] = [
    // ====== Historial ======
    {
      id: 'rep-historial',
      categoria: 'pagina',
      titulo: 'Historial de reportes',
      subtitulo: 'Re-descargar y reenviar PDFs generados',
      icono: '📚',
      ruta: '/admin/reportes/historial',
      keywords: [
        'historial reportes',
        'pdf generados',
        'reenviar pdf',
        'descargar reportes',
        'reportes pasados',
        'historial pdf',
      ],
    },

    // ====== 4 reportes específicos ======
    {
      id: 'rep-citas',
      categoria: 'reporte',
      titulo: 'Reporte: Citas por mes',
      subtitulo: 'Evolución mensual del volumen de citas',
      icono: '📊',
      ruta: '/admin/reportes/citas-por-mes',
      keywords: [
        'reporte citas',
        'citas mensuales',
        'evolucion mensual',
        'volumen citas',
        'citas por mes',
      ],
    },
    {
      id: 'rep-categorias',
      categoria: 'reporte',
      titulo: 'Reporte: Categorías de servicios',
      subtitulo: 'Distribución por tipo de servicio',
      icono: '🎯',
      ruta: '/admin/reportes/categorias-servicios',
      keywords: [
        'reporte categorias',
        'distribucion servicios',
        'categorias mas usadas',
        'tipos servicios',
      ],
    },
    {
      id: 'rep-actividad',
      categoria: 'reporte',
      titulo: 'Reporte: Actividad semanal',
      subtitulo: 'Volumen diario y semanal',
      icono: '📈',
      ruta: '/admin/reportes/actividad-semanal',
      keywords: [
        'reporte actividad',
        'actividad semanal',
        'volumen diario',
        'tendencias diarias',
        'reporte semana',
      ],
    },
    {
      id: 'rep-clientes',
      categoria: 'reporte',
      titulo: 'Reporte: Clientes nuevos',
      subtitulo: 'Adquisición de clientes nuevos',
      icono: '🆕',
      ruta: '/admin/reportes/clientes-nuevos',
      keywords: [
        'reporte clientes',
        'clientes nuevos',
        'adquisicion clientes',
        'crecimiento clientes',
        'nuevos usuarios',
      ],
    },

    // ====== Acción rápida: generar PDF ======
    {
      id: 'rep-generar',
      categoria: 'accion',
      titulo: 'Generar reporte PDF',
      subtitulo: 'Crear y descargar reportes',
      icono: '📄',
      ruta: '/admin/reportes/citas-por-mes',
      queryParams: { accion: 'generar' },
      keywords: [
        'generar pdf',
        'crear reporte',
        'descargar pdf',
        'exportar datos',
        'nuevo reporte pdf',
      ],
    },
    // ====== Historial filtrado por tipo ======
    {
      id: 'rep-hist-citas',
      categoria: 'accion',
      titulo: 'Historial: Reportes de citas',
      subtitulo: 'PDFs de reportes mensuales de citas',
      icono: '📚',
      ruta: '/admin/reportes/historial',
      queryParams: { tipo: 'citas-por-mes' },
      keywords: [
        'historial citas pdf',
        'reportes citas pasados',
        'pdfs citas',
        'reportes citas generados',
      ],
    },
    {
      id: 'rep-hist-categorias',
      categoria: 'accion',
      titulo: 'Historial: Reportes de categorías',
      subtitulo: 'PDFs de distribución de servicios',
      icono: '📚',
      ruta: '/admin/reportes/historial',
      queryParams: { tipo: 'categorias-servicios' },
      keywords: ['historial categorias pdf', 'reportes categorias pasados', 'pdfs categorias'],
    },
    {
      id: 'rep-hist-actividad',
      categoria: 'accion',
      titulo: 'Historial: Reportes de actividad',
      subtitulo: 'PDFs de actividad semanal',
      icono: '📚',
      ruta: '/admin/reportes/historial',
      queryParams: { tipo: 'actividad-semanal' },
      keywords: ['historial actividad pdf', 'reportes semanales pasados', 'pdfs actividad'],
    },
    {
      id: 'rep-hist-clientes',
      categoria: 'accion',
      titulo: 'Historial: Reportes de clientes',
      subtitulo: 'PDFs de adquisición de clientes',
      icono: '📚',
      ruta: '/admin/reportes/historial',
      queryParams: { tipo: 'clientes-nuevos' },
      keywords: ['historial clientes pdf', 'reportes clientes pasados', 'pdfs clientes'],
    },
  ];

  private accionesRapidas: ResultadoBusqueda[] = [
    {
      id: 'a-nuevo-proyecto',
      categoria: 'accion',
      titulo: 'Crear nuevo proyecto',
      subtitulo: 'Iniciar proyecto desde cero',
      icono: '🏗️',
      ruta: '/admin/inicio',
      queryParams: { accion: 'nuevo-proyecto' }, // 👈 NUEVO
      keywords: ['nuevo proyecto', 'crear proyecto', 'iniciar proyecto'],
    },
    {
      id: 'a-edit-inicio',
      categoria: 'accion',
      titulo: 'Editar página de Inicio',
      subtitulo: 'Hero, servicios, estadísticas',
      icono: '✏️',
      ruta: '/admin/paginas',
      queryParams: { accion: 'editar', pagina: 'inicio' },
      keywords: ['editar inicio', 'hero', 'landing', 'home publico', 'pagina principal'],
    },
    {
      id: 'a-edit-nosotros',
      categoria: 'accion',
      titulo: 'Editar Quiénes Somos',
      subtitulo: 'Sobre la empresa, valores, equipo',
      icono: '✏️',
      ruta: '/admin/paginas',
      queryParams: { accion: 'editar', pagina: 'nosotros' },
      keywords: ['quienes somos', 'nosotros', 'historia', 'equipo', 'about', 'sobre nosotros'],
    },
    {
      id: 'a-edit-servicios',
      categoria: 'accion',
      titulo: 'Editar página de Servicios',
      subtitulo: 'Catálogo público de servicios',
      icono: '✏️',
      ruta: '/admin/paginas',
      queryParams: { accion: 'editar', pagina: 'servicios' },
      keywords: ['editar servicios', 'catalogo publico', 'servicios sitio'],
    },
    {
      id: 'a-edit-proyectos',
      categoria: 'accion',
      titulo: 'Editar página de Proyectos',
      subtitulo: 'Portafolio público',
      icono: '✏️',
      ruta: '/admin/paginas',
      queryParams: { accion: 'editar', pagina: 'proyectos' },
      keywords: ['editar proyectos', 'portafolio', 'galeria sitio'],
    },
    {
      id: 'a-edit-citas',
      categoria: 'accion',
      titulo: 'Editar página de Citas/Contacto',
      subtitulo: 'Formulario público de agendamiento',
      icono: '✏️',
      ruta: '/admin/paginas',
      queryParams: { accion: 'editar', pagina: 'citas' },
      keywords: [
        'editar contacto',
        'editar citas',
        'formulario sitio',
        'pagina contacto',
        'agendar publico',
      ],
    },
  ];

  /**
   * Pre-carga TODO en cache.
   */
  async precargarTodo(): Promise<void> {
    if (this.cache.length > 0 && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return;
    }

    const [proyectos, citas, consultas, reportes] = await Promise.all([
      firstValueFrom(this.inicioService.obtenerProyectosAdmin()).catch(() => []),
      firstValueFrom(this.inicioService.obtenerAgenda()).catch(() => []),
      firstValueFrom(this.inicioService.obtenerConsultas()).catch(() => []),
      firstValueFrom(this.historialService.listar({ limit: 50 })).catch(() => []),
    ]);

    this.cache = [
      ...this.paginasEstaticas,
      ...this.configuraciones,
      ...this.accionesRapidas,
      ...this.accionesCitas,
      ...this.accionesPerfil,
      ...this.accionesPaginas,
      ...this.accionesReportes,
      ...this.mapearProyectos(proyectos),
      ...this.mapearCitas(citas),
      ...this.mapearConsultas(consultas),
      ...this.mapearReportes(reportes),
    ];

    this.cacheTimestamp = Date.now();
  }

  /**
   * Búsqueda con scoring (fuzzy + relevancia).
   */
  buscar(query: string): ResultadoBusqueda[] {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    return this.cache
      .map((item) => ({ item, score: this.calcularScore(item, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(({ item }) => item);
  }

  /**
   * Recomendaciones cuando no hay query.
   * Mezcla páginas principales + acciones populares.
   */
  obtenerRecomendados(): ResultadoBusqueda[] {
    return [
      ...this.paginasEstaticas.slice(0, 4),
      ...this.accionesRapidas.slice(0, 3),
      ...this.configuraciones.slice(0, 2),
    ].map((r) => ({ ...r, _recomendado: true })); // 👈 marcar
  }

  /**
   * Búsquedas recientes desde localStorage.
   */
  obtenerRecientes(): ResultadoBusqueda[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Guarda un item como reciente (top de la lista).
   */
  guardarReciente(item: ResultadoBusqueda): void {
    try {
      const limpio = { ...item };
      delete limpio._reciente; // no persistir flag visual
      const recientes = this.obtenerRecientes();
      const filtrados = recientes.filter((r) => r.id !== item.id);
      filtrados.unshift(limpio);
      const limitados = filtrados.slice(0, this.MAX_RECIENTES);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitados));
    } catch {}
  }

  limpiarRecientes(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {}
  }

  invalidarCache() {
    this.cache = [];
    this.cacheTimestamp = 0;
  }

  // ============ Algoritmo de Scoring (fuzzy + exacto) ============
  private calcularScore(item: ResultadoBusqueda, query: string): number {
    try {
      const titulo = this.truncar(item.titulo || '', 200).toLowerCase();
      const subtitulo = this.truncar(item.subtitulo || '', 200).toLowerCase();
      const keywords = this.truncar(
        (item.keywords || []).map((k) => this.toSearchableString(k)).join(' '),
        300,
      ).toLowerCase();

      let score = 0;

      if (titulo === query) return 10000;
      if (titulo.startsWith(query)) score += 500;
      if (titulo.includes(query)) score += 200;

      const palabras = titulo.split(/\s+/).slice(0, 20);
      for (const p of palabras) {
        if (p.startsWith(query)) score += 150;
        else if (p.includes(query)) score += 80;
      }

      if (subtitulo.includes(query)) score += 80;
      if (keywords.includes(query)) score += 60;

      if (score === 0) {
        if (this.fuzzyMatch(titulo, query)) score += 30;
        else if (this.fuzzyMatch(subtitulo, query)) score += 15;
        else if (this.fuzzyMatch(keywords, query)) score += 10;
      }

      return score;
    } catch (err) {
      console.warn('[Buscador] Error scoring item:', item?.id, err);
      return 0;
    }
  }

  /**
   * Fuzzy: ¿los caracteres del query aparecen en orden (no necesariamente contiguos)?
   * Ejemplo: "cnt" matchea "co nf ig u ra ci on" (porque c-o-n... contiene c-n-...)
   */
  private fuzzyMatch(text: string, query: string): boolean {
    if (!text || !query) return false;
    if (text.length > 300) text = text.slice(0, 300);

    let qi = 0;
    const maxIter = text.length;
    for (let ti = 0; ti < maxIter && qi < query.length; ti++) {
      if (text[ti] === query[qi]) qi++;
    }
    return qi === query.length;
  }

  // ============ Mappers ============
  private mapearProyectos(arr: any[]): ResultadoBusqueda[] {
    return (arr || []).slice(0, 100).map((p) => {
      const nombre = this.toSearchableString(p.nombre) || 'Sin nombre';
      const cliente = this.toSearchableString(p.cliente);
      const ubicacion = this.toSearchableString(p.ubicacion);
      const superficie = this.toSearchableString(p.superficie);

      return {
        id: `proy-${p.id}`,
        categoria: 'proyecto' as CategoriaResultado,
        titulo: this.truncar(nombre, 80),
        subtitulo: this.truncar(`${cliente || 'Sin cliente'} · ${this.labelEstado(p.estado)}`, 100),
        icono: '🏗️',
        ruta: '/admin/inicio',
        keywords: [ubicacion, cliente, superficie]
          .filter((s) => s && s.length > 0)
          .map((s) => this.truncar(s, 50)),
        meta: { id: p.id, nombre, cliente, estado: p.estado },
      };
    });
  }

  private mapearCitas(arr: any[]): ResultadoBusqueda[] {
    return (arr || []).slice(0, 30).map((c) => {
      const nombre = this.toSearchableString(c.nombre) || 'Sin nombre';
      const tipo = c.tipo === 'consulta' ? 'Consulta' : 'Proyecto';
      const correo = this.toSearchableString(c.correo);
      const telefono = this.toSearchableString(c.telefono);
      const servicio = this.toSearchableString(c.servicio);

      return {
        id: `cita-${c.id}`,
        categoria: 'cita' as CategoriaResultado,
        titulo: this.truncar(nombre, 80),
        subtitulo: this.truncar(`${tipo} · ${c.hora || 'sin hora'}`, 100),
        icono: '📅',
        ruta: '/admin/citas',
        keywords: [correo, telefono, servicio]
          .filter((s) => s && s.length > 0)
          .map((s) => this.truncar(s, 50)),
        meta: { id: c.id, nombre, tipo: c.tipo, hora: c.hora },
      };
    });
  }

  private mapearConsultas(arr: any[]): ResultadoBusqueda[] {
    return (arr || []).slice(0, 30).map((c) => {
      const nombre = this.toSearchableString(c.nombre) || 'Sin nombre';
      const servicio = this.toSearchableString(c.servicio);
      const motivo = this.toSearchableString(c.motivo);
      const correo = this.toSearchableString(c.correo);

      return {
        id: `cons-${c.id}`,
        categoria: 'consulta' as CategoriaResultado,
        titulo: this.truncar(nombre, 80),
        subtitulo: this.truncar(servicio || motivo.slice(0, 50) || 'Consulta general', 100),
        icono: '💬',
        ruta: '/admin/inicio',
        keywords: [correo, this.truncar(motivo, 100)].filter((s) => s && s.length > 0),
        meta: { id: c.id, nombre, servicio, motivo: this.truncar(motivo, 200) },
      };
    });
  }

  private mapearReportes(arr: any[]): ResultadoBusqueda[] {
    return (arr || []).slice(0, 50).map((r) => {
      const titulo = this.toSearchableString(r.titulo) || 'Sin título';
      const tipo = this.toSearchableString(r.tipo);
      const descripcion = this.toSearchableString(r.descripcion);

      return {
        id: `rep-${r.id}`,
        categoria: 'reporte' as CategoriaResultado,
        titulo: this.truncar(titulo, 80),
        subtitulo: this.truncar(`${this.fmtFecha(r.createdAt)} · ${r.tamanioKb || 0} KB`, 100),
        icono: '📄',
        ruta: '/admin/reportes/historial',
        keywords: [tipo, descripcion]
          .filter((s) => s && s.length > 0)
          .map((s) => this.truncar(s, 50)),
        meta: { id: r.id, titulo, tipo },
      };
    });
  }

  private labelEstado(estado: string): string {
    const map: Record<string, string> = {
      en_diseno: 'En diseño',
      en_proceso: 'En proceso',
      en_revision: 'En revisión',
      pausado: 'Pausado',
      finalizado: 'Finalizado',
    };
    return map[estado] || estado;
  }

  private fmtFecha(iso: string): string {
    if (!iso) return 'Sin fecha';
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** Convierte cualquier valor a string seguro para búsqueda */
  private toSearchableString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      if ('nombre' in value && typeof value.nombre === 'string') return value.nombre;
      if ('titulo' in value && typeof value.titulo === 'string') return value.titulo;
      return '';
    }
    return '';
  }

  /** Limita strings muy largos para evitar hangs en fuzzy match */
  private truncar(s: string, max = 200): string {
    if (!s) return '';
    return s.length > max ? s.slice(0, max) : s;
  }
}
