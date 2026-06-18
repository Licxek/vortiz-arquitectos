import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ContenidoService } from '../../core/services/contenido.service';
import { CatalogoService, Servicio } from '../../core/services/catalogo.service';
import { CitasService } from '../../core/services/citas.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe';
import { TelefonoInputComponent } from '../../shared/telefono-input/telefono-input.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

interface FormCita {
  nombreCompleto: string;
  correo: string;
  telefono: string;
  tipo: 'consulta' | 'proyecto' | null;
  servicioId: number | null;
  motivo: string;
  fecha: string;
  hora: string;
}

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FormatoTextoPipe,
    TelefonoInputComponent,
    SkeletonComponent,
  ],
  templateUrl: './citas.component.html',
})
export class CitasComponent implements OnInit {
  private contenidoService = inject(ContenidoService);
  private catalogo = inject(CatalogoService);
  private citas = inject(CitasService);

  servicios = this.catalogo.servicios;

  // ============ HERO ============
  heroBadge = '';
  heroTitulo = '';
  heroDescripcion = '';

  // ============ BENEFICIOS ============
  benefTitulo = '';
  benef1 = '';
  benef2 = '';
  benef3 = '';
  benef4 = '';

  // ============ HORARIOS ============
  horarioLunVie = '';
  horarioSabado = '';
  horarioDomingo = '';

  form = signal<FormCita>({
    nombreCompleto: '',
    correo: '',
    telefono: '',
    tipo: null,
    servicioId: null,
    motivo: '',
    fecha: '',
    hora: '',
  });

  enviando = signal(false);
  enviado = signal(false);
  errorEnvio = signal<string | null>(null);
  mostrarSelectorServicio = signal(false);

