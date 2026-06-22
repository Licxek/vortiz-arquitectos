import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  ChangeDetectorRef,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InicioService, CitaBackend } from '../../../core/services/inicio.service';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';

interface Consulta {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  fechaCita: string;
  horaCita: string;
  fechaCitaRaw: string;
  fechaCreacion: string;
  fechaCreacionRaw: string;
  servicio: string | null;
  conServicio: boolean;
  asunto: string;
  mensaje: string;
  urgente: boolean;
  resuelta: boolean;
  archivada: boolean;
  tipo: string;
  iniciales: string;
  colorAvatar: string;
}

interface MensajeChat {
  texto: string;
  fecha: string;
  autor: 'cliente' | 'admin';
  metodo?: 'email' | 'whatsapp' | 'guardado' | 'inbound';
}

type Filtro = 'todas' | 'pendientes' | 'urgentes' | 'resueltas' | 'archivadas';

@Component({
  selector: 'app-consultas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonComponent],
  templateUrl: './consultas.component.html',
})
export class ConsultasComponent implements OnInit, OnDestroy, AfterViewInit {
  private inicioService = inject(InicioService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('chatContainer') chatContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('cardContainer') cardContainer?: ElementRef<HTMLDivElement>;

  consultas: Consulta[] = [];
  consultaSeleccionada: Consulta | null = null;

  cargando = true;
  busqueda = '';
  filtro: Filtro = 'pendientes';
  respuestaTexto = '';
  numeroCopiado = false;

  private readonly STORAGE_RESUELTAS = 'vortiz_consultas_resueltas';
  private readonly STORAGE_ARCHIVADAS = 'vortiz_consultas_archivadas';
  private idsResueltos = new Set<number>();
  private idsArchivados = new Set<number>();
  mensajesActuales: MensajeChat[] = [];
  cargandoMensajes = false;
  private intervalPolling: any = null;

  private bodyOverflowAnterior = '';

  ngOnInit() {
    this.bodyOverflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.cargarLocalStorage();
    this.cargar();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.bloquearScrollsAncestros();
      this.ajustarAlturaCard();
    }, 50);
    window.addEventListener('resize', this.ajustarAlturaCard);
  }

  private bloquearScrollsAncestros() {
    if (!this.cardContainer?.nativeElement) return;
    let parent = this.cardContainer.nativeElement.parentElement;
    while (parent && parent !== document.body) {
      const computed = window.getComputedStyle(parent);
      if (computed.overflowY === 'auto' || computed.overflowY === 'scroll') {
        this.elementosScrollBloqueados.push({
          el: parent,
          originalOverflow: parent.style.overflowY,
        });
        parent.style.overflowY = 'hidden';
      }
      parent = parent.parentElement;
    }
  }

  private ajustarAlturaCard = () => {
    if (!this.cardContainer?.nativeElement) return;
    const el = this.cardContainer.nativeElement;
    el.style.height = 'auto';
    requestAnimationFrame(() => {
      if (!this.cardContainer?.nativeElement) return;
      const el2 = this.cardContainer.nativeElement;
      const top = el2.getBoundingClientRect().top;
      const viewport = window.innerHeight;
      const espacio = viewport - top - 24;
      el2.style.height = `${Math.max(espacio, 400)}px`;
    });
  };

  ngOnDestroy() {
    document.body.style.overflow = this.bodyOverflowAnterior;
    this.elementosScrollBloqueados.forEach(({ el, originalOverflow }) => {
      el.style.overflowY = originalOverflow;
    });
    this.elementosScrollBloqueados = [];
    window.removeEventListener('resize', this.ajustarAlturaCard);
    this.detenerPolling();
  }

  private cargarLocalStorage() {
    try {
      const r = localStorage.getItem(this.STORAGE_RESUELTAS);
      if (r) this.idsResueltos = new Set(JSON.parse(r));
      const a = localStorage.getItem(this.STORAGE_ARCHIVADAS);
      if (a) this.idsArchivados = new Set(JSON.parse(a));
    } catch {}
  }

  cargar() {
    this.cargando = true;
    this.inicioService.obtenerConsultas().subscribe({
      next: (lista) => {
        this.consultas = lista.map((c) => this.mapearConsulta(c));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.consultas = [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get consultasFiltradas(): Consulta[] {
    let resultado = this.consultas;

    if (this.filtro === 'pendientes') {
      resultado = resultado.filter((c) => !c.resuelta && !c.archivada);
    } else if (this.filtro === 'urgentes') {
      resultado = resultado.filter((c) => c.urgente && !c.resuelta && !c.archivada);
    } else if (this.filtro === 'resueltas') {
      resultado = resultado.filter((c) => c.resuelta && !c.archivada);
    } else if (this.filtro === 'archivadas') {
      resultado = resultado.filter((c) => c.archivada);
    }

    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      resultado = resultado.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.correo.toLowerCase().includes(q) ||
          c.asunto.toLowerCase().includes(q) ||
          c.mensaje.toLowerCase().includes(q),
      );
    }

    resultado = [...resultado].sort((a, b) => {
      if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
      return new Date(b.fechaCreacionRaw).getTime() - new Date(a.fechaCreacionRaw).getTime();
    });

    return resultado;
  }

  get conteoPendientes(): number {
    return this.consultas.filter((c) => !c.resuelta && !c.archivada).length;
  }

  get conteoUrgentes(): number {
    return this.consultas.filter((c) => c.urgente && !c.resuelta && !c.archivada).length;
  }

  get conteoResueltas(): number {
    return this.consultas.filter((c) => c.resuelta && !c.archivada).length;
  }

  get conteoArchivadas(): number {
    return this.consultas.filter((c) => c.archivada).length;
  }

  get mensajesChat(): MensajeChat[] {
    if (!this.consultaSeleccionada) return [];
    const c = this.consultaSeleccionada;
    // Primer mensaje siempre es el motivo original de la cita
    const mensajeCliente: MensajeChat = {
      texto: c.mensaje,
      fecha: c.fechaCreacionRaw,
      autor: 'cliente',
    };
    return [mensajeCliente, ...this.mensajesActuales].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );
  }

  seleccionar(c: Consulta) {
    this.consultaSeleccionada = c;
    this.respuestaTexto = '';
    this.mensajesActuales = [];
    this.cargarMensajesConsulta(c.id);
    this.iniciarPolling();
    this.scrollAlFondo();
  }

  volverALista() {
    this.consultaSeleccionada = null;
    this.mensajesActuales = [];
    this.detenerPolling();
  }

  cambiarFiltro(f: Filtro) {
    this.filtro = f;
    this.consultaSeleccionada = null;
  }

  enviarRespuesta() {
    if (!this.consultaSeleccionada || !this.respuestaTexto.trim() || this.enviando) return;
    const texto = this.respuestaTexto.trim();
    const consultaId = this.consultaSeleccionada.id;

    this.enviando = true;
    this.inicioService.responderConsulta(consultaId, texto).subscribe({
      next: () => {
        // Guardar también en la tabla de mensajes para que aparezca en el chat
        this.guardarMensajeAdmin('email', texto).then(() => {
          this.respuestaTexto = '';
          this.enviando = false;
          this.scrollAlFondo();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error enviando respuesta:', err);
        alert('No se pudo enviar el mensaje. Verifica tu conexión.');
        this.enviando = false;
        this.cdr.detectChanges();
      },
    });
  }

  enviarPorWhatsApp() {
    if (!this.consultaSeleccionada) return;
    const c = this.consultaSeleccionada;
    const tel = (c.telefono || '').replace(/\D/g, '');
    if (!tel) {
      alert('Esta consulta no tiene teléfono registrado.');
      return;
    }
    const texto = this.respuestaTexto.trim();
    if (texto) {
      this.guardarMensajeAdmin('whatsapp', texto).then(() => {
        this.respuestaTexto = '';
        this.scrollAlFondo();
      });
    }
    const mensaje = encodeURIComponent(
      texto ||
        `Hola ${c.nombre.split(' ')[0]}, te contacto de Vortiz Arquitectos en respuesta a tu consulta.`,
    );
    window.open(`https://wa.me/${tel}?text=${mensaje}`, '_blank');
  }

  guardarSolamente() {
    const texto = this.respuestaTexto.trim();
    if (!texto) return;
    this.guardarMensajeAdmin('guardado', texto).then(() => {
      this.respuestaTexto = '';
      this.scrollAlFondo();
      this.cdr.detectChanges();
    });
  }

  private guardarMensajeAdmin(
    metodo: 'email' | 'whatsapp' | 'guardado',
    texto: string,
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.consultaSeleccionada) return resolve();
      this.inicioService
        .crearMensajeConsulta(this.consultaSeleccionada.id, {
          autor: 'admin',
          texto,
          metodo,
        })
        .subscribe({
          next: (mensaje) => {
            this.mensajesActuales.push({
              texto: mensaje.texto,
              fecha: mensaje.createdAt,
              autor: mensaje.autor,
              metodo: mensaje.metodo || undefined,
            });
            this.cdr.detectChanges();
            resolve();
          },
          error: (err) => {
            console.error('Error guardando mensaje:', err);
            resolve();
          },
        });
    });
  }

  copiarNumero() {
    if (!this.consultaSeleccionada?.telefono) return;
    navigator.clipboard
      .writeText(this.consultaSeleccionada.telefono)
      .then(() => {
        this.numeroCopiado = true;
        setTimeout(() => {
          this.numeroCopiado = false;
          this.cdr.detectChanges();
        }, 2000);
        this.cdr.detectChanges();
      })
      .catch(() => {
        alert('No se pudo copiar el número');
      });
  }

  marcarResuelta() {
    if (!this.consultaSeleccionada) return;
    const id = this.consultaSeleccionada.id;
    if (this.consultaSeleccionada.resuelta) {
      this.idsResueltos.delete(id);
      this.consultaSeleccionada.resuelta = false;
    } else {
      this.idsResueltos.add(id);
      this.consultaSeleccionada.resuelta = true;
    }
    this.guardar(this.STORAGE_RESUELTAS, this.idsResueltos);
    const idx = this.consultas.findIndex((c) => c.id === id);
    if (idx >= 0) this.consultas[idx] = { ...this.consultaSeleccionada };
  }

  archivar() {
    if (!this.consultaSeleccionada) return;
    const id = this.consultaSeleccionada.id;
    this.idsArchivados.add(id);
    this.consultaSeleccionada.archivada = true;
    this.guardar(this.STORAGE_ARCHIVADAS, this.idsArchivados);
    const idx = this.consultas.findIndex((c) => c.id === id);
    if (idx >= 0) this.consultas[idx] = { ...this.consultaSeleccionada };
    this.consultaSeleccionada = null;
  }

  desarchivar() {
    if (!this.consultaSeleccionada) return;
    const id = this.consultaSeleccionada.id;
    this.idsArchivados.delete(id);
    this.consultaSeleccionada.archivada = false;
    this.guardar(this.STORAGE_ARCHIVADAS, this.idsArchivados);
    const idx = this.consultas.findIndex((c) => c.id === id);
    if (idx >= 0) this.consultas[idx] = { ...this.consultaSeleccionada };
  }

  irACrearCita() {
    if (!this.consultaSeleccionada) return;
    this.router.navigate(['/admin/citas']);
  }

  private scrollAlFondo() {
    setTimeout(() => {
      if (this.chatContainer) {
        const el = this.chatContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 80);
  }

  private guardar(key: string, set: Set<number>) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch {}
  }

  private mapearConsulta(c: CitaBackend): Consulta {
    const conServicio = !!c.servicio?.titulo;
    const tipoLabel = c.tipo === 'consulta' ? 'Consulta general' : 'Solicitud de cita';
    return {
      id: c.id,
      nombre: c.nombre,
      correo: c.correo,
      telefono: c.telefono,
      fechaCita: this.formatearFechaLarga(c.fecha),
      horaCita: c.hora,
      fechaCitaRaw: c.fecha,
      fechaCreacion: this.tiempoRelativo(c.createdAt),
      fechaCreacionRaw: c.createdAt,
      servicio: c.servicio?.titulo || null,
      conServicio,
      asunto: c.servicio?.titulo || tipoLabel,
      mensaje: c.motivo || '(Sin mensaje)',
      urgente: this.esCitaUrgente(c.fecha),
      resuelta: this.idsResueltos.has(c.id),
      archivada: this.idsArchivados.has(c.id),
      tipo: c.tipo || 'consulta',
      iniciales: this.iniciales(c.nombre),
      colorAvatar: this.colorAvatar(c.nombre),
    };
  }

  iniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  colorAvatar(nombre: string): string {
    if (!nombre) return 'bg-gray-400';
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-amber-500',
      'bg-emerald-500',
      'bg-indigo-500',
      'bg-rose-500',
      'bg-teal-500',
      'bg-cyan-500',
    ];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  tiempoRelativo(iso: string): string {
    if (!iso) return '—';
    const ahora = Date.now();
    const fecha = new Date(iso).getTime();
    const diffMs = ahora - fecha;
    const min = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMs / 3600000);
    const dias = Math.floor(diffMs / 86400000);

    if (min < 1) return 'Recién';
    if (min < 60) return `Hace ${min}m`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias}d`;
    return new Date(iso).toLocaleDateString('es-MX');
  }

  private formatearFechaLarga(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  private esCitaUrgente(fecha: string): boolean {
    if (!fecha) return false;
    const cita = new Date(fecha + 'T00:00:00');
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    const diffDias = (cita.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24);
    return diffDias >= 0 && diffDias <= 1;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.consultaSeleccionada) this.consultaSeleccionada = null;
  }

  autoExpandTextarea(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }

  enviando = false;

  private elementosScrollBloqueados: { el: HTMLElement; originalOverflow: string }[] = [];

  private cargarMensajesConsulta(citaId: number) {
    this.cargandoMensajes = true;
    this.inicioService.obtenerMensajesConsulta(citaId).subscribe({
      next: (mensajes) => {
        this.mensajesActuales = mensajes.map((m) => ({
          texto: m.texto,
          fecha: m.createdAt,
          autor: m.autor,
          metodo: m.metodo || undefined,
        }));
        this.cargandoMensajes = false;
        this.scrollAlFondo();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando mensajes:', err);
        this.mensajesActuales = [];
        this.cargandoMensajes = false;
        this.cdr.detectChanges();
      },
    });
  }

  private iniciarPolling() {
    this.detenerPolling();
    this.intervalPolling = setInterval(() => {
      if (this.consultaSeleccionada && document.visibilityState === 'visible') {
        this.cargarMensajesConsulta(this.consultaSeleccionada.id);
      }
    }, 30000); // cada 30s — preparado para webhook futuro
  }

  private detenerPolling() {
    if (this.intervalPolling) {
      clearInterval(this.intervalPolling);
      this.intervalPolling = null;
    }
  }
}
