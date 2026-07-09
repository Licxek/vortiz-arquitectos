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
import { InicioService, CitaBackend } from '../../../core/services/inicio.service';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import { TelefonoFormatoPipe } from '../../../shared/pipes/telefono-formato.pipe';
import { ConsultaSnapshotsService, ConsultaSnapshot } from '../../../core/services/consulta-snapshots.service';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';

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
  ultimoMensajeTexto?: string;
  ultimoMensajeAutor?: 'cliente' | 'admin';
  ultimoMensajeFecha?: string;
  ultimoMensajeMetodo?: 'email' | 'whatsapp' | 'guardado' | 'inbound';
  tieneRespuestaNoLeida: boolean;
  estado?: string; // 👈 AGREGAR
}

interface MensajeChat {
  texto: string;
  fecha: string;
  autor: 'cliente' | 'admin';
  metodo?: 'email' | 'whatsapp' | 'guardado' | 'inbound';
}

type Filtro = 'todas' | 'pendientes' | 'urgentes' | 'resueltas' | 'archivadas' | 'historial';

@Component({
  selector: 'app-consultas',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, TelefonoFormatoPipe],
  templateUrl: './consultas.component.html',
})
export class ConsultasComponent implements OnInit, OnDestroy, AfterViewInit {
  private inicioService = inject(InicioService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private snapshotsService = inject(ConsultaSnapshotsService);

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

  // ============ SNAPSHOTS ============
  snapshots: ConsultaSnapshot[] = [];
  cargandoSnapshots = false;
  snapshotSeleccionado: ConsultaSnapshot | null = null;
  guardandoSnapshot = false;
  flashSnapshot = '';

  private bodyOverflowAnterior = '';
  private readonly STORAGE_LEIDAS = 'vortiz_consultas_leidas';
  private idsLeidos = new Set<string>();

  ngOnInit() {
    this.bodyOverflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.cargarLocalStorage();
    this.cargar();
    this.iniciarPollingLista(); // ← NUEVO
    this.cargarSnapshots();
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
    this.detenerPollingLista();
  }

  private cargarLocalStorage() {
    try {
      const r = localStorage.getItem(this.STORAGE_RESUELTAS);
      if (r) this.idsResueltos = new Set(JSON.parse(r));
      const a = localStorage.getItem(this.STORAGE_ARCHIVADAS);
      if (a) this.idsArchivados = new Set(JSON.parse(a));
    } catch {}
    try {
      const l = localStorage.getItem(this.STORAGE_LEIDAS);
      if (l) this.idsLeidos = new Set(JSON.parse(l));
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
    // Marcar como leído si tenía mensaje sin leer
    if (c.tieneRespuestaNoLeida && c.ultimoMensajeFecha) {
      const key = `${c.id}_${c.ultimoMensajeFecha}`;
      this.idsLeidos.add(key);
      this.guardar(this.STORAGE_LEIDAS, this.idsLeidos as any);
      c.tieneRespuestaNoLeida = false;
    }

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
      next: (response) => {
        // El backend ya envió el email Y guardó en BD. Solo agregamos al chat local.
        if (response.mensajeGuardado) {
          this.mensajesActuales.push({
            texto: response.mensajeGuardado.texto,
            fecha: response.mensajeGuardado.createdAt,
            autor: response.mensajeGuardado.autor,
            metodo: response.mensajeGuardado.metodo || undefined,
          });
        }
        this.respuestaTexto = '';
        this.enviando = false;
        this.scrollAlFondo();
        this.cdr.detectChanges();
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
    const eraResuelta = this.consultaSeleccionada.resuelta;

    if (eraResuelta) {
      this.idsResueltos.delete(id);
      this.consultaSeleccionada.resuelta = false;
    } else {
      this.idsResueltos.add(id);
      this.consultaSeleccionada.resuelta = true;
      // 📸 Snapshot automático al marcar como resuelta
      this.snapshotsService.crear(id, 'automatico_resuelto').subscribe({
        next: (snap) => {
          this.snapshots = [snap, ...this.snapshots];
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error snapshot auto:', err),
      });
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
    // 📸 Snapshot automático al archivar
    this.snapshotsService.crear(id, 'automatico_archivado').subscribe({
      next: (snap) => {
        this.snapshots = [snap, ...this.snapshots];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error snapshot auto:', err),
    });
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
    const ultimo = (c as any).ultimoMensaje;
    const keyLeido = ultimo ? `${c.id}_${ultimo.createdAt}` : '';
    const tieneRespuestaNoLeida =
      !!ultimo && ultimo.autor === 'cliente' && !this.idsLeidos.has(keyLeido);

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
      ultimoMensajeTexto: ultimo?.texto || '',
      ultimoMensajeAutor: ultimo?.autor,
      ultimoMensajeFecha: ultimo?.createdAt,
      ultimoMensajeMetodo: ultimo?.metodo,
      tieneRespuestaNoLeida,
      estado: (c as any).estado || 'pendiente', // 👈 AGREGAR
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

  private intervalPollingLista: any = null;

  private iniciarPollingLista() {
    this.detenerPollingLista();
    this.intervalPollingLista = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.cargar();
      }
    }, 60000); // cada 60s
  }

  private detenerPollingLista() {
    if (this.intervalPollingLista) {
      clearInterval(this.intervalPollingLista);
      this.intervalPollingLista = null;
    }
  }
  cargarSnapshots() {
    this.cargandoSnapshots = true;
    this.snapshotsService.listarTodos().subscribe({
      next: (data) => {
        this.snapshots = data;
        this.cargandoSnapshots = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.snapshots = [];
        this.cargandoSnapshots = false;
        this.cdr.detectChanges();
      },
    });
  }

  get conteoHistorial(): number {
    return this.snapshots.length;
  }
  guardarSnapshotManual() {
    if (!this.consultaSeleccionada || this.guardandoSnapshot) return;
    const id = this.consultaSeleccionada.id;
    this.guardandoSnapshot = true;
    this.snapshotsService.crear(id, 'manual').subscribe({
      next: (snap) => {
        this.snapshots = [snap, ...this.snapshots];
        this.guardandoSnapshot = false;
        this.mostrarFlashSnapshot('✓ Historial guardado');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error guardando snapshot:', err);
        this.guardandoSnapshot = false;
        this.mostrarFlashSnapshot('⚠ No se pudo guardar');
        this.cdr.detectChanges();
      },
    });
  }

  private mostrarFlashSnapshot(texto: string) {
    this.flashSnapshot = texto;
    setTimeout(() => {
      this.flashSnapshot = '';
      this.cdr.detectChanges();
    }, 2500);
  }
  seleccionarSnapshot(s: ConsultaSnapshot) {
    this.snapshotSeleccionado = s;
  }

  cerrarSnapshotDetalle() {
    this.snapshotSeleccionado = null;
  }

  formatearFechaCompleta(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  motivoLabel(motivo: string): string {
    const map: Record<string, string> = {
      automatico_resuelto: 'Al marcar resuelta',
      automatico_archivado: 'Al archivar',
      manual: 'Guardado manual',
    };
    return map[motivo] || motivo;
  }

  motivoColor(motivo: string): string {
    if (motivo === 'automatico_resuelto') return 'bg-green-100 text-green-700';
    if (motivo === 'automatico_archivado') return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  }

  // ============ PDF DEL SNAPSHOT ============
  descargarSnapshotPDF(s: ConsultaSnapshot) {
    const doc = new jsPDF({
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    // Helper: nueva página si nos pasamos
    const checkPageBreak = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Helper: envolver texto largo
    const drawWrapped = (texto: string, maxWidth: number, lineHeight: number, fontSize: number) => {
      doc.setFontSize(fontSize);
      const lineas = doc.splitTextToSize(texto, maxWidth);
      for (const linea of lineas) {
        checkPageBreak(lineHeight);
        doc.text(linea, margin, y);
        y += lineHeight;
      }
    };

    // ============ HEADER ============
    doc.setFillColor(10, 77, 122); // #0a4d7a
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('VORTIZ ARQUITECTOS', margin, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Registro oficial de conversación con cliente', margin, 18);

    // Fecha de emisión (esquina derecha)
    doc.setFontSize(8);
    const fechaEmision = this.formatearFechaCompleta(s.createdAt);
    doc.text(`Emitido: ${fechaEmision}`, pageWidth - margin, 12, { align: 'right' });
    doc.text(`ID: SNAP-${s.id.toString().padStart(6, '0')}`, pageWidth - margin, 18, { align: 'right' });

    y = 35;

    // ============ TÍTULO ============
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Historial de Consulta', margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Motivo del registro: ${this.motivoLabel(s.motivo)}`, margin, y);
    y += 10;

    // ============ DATOS DEL CLIENTE ============
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 2, 2, 'F');

    doc.setTextColor(10, 77, 122);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', margin + 4, y + 6);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${s.clienteSnapshot.nombre}`, margin + 4, y + 13);
    doc.text(`Correo: ${s.clienteSnapshot.correo}`, margin + 4, y + 19);
    doc.text(`Teléfono: ${s.clienteSnapshot.telefono || '—'}`, margin + 4, y + 25);
    y += 36;

    // ============ DATOS DE LA CONSULTA ============
    checkPageBreak(35);
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 2, 2, 'F');

    doc.setTextColor(10, 77, 122);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES DE LA CONSULTA', margin + 4, y + 6);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const fechaCita = this.formatearFechaCompleta(s.consultaSnapshot.fecha + 'T' + (s.consultaSnapshot.hora || '00:00'));
    doc.text(`Servicio: ${s.consultaSnapshot.servicio || 'Consulta general'}`, margin + 4, y + 13);
    doc.text(`Fecha de la cita: ${fechaCita}`, margin + 4, y + 19);
    doc.text(`Total de mensajes: ${s.totalMensajes}   |   Duración: ${s.duracionDias || 0} días`, margin + 4, y + 25);
    y += 36;

    // ============ MOTIVO ORIGINAL ============
    if (s.consultaSnapshot.motivo) {
      checkPageBreak(15);
      doc.setTextColor(10, 77, 122);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MOTIVO ORIGINAL DEL CLIENTE', margin, y);
      y += 5;
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      drawWrapped(s.consultaSnapshot.motivo, pageWidth - margin * 2, 5, 10);
      y += 4;
    }

    // ============ MENSAJES ============
    checkPageBreak(15);
    doc.setDrawColor(10, 77, 122);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setTextColor(10, 77, 122);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CONVERSACIÓN', margin, y);
    y += 8;

    if (s.mensajesSnapshot.length === 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('(Sin mensajes registrados en esta consulta)', margin, y);
      y += 8;
    }

    for (const msg of s.mensajesSnapshot) {
      checkPageBreak(20);
      const esAdmin = msg.autor === 'admin';
      const label = esAdmin
        ? `VORTIZ (${this.metodoLabel(msg.metodo || '')}):`
        : `${s.clienteSnapshot.nombre.toUpperCase()}:`;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(esAdmin ? 10 : 80, esAdmin ? 77 : 80, esAdmin ? 122 : 80);
      doc.text(label, margin, y);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 140, 140);
      doc.text(this.formatearFechaCompleta(msg.createdAt), pageWidth - margin, y, { align: 'right' });
      y += 5;

      doc.setTextColor(40, 40, 40);
      drawWrapped(msg.texto, pageWidth - margin * 2, 5, 10);
      y += 4;
    }

    // ============ FOOTER LEGAL ============
    checkPageBreak(30);
    y += 5;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    const disclaimer = 'Este documento es un registro fiel del intercambio entre Vortiz Arquitectos y el cliente en la fecha señalada. Los mensajes se conservan tal como fueron enviados y no han sido modificados. Este archivo puede utilizarse como respaldo interno de la relación con el cliente.';
    drawWrapped(disclaimer, pageWidth - margin * 2, 4, 7);

    y += 3;
    doc.setFontSize(7);
    doc.text(`Documento generado automáticamente por el sistema Vortiz — ${new Date().toLocaleString('es-MX')}`, margin, y);

    // ============ NÚMEROS DE PÁGINA ============
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }

    // ============ DESCARGAR ============
    const nombreArchivo = `snapshot-${s.id}-${s.clienteSnapshot.nombre.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    doc.save(nombreArchivo);
  }

  metodoLabel(metodo: string): string {
    const map: Record<string, string> = {
      email: 'por correo',
      whatsapp: 'por WhatsApp',
      guardado: 'nota interna',
      inbound: 'respuesta del cliente',
    };
    return map[metodo] || metodo || 'sin especificar';
  }

  // Eliminar snapshot con confirmación
  snapshotAEliminar: ConsultaSnapshot | null = null;

  pedirEliminarSnapshot(s: ConsultaSnapshot) {
    this.snapshotAEliminar = s;
  }

  cancelarEliminarSnapshot() {
    this.snapshotAEliminar = null;
  }

  confirmarEliminarSnapshot() {
    if (!this.snapshotAEliminar) return;
    const id = this.snapshotAEliminar.id;
    this.snapshotsService.eliminar(id).subscribe({
      next: () => {
        this.snapshots = this.snapshots.filter((s) => s.id !== id);
        if (this.snapshotSeleccionado?.id === id) {
          this.snapshotSeleccionado = null;
        }
        this.snapshotAEliminar = null;
        this.mostrarFlashSnapshot('✓ Snapshot eliminado');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error eliminando snapshot:', err);
        this.snapshotAEliminar = null;
        this.mostrarFlashSnapshot('⚠ No se pudo eliminar');
        this.cdr.detectChanges();
      },
    });
  }
  estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      completada: 'Completada',
      cancelada: 'Cancelada',
    };
    return map[estado] || estado;
  }

  estadoColor(estado: string): string {
    if (estado === 'confirmada') return 'bg-green-50 text-green-700';
    if (estado === 'completada') return 'bg-blue-50 text-blue-700';
    if (estado === 'cancelada') return 'bg-red-50 text-red-700';
    return 'bg-amber-50 text-amber-700'; // pendiente (default)
  }
}
