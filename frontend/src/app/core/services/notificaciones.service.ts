import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TipoNotificacion =
  | 'cita_nueva'
  | 'cita_pendiente'
  | 'cita_confirmada'
  | 'cita_por_evaluar'
  | 'consulta_general'
  | 'consulta_servicio'
  | 'mensaje_nuevo';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  subtitulo: string;
  detalle?: string;
  fecha: Date;
  leida: boolean;
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

interface EstadoBackend {
  id: number;
  externalId: string;
  leida: boolean;
  borrada: boolean;
  leidaEn: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;
  private readonly STORAGE_KEY_LEIDAS = 'vortiz_notif_leidas';
  private readonly STORAGE_KEY_BORRADAS = 'vortiz_notif_borradas';
  private readonly STORAGE_SONIDO = 'vortiz_notif_sonido';

  private _notificaciones = signal<Notificacion[]>([]);
  notificaciones = this._notificaciones.asReadonly();

  noLeidas = computed(() => this._notificaciones().filter((n) => !n.leida).length);
  noLeidasCitas = computed(
    () => this._notificaciones().filter((n) => !n.leida && n.tipo.startsWith('cita')).length,
  );
  noLeidasConsultas = computed(
    () => this._notificaciones().filter((n) => !n.leida && n.tipo.startsWith('consulta')).length,
  );

  sonidoActivado = signal(false);

  private idsLeidos = new Set<string>();
  private idsBorrados = new Set<string>();
  private intervalRefresh: any = null;
  private primeraCarga = true;
  private cantidadAnterior = 0;
  private inicializado = false;