  horasDisponibles = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
  ];

  servicioSeleccionado = computed<Servicio | null>(() => {
    const id = this.form().servicioId;
    return id ? (this.servicios().find((s) => s.id === id) ?? null) : null;
  });

  /** Etiqueta legible del tipo de cita */
  tipoLabel = computed<string>(() => {
    return this.form().tipo === 'proyecto' ? 'proyecto específico' : 'consulta inicial';
  });

  /** Fecha formateada para el estado de éxito (ej: "sábado 21 de junio") */
  fechaFormateadaExito = computed<string>(() => {
    const f = this.form().fecha;
    if (!f) return '';
    try {
      const d = new Date(f + 'T00:00:00');
      const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
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
      return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
    } catch {
      return f;
    }
  });

  /** Detecta si el cliente está en otra zona horaria distinta a México (UTC-6) */
  clienteEsExtranjero = computed<boolean>(() => {
    const tzCliente = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzsMexico = [
      'America/Mexico_City',
      'America/Monterrey',
      'America/Chihuahua',
      'America/Bahia_Banderas',
      'America/Hermosillo',
      'America/Mazatlan',
      'America/Cancun',
      'America/Merida',
      'America/Matamoros',
      'America/Ojinaga',
    ];
    return !tzsMexico.includes(tzCliente);
  });

  /** Convierte la fecha+hora de Durango (UTC-6) a la TZ del cliente */
  horaEnTuPais = computed<string>(() => {
    const f = this.form();
    if (!f.fecha || !f.hora || !this.clienteEsExtranjero()) return '';

    try {
      const tzCliente = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Asumimos UTC-6 (hora Durango). Si la cita está en hora de verano, usar -05:00
      const fechaCita = new Date(`${f.fecha}T${f.hora}:00-06:00`);
      return fechaCita.toLocaleString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tzCliente,
      });
    } catch {
      return '';
    }
  });

  /** Devuelve la zona horaria del cliente en formato legible: "Madrid", "New York" */
  tzClienteNombre = computed<string>(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      return tz.split('/').pop()?.replace(/_/g, ' ') || tz;
    } catch {
      return tz;
    }
  });

  fechaMinima = new Date().toISOString().split('T')[0];

  formValido = computed(() => {
    const f = this.form();
    return (
      f.nombreCompleto.trim().length >= 3 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo) &&
      f.telefono.trim().length >= 7 &&
      f.tipo !== null &&
      (f.tipo !== 'proyecto' || f.servicioId !== null) &&
      f.fecha.length > 0 &&
      f.hora.length > 0
    );
  });

  etiquetaCategoria(cat: string): string {
    return this.catalogo.etiquetaCategoriaServicio(cat);
  }

  actualizarForm<K extends keyof FormCita>(campo: K, valor: FormCita[K]) {
    this.form.update((f) => ({ ...f, [campo]: valor }));

    // 👇 NUEVO: si cambia la fecha, recargar horas ocupadas
    if (campo === 'fecha') {
      this.cargarHorasOcupadas(valor as string);
    }
  }

  seleccionarTipo(tipo: 'consulta' | 'proyecto') {
    this.actualizarForm('tipo', tipo);
    if (tipo === 'consulta') this.actualizarForm('servicioId', null);
  }

  seleccionarServicio(id: number) {
    this.actualizarForm('servicioId', id);
    this.mostrarSelectorServicio.set(false);
  }

  toggleSelectorServicio() {
    this.mostrarSelectorServicio.update((v) => !v);
  }

  cerrarSelectorServicio() {
    this.mostrarSelectorServicio.set(false);
  }

  enviarFormulario() {
    if (!this.formValido()) return;
    this.enviando.set(true);
    this.errorEnvio.set(null);

    const f = this.form();
    const payload = {
      nombre: f.nombreCompleto.trim(),
      correo: f.correo.trim(),
      telefono: f.telefono.trim(),
      tipo: f.tipo as 'consulta' | 'proyecto',
      servicioId: f.tipo === 'proyecto' ? f.servicioId : null,
      motivo: f.motivo.trim(),
      fecha: f.fecha,
      hora: f.hora,
    };

    this.citas.crear(payload).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
      error: (err) => {
        this.enviando.set(false);
        this.errorEnvio.set(
          err?.error?.message || 'Hubo un problema al enviar tu solicitud. Inténtalo de nuevo.',
        );
      },
    });
  }

  agendarOtra() {
    this.form.set({
      nombreCompleto: '',
      correo: '',
      telefono: '',
      tipo: null,
      servicioId: null,
      motivo: '',
      fecha: '',
      hora: '',
    });
    this.enviado.set(false);
    this.errorEnvio.set(null);
  }

  ngOnInit() {
    // HERO
    this.heroBadge = this.contenidoService.getCampo('citas', 'hero', 'badge');
    this.heroTitulo = this.contenidoService.getCampo('citas', 'hero', 'titulo');
    this.heroDescripcion = this.contenidoService.getCampo('citas', 'hero', 'descripcion');

    // BENEFICIOS
    this.benefTitulo = this.contenidoService.getCampo('citas', 'beneficios', 'titulo');
    this.benef1 = this.contenidoService.getCampo('citas', 'beneficios', 'beneficio1');
    this.benef2 = this.contenidoService.getCampo('citas', 'beneficios', 'beneficio2');
    this.benef3 = this.contenidoService.getCampo('citas', 'beneficios', 'beneficio3');
    this.benef4 = this.contenidoService.getCampo('citas', 'beneficios', 'beneficio4');

    // HORARIOS
    this.horarioLunVie = this.contenidoService.getCampo('citas', 'horarios', 'lunVie');
    this.horarioSabado = this.contenidoService.getCampo('citas', 'horarios', 'sabado');
    this.horarioDomingo = this.contenidoService.getCampo('citas', 'horarios', 'domingo');
  }

  // Al inicio de la clase, junto a los otros signals
  horasOcupadas = signal<string[]>([]);
  cargandoHoras = signal(false);

  // Computed que combina las horas disponibles con las ocupadas
  horasDisponiblesConEstado = computed(() => {
    const ocupadas = this.horasOcupadas();
    return this.horasDisponibles.map((h) => ({
      hora: h,
      ocupada: ocupadas.includes(h),
    }));
  });

  // Método para cargar horas ocupadas cuando cambia la fecha
  private cargarHorasOcupadas(fecha: string) {
    if (!fecha) {
      this.horasOcupadas.set([]);
      return;
    }
    this.cargandoHoras.set(true);
    this.citas.obtenerHorariosOcupados(fecha).subscribe({
      next: (ocupadas) => {
        this.horasOcupadas.set(ocupadas);
        this.cargandoHoras.set(false);
        // Si la hora seleccionada está ahora ocupada, deseleccionarla
        if (this.form().hora && ocupadas.includes(this.form().hora)) {
          this.actualizarForm('hora', '');
        }
      },
      error: () => {
        this.cargandoHoras.set(false);
        this.horasOcupadas.set([]);
      },
    });
  }

  /** Email tiene formato válido */
  emailValido = computed<boolean>(() => {
    const correo = this.form().correo.trim();
    if (!correo) return false; // vacío = no mostrar nada
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  });

  /** Email tiene contenido pero NO es válido (mostrar tacha roja) */
  emailInvalido = computed<boolean>(() => {
    const correo = this.form().correo.trim();
    return correo.length > 0 && !this.emailValido();
  });

  /** Clase del borde del input según estado del email */
  emailBorderClass = computed<string>(() => {
    if (this.emailValido()) return 'border-green-300 focus:border-green-500';
    if (this.emailInvalido()) return 'border-red-300 focus:border-red-500';
    return 'border-gray-200 focus:border-[#0a4d7a]';
  });

  /** Formatea minutos a texto legible: 30→"30 min", 60→"1 hora", 90→"1h 30min" */
  formatearDuracion(min: number | null | undefined): string {
    if (!min || min < 1) return '';
    if (min < 60) return `${min} min`;
    const horas = Math.floor(min / 60);
    const restoMin = min % 60;
    if (restoMin === 0) return horas === 1 ? '1 hora' : `${horas} horas`;
    return `${horas}h ${restoMin}min`;
  }
}
