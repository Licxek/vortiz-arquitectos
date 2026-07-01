import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ContenidoService } from '../../core/services/contenido.service';
import { CatalogoService, Servicio } from '../../core/services/catalogo.service';
import { CitasService } from '../../core/services/citas.service';
import { FormatoTextoPipe } from '../../shared/pipes/formato-texto.pipe';
import { TelefonoInputComponent } from '../../shared/telefono-input/telefono-input.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { ConfiguracionService } from '../../core/services/configuracion.service';

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
  private configuracionService = inject(ConfiguracionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  servicios = this.catalogo.servicios;

  // 👇 NUEVO: config de agenda (días no laborales + feriados) para validar fecha
  // 👇 Config completa pública (usada para contacto, horario, etc.)
  configuracion: any = null;

  // 👇 NUEVO: config de agenda (días no laborales + feriados) para validar fecha
  configAgenda: {
    diasSemana?: { nombre: string; activo: boolean }[];
    diasFeriados?: { fecha: string; motivo: string }[];
    horaInicio?: string;
    horaFin?: string;
  } | null = null;

  // 👇 NUEVO: mensaje de advertencia si la fecha elegida no es válida
  advertenciaFecha = signal<string>('');
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

  horasDisponibles = signal<string[]>([]);

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
      f.hora.length > 0 &&
      this.advertenciaFecha() === ''
    );
  });

  etiquetaCategoria(cat: string): string {
    return this.catalogo.etiquetaCategoriaServicio(cat);
  }

  actualizarForm<K extends keyof FormCita>(campo: K, valor: FormCita[K]) {
    this.form.update((f) => ({ ...f, [campo]: valor }));

    // Si cambia la fecha, validar contra agenda + recargar horas ocupadas
    if (campo === 'fecha') {
      this.advertenciaFecha.set(this.validarFecha(valor as string));
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

    this.configuracionService.configPublica$.subscribe((c) => {
      if (c) {
        this.configuracion = c;
        console.log('🔍 Config pública recibida:', c); // 👈 TEMPORAL para debug
        if (c.agenda) {
          this.configAgenda = c.agenda;
          if (this.form().fecha) {
            this.advertenciaFecha.set(this.validarFecha(this.form().fecha));
          }
        }
      }
    });
    this.configuracionService.cargarPublica();

    // 🎯 Scroll a sección si viene ?seccion=X del buscador
    this.route.queryParams.subscribe((params) => {
      const seccion = params['seccion'];
      if (!seccion) return;
      setTimeout(() => {
        const el = document.getElementById(`seccion-${seccion}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Limpiar el query param para que no scrollee otra vez al recargar
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { seccion: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }, 600);
    });
  }

  // Al inicio de la clase, junto a los otros signals
  horasOcupadas = signal<string[]>([]);
  cargandoHoras = signal(false);

  // Computed que combina las horas disponibles con las ocupadas
  horasDisponiblesConEstado = computed(() => {
    const ocupadas = this.horasOcupadas();
    return this.horasDisponibles().map((h) => ({
      hora: h,
      ocupada: ocupadas.includes(h),
    }));
  });

  // Método para cargar horas ocupadas cuando cambia la fecha
  private cargarHorasOcupadas(fecha: string) {
    if (!fecha) {
      this.horasOcupadas.set([]);
      this.horasDisponibles.set([]);
      return;
    }
    this.cargandoHoras.set(true);
    this.citas.obtenerHorariosOcupados(fecha).subscribe({
      next: ({ todas, ocupadas }) => {
        this.horasDisponibles.set(todas);
        this.horasOcupadas.set(ocupadas);
        this.cargandoHoras.set(false);
        // Si la hora seleccionada ya no existe o está ocupada, deseleccionarla
        const horaActual = this.form().hora;
        if (horaActual && (!todas.includes(horaActual) || ocupadas.includes(horaActual))) {
          this.actualizarForm('hora', '');
        }
      },
      error: () => {
        this.cargandoHoras.set(false);
        this.horasOcupadas.set([]);
        this.horasDisponibles.set([]);
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
  /** Valida si una fecha es laboral y no es feriado. Devuelve mensaje o '' si es válida. */
  validarFecha(fecha: string): string {
    if (!fecha || !this.configAgenda) return '';

    const d = new Date(fecha + 'T00:00:00');

    // Fecha pasada (redundante con [min] del input, pero por seguridad)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (d.getTime() < hoy.getTime()) {
      return 'No puedes agendar citas en fechas pasadas. Elige hoy o un día futuro.';
    }

    // Día de la semana no laboral
    const idx = d.getDay();
    const mapDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const nombreDia = mapDias[idx];
    const diaConfig = this.configAgenda.diasSemana?.find((ds) => ds.nombre === nombreDia);
    if (diaConfig && !diaConfig.activo) {
      return `Lo sentimos, no atendemos los ${nombreDia.toLowerCase()}. Por favor elige otro día.`;
    }

    // Día feriado / vacaciones (con soporte de recurrentes)
    const feriado = this.configAgenda.diasFeriados?.find((f: any) => {
      if (f.recurrente) {
        // Comparar solo mes-día (MM-DD), ignorar el año
        return f.fecha?.substring(5) === fecha?.substring(5);
      }
      return f.fecha === fecha;
    });
    if (feriado) {
      return `📅 ${feriado.motivo}. Ese día estamos cerrados, elige otra fecha.`;
    }

    return '';
  }

  /**
   * Agrupa días laborales de forma inteligente:
   * - Si todos los días activos entre Lun-Vie comparten el MISMO horario, se muestran juntos
   * - Sábado y Domingo siempre por separado (suelen tener horarios distintos)
   * - Si algún día tiene horario propio distinto al resto, se separa automáticamente
   */
  get horariosAgrupados(): {
    label: string;
    activo: boolean;
    horaInicio: string;
    horaFin: string;
  }[] {
    const dias: any[] = this.configAgenda?.diasSemana || [];
    const globalInicio = this.configAgenda?.horaInicio || '09:00';
    const globalFin = this.configAgenda?.horaFin || '18:00';

    // Helper: obtiene el horario efectivo de un día (propio o general)
    const horarioDe = (d: any): { inicio: string; fin: string } => ({
      inicio: d.horaInicio || globalInicio,
      fin: d.horaFin || globalFin,
    });

    if (dias.length !== 7) {
      return dias.map((d) => {
        const h = horarioDe(d);
        return { label: d.nombre, activo: d.activo, horaInicio: h.inicio, horaFin: h.fin };
      });
    }

    const lunVie = dias.slice(0, 5);
    const sab = dias[5];
    const dom = dias[6];

    // Agrupar Lun-Vie SOLO si todos tienen el mismo activo Y el mismo horario
    const todosLunVieIguales = lunVie.every((d) => {
      const primero = lunVie[0];
      const hd = horarioDe(d);
      const hp = horarioDe(primero);
      return d.activo === primero.activo && hd.inicio === hp.inicio && hd.fin === hp.fin;
    });

    const result: {
      label: string;
      activo: boolean;
      horaInicio: string;
      horaFin: string;
    }[] = [];

    if (todosLunVieIguales) {
      const h = horarioDe(lunVie[0]);
      result.push({
        label: 'Lunes a viernes',
        activo: lunVie[0].activo,
        horaInicio: h.inicio,
        horaFin: h.fin,
      });
    } else {
      lunVie.forEach((d) => {
        const h = horarioDe(d);
        result.push({
          label: d.nombre,
          activo: d.activo,
          horaInicio: h.inicio,
          horaFin: h.fin,
        });
      });
    }

    const hSab = horarioDe(sab);
    result.push({
      label: 'Sábado',
      activo: sab.activo,
      horaInicio: hSab.inicio,
      horaFin: hSab.fin,
    });

    const hDom = horarioDe(dom);
    result.push({
      label: 'Domingo',
      activo: dom.activo,
      horaInicio: hDom.inicio,
      horaFin: hDom.fin,
    });

    return result;
  }

  /** Número de WhatsApp desde config pública, con fallback al teléfono */
  get whatsappNumero(): string {
    return this.configuracion?.whatsapp || this.configuracion?.telefono || '+52 618 000 0000';
  }

  /** Correo público (snake_case en endpoint público) */
  get correoPublicoConfig(): string {
    return this.configuracion?.correo_contacto || 'info@vortizarquitectos.com';
  }

  /** Construye URL de WhatsApp */
  get whatsappContactoUrl(): string {
    const wa = this.whatsappNumero;
    const cleaned = wa.replace(/\D/g, '');
    if (!cleaned) return '#';
    const numero = cleaned.length === 10 ? `52${cleaned}` : cleaned;
    return `https://wa.me/${numero}`;
  }

  /** Dirección completa concatenada */
  direccionCompleta(): string {
    const partes = [
      this.configuracion?.direccion,
      this.configuracion?.ciudad,
      this.configuracion?.estado,
      this.configuracion?.codigo_postal,
    ].filter((p) => p && String(p).trim().length > 0);
    return partes.length > 0 ? partes.join(', ') : 'Milpillas 101, La Forestal, Durango';
  }
}
