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
  metodo?: 'email' | 'whatsapp' | 'guardado';
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
  private readonly STORAGE_CHAT = 'vortiz_consultas_chat';
  private idsResueltos = new Set<number>();
  private idsArchivados = new Set<number>();
  private chats: { [consultaId: number]: MensajeChat[] } = {};

  private bodyOverflowAnterior = '';

  ngOnInit() {
    this.bodyOverflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.cargarLocalStorage();
    this.cargar();
  }

  ngAfterViewInit() {
    setTimeout(() => this.ajustarAlturaCard(), 50);
    window.addEventListener('resize', this.ajustarAlturaCard);
  }

  private ajustarAlturaCard = () => {
    if (!this.cardContainer?.nativeElement) return;
    const el = this.cardContainer.nativeElement;
    // Reset temporal para medir el top real sin influencia de altura previa
    el.style.height = 'auto';
    const top = el.getBoundingClientRect().top;
    const viewport = window.innerHeight;
    const espacio = viewport - top - 16; // 16px de buffer al final
    if (espacio > 400) {
      el.style.height = `${espacio}px`;
    } else {
      el.style.height = '400px'; // mínimo razonable
    }
  };

  ngOnDestroy() {
    document.body.style.overflow = this.bodyOverflowAnterior;
    window.removeEventListener('resize', this.ajustarAlturaCard);
  }

  private cargarLocalStorage() {
    try {
      const r = localStorage.getItem(this.STORAGE_RESUELTAS);
      if (r) this.idsResueltos = new Set(JSON.parse(r));
      const a = localStorage.getItem(this.STORAGE_ARCHIVADAS);
      if (a) this.idsArchivados = new Set(JSON.parse(a));
      const c = localStorage.getItem(this.STORAGE_CHAT);
      if (c) this.chats = JSON.parse(c);
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
    const respuestasAdmin = this.chats[c.id] || [];
    const mensajeCliente: MensajeChat = {
      texto: c.mensaje,
      fecha: c.fechaCreacionRaw,
      autor: 'cliente',
    };
    return [mensajeCliente, ...respuestasAdmin].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );
  }

  seleccionar(c: Consulta) {
    this.consultaSeleccionada = c;
    this.respuestaTexto = '';
    this.scrollAlFondo();
  }

  volverALista() {
    this.consultaSeleccionada = null;
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
        this.guardarMensajeAdmin('email', texto);
        this.respuestaTexto = '';
        this.enviando = false;
        this.scrollAlFondo();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error enviando respuesta:', err);
        alert(
          'No se pudo enviar el mensaje. Verifica tu conexión o que el backend tenga el endpoint configurado.',
        );
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
      this.guardarMensajeAdmin('whatsapp', texto);
      this.respuestaTexto = '';
    }
    const mensaje = encodeURIComponent(
      texto ||
        `Hola ${c.nombre.split(' ')[0]}, te contacto de Vortiz Arquitectos en respuesta a tu consulta.`,
    );
    window.open(`https://wa.me/${tel}?text=${mensaje}`, '_blank');
    this.scrollAlFondo();
  }

  private guardarMensajeAdmin(metodo: 'email' | 'whatsapp' | 'guardado', texto: string) {
    if (!this.consultaSeleccionada) return;
    const id = this.consultaSeleccionada.id;
    if (!this.chats[id]) this.chats[id] = [];
    this.chats[id].push({
      texto,
      fecha: new Date().toISOString(),
      autor: 'admin',
      metodo,
    });
    this.guardarChats();
  }

  private guardarChats() {
    try {
      localStorage.setItem(this.STORAGE_CHAT, JSON.stringify(this.chats));
    } catch {}
  }

  private abrirWhatsApp(texto: string) {
    if (!this.consultaSeleccionada) return;
    const c = this.consultaSeleccionada;
    const tel = (c.telefono || '').replace(/\D/g, '');
    if (!tel) {
      alert('Esta consulta no tiene teléfono registrado.');
      return;
    }
    const mensaje = encodeURIComponent(
      texto ||
        `Hola ${c.nombre.split(' ')[0]}, te contacto de Vortiz Arquitectos en respuesta a tu consulta.`,
    );
    window.open(`https://wa.me/${tel}?text=${mensaje}`, '_blank');
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

}
