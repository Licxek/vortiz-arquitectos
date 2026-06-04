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
  imports: [CommonModule, FormsModule, RouterModule, FormatoTextoPipe, TelefonoInputComponent, SkeletonComponent],
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
    '09:00', '10:00', '11:00', '12:00', '13:00',
    '15:00', '16:00', '17:00', '18:00',
  ];

  servicioSeleccionado = computed<Servicio | null>(() => {
    const id = this.form().servicioId;
    return id ? this.servicios().find((s) => s.id === id) ?? null : null;
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
          err?.error?.message ||
            'Hubo un problema al enviar tu solicitud. Inténtalo de nuevo.',
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
}
