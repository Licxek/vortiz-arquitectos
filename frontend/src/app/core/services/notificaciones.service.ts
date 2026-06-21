import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type TipoNotificacion =
  | 'cita_nueva'
  | 'cita_pendiente'
  | 'cita_confirmada'
  | 'consulta_general'
  | 'consulta_servicio';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  subtitulo: string;
  detalle?: string;
  fecha: Date;
  leida: boolean;
  // Para navegación contextual
  ruta?: string;
  meta?: {
    citaId?: number;
    consultaId?: number;
    cliente?: string;
    correo?: string;
    telefono?: string;
    servicio?: string;
    mensaje?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;
  private readonly STORAGE_KEY = 'vortiz_notif_leidas';
  private readonly STORAGE_SONIDO = 'vortiz_notif_sonido';

  // Estado reactivo
  private _notificaciones = signal<Notificacion[]>([]);
  notificaciones = this._notificaciones.asReadonly();

  // Conteos derivados
  noLeidas = computed(() => this._notificaciones().filter((n) => !n.leida).length);
  noLeidasCitas = computed(
    () => this._notificaciones().filter((n) => !n.leida && n.tipo.startsWith('cita')).length,
  );
  noLeidasConsultas = computed(
    () => this._notificaciones().filter((n) => !n.leida && n.tipo.startsWith('consulta')).length,
  );

  // Estado de sonido
  sonidoActivado = signal(false);

  private idsLeidos = new Set<string>();
  private intervalRefresh: any = null;
  private primeraCarga = true;
  private cantidadAnterior = 0;
  private inicializado = false;

  inicializar() {
    if (this.inicializado) return;
    this.inicializado = true;

    // Cargar IDs leídos del storage
    try {
      const guardado = localStorage.getItem(this.STORAGE_KEY);
      if (guardado) this.idsLeidos = new Set(JSON.parse(guardado));
    } catch {}

    // Cargar IDs borrados del storage
    try {
      const borrados = localStorage.getItem(this.STORAGE_BORRADAS);
      if (borrados) this.idsBorrados = new Set(JSON.parse(borrados));
    } catch {}

    // Cargar preferencia de sonido
    this.sonidoActivado.set(localStorage.getItem(this.STORAGE_SONIDO) === '1');

    // Primera carga
    this.cargar();

    // Polling cada 30s solo si la pestaña está visible
    this.intervalRefresh = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.cargar();
      }
    }, 30000);

    // Refrescar al volver a la pestaña
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.cargar();
    });
  }

  destruir() {
    if (this.intervalRefresh) clearInterval(this.intervalRefresh);
    this.inicializado = false;
  }

  cargar() {
    // Cargar citas y consultas en paralelo
    Promise.all([this.cargarCitas(), this.cargarConsultas()])
      .then(([citas, consultas]) => {
        const todas: Notificacion[] = [
          ...this.citasANotificaciones(citas),
          ...this.consultasANotificaciones(consultas),
        ].filter((n) => !this.idsBorrados.has(n.id));

        // Ordenar por fecha desc
        todas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

        // Detectar nuevas (después de primera carga)
        if (!this.primeraCarga && todas.length > this.cantidadAnterior) {
          this.reproducirSonidoNuevo();
        }
        this.cantidadAnterior = todas.length;
        this.primeraCarga = false;

        this._notificaciones.set(todas);
      })
      .catch(() => {
        // Silencioso, no rompe la app
      });
  }

  private cargarCitas(): Promise<any[]> {
    return new Promise((resolve) => {
      this.http.get<any[]>(`${this.API}/citas`).subscribe({
        next: (data) => resolve(data || []),
        error: () => resolve([]),
      });
    });
  }

  private cargarConsultas(): Promise<any[]> {
    return new Promise((resolve) => {
      this.http.get<any[]>(`${this.API}/inicio/consultas-pendientes`).subscribe({
        next: (data) => resolve(data || []),
        error: () => resolve([]),
      });
    });
  }

  private citasANotificaciones(citas: any[]): Notificacion[] {
    return citas
      .filter((c) => this.esFechaVigente(c.fecha))
      .filter((c) => c.estado === 'pendiente' || c.estado === 'confirmada')
      .map((c) => {
        const id = `cita_${c.id}`;
        const tipo: TipoNotificacion =
          c.estado === 'pendiente' ? 'cita_pendiente' : 'cita_confirmada';
        return {
          id,
          tipo,
          titulo:
            c.estado === 'pendiente'
              ? `Cita pendiente: ${c.nombre}`
              : `Cita confirmada: ${c.nombre}`,
          subtitulo: `${this.formatoFecha(c.fecha)} · ${c.hora || 'Sin hora'}`,
          detalle: c.servicio?.titulo || c.tipo || 'Sin servicio especificado',
          fecha: new Date(c.createdAt || c.fecha || Date.now()),
          leida: this.idsLeidos.has(id),
          ruta: '/admin/citas',
          meta: {
            citaId: c.id,
            cliente: c.nombre,
            correo: c.correo,
            telefono: c.telefono,
            servicio: c.servicio?.titulo,
          },
        };
      });
  }

  private consultasANotificaciones(consultas: any[]): Notificacion[] {
    return consultas
      .filter((c) => c.estado === 'pendiente' || !c.estado)
      .filter((c) => !c.fecha || this.esFechaVigente(c.fecha))
      .map((c) => {
        const id = `consulta_${c.id}`;
        const conServicio = !!c.servicio_id || !!c.servicio;
        const tipo: TipoNotificacion = conServicio ? 'consulta_servicio' : 'consulta_general';
        return {
          id,
          tipo,
          titulo: `Nueva consulta de ${c.nombre}`,
          subtitulo: c.motivo?.substring(0, 100) || c.servicio?.titulo || 'Mensaje sin descripción',
          detalle: conServicio ? `Servicio: ${c.servicio?.titulo || 'Sin nombre'}` : undefined,
          fecha: new Date(c.createdAt || c.fecha || Date.now()),
          leida: this.idsLeidos.has(id),
          ruta: '/admin/consultas', // En Fase 4 será /admin/consultas
          meta: {
            consultaId: c.id,
            cliente: c.nombre,
            correo: c.correo,
            telefono: c.telefono,
            servicio: c.servicio?.titulo,
            mensaje: c.motivo,
          },
        };
      });
  }

  marcarLeida(id: string) {
    this.idsLeidos.add(id);
    this.guardarLeidos();
    this._notificaciones.update((arr) => arr.map((n) => (n.id === id ? { ...n, leida: true } : n)));
  }

  marcarTodasLeidas() {
    this._notificaciones().forEach((n) => this.idsLeidos.add(n.id));
    this.guardarLeidos();
    this._notificaciones.update((arr) => arr.map((n) => ({ ...n, leida: true })));
  }

  toggleSonido() {
    const nuevo = !this.sonidoActivado();
    this.sonidoActivado.set(nuevo);
    localStorage.setItem(this.STORAGE_SONIDO, nuevo ? '1' : '0');
    if (nuevo) this.reproducirSonidoNuevo();
  }

  refrescarManual() {
    this.cargar();
  }

  private guardarLeidos() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(this.idsLeidos)));
    } catch {}
  }

  private reproducirSonidoNuevo() {
    if (!this.sonidoActivado()) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  private esFechaVigente(fecha: string): boolean {
    if (!fecha) return false;
    const cita = new Date(fecha + 'T00:00:00');
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    return cita.getTime() >= ahora.getTime();
  }

  private formatoFecha(fecha: string): string {
    const f = new Date(fecha + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    if (f.getTime() === hoy.getTime()) return 'Hoy';
    if (f.getTime() === manana.getTime()) return 'Mañana';
    return f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  tiempoTranscurrido(fecha: Date): string {
    const diff = Date.now() - fecha.getTime();
    const min = Math.floor(diff / 60000);
    const horas = Math.floor(min / 60);
    const dias = Math.floor(horas / 24);
    if (min < 1) return 'Recién';
    if (min < 60) return `Hace ${min} min`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias === 1) return 'Ayer';
    return `Hace ${dias}d`;
  }

  private readonly STORAGE_BORRADAS = 'vortiz_notif_borradas';
  private idsBorrados = new Set<string>();

  borrar(id: string) {
    this.idsBorrados.add(id);
    this.guardarBorrados();
    this._notificaciones.update((arr) => arr.filter((n) => n.id !== id));
  }

  private guardarBorrados() {
    try {
      localStorage.setItem(this.STORAGE_BORRADAS, JSON.stringify(Array.from(this.idsBorrados)));
    } catch {}
  }
}