  inicializar() {
    if (this.inicializado) return;
    this.inicializado = true;

    // 1. Cargar cache local primero (UI optimista — visible inmediato)
    this.cargarCacheLocal();
    this.sonidoActivado.set(localStorage.getItem(this.STORAGE_SONIDO) === '1');

    // 2. Sincronizar con backend (fuente de verdad)
    this.sincronizarEstadosDesdeBackend().then(() => {
      // 3. Primera carga de notificaciones
      this.cargar();
    });

    // Polling cada 30s solo si la pestaña está visible
    this.intervalRefresh = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.cargar();
      }
    }, 30000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.sincronizarEstadosDesdeBackend().then(() => this.cargar());
      }
    });
  }

  destruir() {
    if (this.intervalRefresh) clearInterval(this.intervalRefresh);
    this.inicializado = false;
  }

  // ============ SYNC CON BACKEND ============

  private async sincronizarEstadosDesdeBackend() {
    try {
      const estados = await firstValueFrom(
        this.http.get<EstadoBackend[]>(`${this.API}/notificaciones/estados`),
      );

      // Backend es fuente de verdad — reemplazar sets locales
      this.idsLeidos = new Set(
        estados.filter((e) => e.leida).map((e) => e.externalId),
      );
      this.idsBorrados = new Set(
        estados.filter((e) => e.borrada).map((e) => e.externalId),
      );

      // Persistir en localStorage como cache
      this.guardarCacheLocal();
    } catch (err) {
      console.warn('No se pudo sincronizar estados de notificaciones:', err);
      // Si falla, seguimos con el cache local
    }
  }

  private cargarCacheLocal() {
    try {
      const leidas = localStorage.getItem(this.STORAGE_KEY_LEIDAS);
      if (leidas) this.idsLeidos = new Set(JSON.parse(leidas));
    } catch {}
    try {
      const borradas = localStorage.getItem(this.STORAGE_KEY_BORRADAS);
      if (borradas) this.idsBorrados = new Set(JSON.parse(borradas));
    } catch {}
  }

  private guardarCacheLocal() {
    try {
      localStorage.setItem(this.STORAGE_KEY_LEIDAS, JSON.stringify(Array.from(this.idsLeidos)));
      localStorage.setItem(this.STORAGE_KEY_BORRADAS, JSON.stringify(Array.from(this.idsBorrados)));
    } catch {}
  }

  // ============ CARGAR NOTIFICACIONES ============

  cargar() {
    Promise.all([this.cargarCitas(), this.cargarConsultas()])
      .then(([citas, consultas]) => {
        const todas: Notificacion[] = [
          ...this.citasANotificaciones(citas),
          ...this.citasPorEvaluarANotificaciones(citas),
          ...this.consultasANotificaciones(consultas),
          ...this.mensajesNuevosANotificaciones(consultas),
        ].filter((n) => !this.idsBorrados.has(n.id));

        todas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

        if (!this.primeraCarga && todas.length > this.cantidadAnterior) {
          this.reproducirSonidoNuevo();
        }
        this.cantidadAnterior = todas.length;
        this.primeraCarga = false;

        this._notificaciones.set(todas);
      })
      .catch(() => {});
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

  // ============ TRANSFORMERS ============

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
          detalle: c.servicio?.titulo || c.tipo || 'Sin servicio',
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

  private citasPorEvaluarANotificaciones(citas: any[]): Notificacion[] {
    const ahora = new Date();
    return citas
      .filter((c) => {
        if (c.estado !== 'confirmada' && c.estado !== 'pendiente') return false;
        if (!c.fecha || !c.hora) return false;
        const [h, m] = c.hora.split(':').map(Number);
        const fin = new Date(c.fecha + 'T00:00:00');
        fin.setHours(h, m + (c.duracion || 60), 0, 0);
        return fin < ahora;
      })
      .map((c) => {
        const id = `evaluar_${c.id}`;
        return {
          id,
          tipo: 'cita_por_evaluar' as TipoNotificacion,
          titulo: `¿${c.nombre} asistió a su cita?`,
          subtitulo: `${this.formatoFecha(c.fecha)} · ${c.hora}`,
          detalle: c.servicio?.titulo || 'Marca asistió o no asistió',
          fecha: new Date(c.fecha + 'T' + c.hora),
          leida: this.idsLeidos.has(id),
          ruta: '/admin/citas',
          meta: { citaId: c.id, cliente: c.nombre, servicio: c.servicio?.titulo },
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
          ruta: '/admin/consultas',
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

  private mensajesNuevosANotificaciones(consultas: any[]): Notificacion[] {
    return consultas
      .filter((c) => {
        const m = c.ultimoMensaje;
        return m && m.autor === 'cliente' && m.metodo === 'inbound';
      })
      .map((c) => {
        const m = c.ultimoMensaje;
        const id = `mensaje_${c.id}_${new Date(m.createdAt).getTime()}`;
        const preview = (m.texto || '').substring(0, 100).trim();
        return {
          id,
          tipo: 'mensaje_nuevo' as TipoNotificacion,
          titulo: `Nuevo mensaje de ${c.nombre}`,
          subtitulo: preview || 'Mensaje sin contenido',
          fecha: new Date(m.createdAt),
          leida: this.idsLeidos.has(id),
          ruta: '/admin/consultas',
          meta: {
            consultaId: c.id,
            cliente: c.nombre,
            correo: c.correo,
            mensaje: m.texto,
          },
        };
      });
  }

  // ============ ACCIONES (optimistic UI + backend) ============

  marcarLeida(id: string) {
    // 1. Optimista: actualizar UI inmediato
    this.idsLeidos.add(id);
    this.guardarCacheLocal();
    this._notificaciones.update((arr) =>
      arr.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    );

    // 2. Sincronizar con backend (no bloqueante)
    this.http
      .post(`${this.API}/notificaciones/marcar-leida`, { externalId: id })
      .subscribe({
        error: (err) => console.warn('Error sincronizando marcarLeida:', err),
      });
  }

  marcarTodasLeidas() {
    // Optimista
    const ids = this._notificaciones().map((n) => n.id);
    ids.forEach((id) => this.idsLeidos.add(id));
    this.guardarCacheLocal();
    this._notificaciones.update((arr) => arr.map((n) => ({ ...n, leida: true })));

    // Backend
    this.http
      .post(`${this.API}/notificaciones/marcar-todas-leidas`, { externalIds: ids })
      .subscribe({
        error: (err) => console.warn('Error sincronizando marcarTodasLeidas:', err),
      });
  }

  borrar(id: string) {
    // Optimista
    this.idsBorrados.add(id);
    this.guardarCacheLocal();
    this._notificaciones.update((arr) => arr.filter((n) => n.id !== id));

    // Backend
    this.http
      .post(`${this.API}/notificaciones/marcar-borrada`, { externalId: id })
      .subscribe({
        error: (err) => console.warn('Error sincronizando borrar:', err),
      });
  }

  toggleSonido() {
    const nuevo = !this.sonidoActivado();
    this.sonidoActivado.set(nuevo);
    localStorage.setItem(this.STORAGE_SONIDO, nuevo ? '1' : '0');
    if (nuevo) this.reproducirSonidoNuevo();
  }

  refrescarManual() {
    this.sincronizarEstadosDesdeBackend().then(() => this.cargar());
  }

  // ============ HELPERS ============

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
}
