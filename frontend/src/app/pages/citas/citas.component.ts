import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface ServicioOpcion {
  id: number;
  titulo: string;
  categoria: string;
  icono: string;
}

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
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './citas.component.html',
})
export class CitasComponent {

  form = signal<FormCita>({
    nombreCompleto: '',
    correo: '',
    telefono: '',
    tipo: null,
    servicioId: null,
    motivo: '',
    fecha: '',
    hora: ''
  });

  enviando = signal(false);
  enviado = signal(false);
  mostrarSelectorServicio = signal(false);

  // Mismos servicios que en la página de servicios
  servicios: ServicioOpcion[] = [
    { id: 1, titulo: 'Trámite relacionados a desarrollo urbano', categoria: 'Trámites', icono: 'document' },
    { id: 2, titulo: 'Gerencia de Construcción y DRO', categoria: 'Trámites', icono: 'badge' },
    { id: 3, titulo: 'Gerencia de proyectos', categoria: 'Gerencia', icono: 'users' },
    { id: 4, titulo: 'Supervisión de Proyectos de construcción', categoria: 'Gerencia', icono: 'eye' },
    { id: 5, titulo: 'Diseño y Modelado BIM', categoria: 'Diseño', icono: 'cube' },
    { id: 6, titulo: 'Dictámenes de uso de suelo', categoria: 'Trámites', icono: 'map' },
    { id: 7, titulo: 'Dictamen Estructural', categoria: 'Diseño', icono: 'structure' },
    { id: 8, titulo: 'Proyectos de áreas verdes', categoria: 'Especiales', icono: 'leaf' },
    { id: 9, titulo: 'Sistemas de riego automatizado', categoria: 'Especiales', icono: 'water' },
    { id: 10, titulo: 'Proyectos de alumbrado público', categoria: 'Especiales', icono: 'bulb' },
    { id: 11, titulo: 'Construcción Residencial', categoria: 'Construcción', icono: 'home' },
    { id: 12, titulo: 'Construcción Industrial', categoria: 'Construcción', icono: 'factory' },
    { id: 13, titulo: 'Consultoría para tu proyecto de construcción', categoria: 'Diseño', icono: 'chat' },
    { id: 14, titulo: 'Asesoría en Licitaciones y Costos', categoria: 'Gerencia', icono: 'calculator' },
  ];

  horasDisponibles = ['09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00'];

  servicioSeleccionado = computed(() => {
    const id = this.form().servicioId;
    return id ? this.servicios.find(s => s.id === id) : null;
  });

  fechaMinima = new Date().toISOString().split('T')[0];

  formValido = computed(() => {
    const f = this.form();
    return f.nombreCompleto.trim().length >= 3
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo)
      && f.telefono.trim().length >= 7
      && f.tipo !== null
      && (f.tipo !== 'proyecto' || f.servicioId !== null)
      && f.fecha.length > 0
      && f.hora.length > 0;
  });

  actualizarForm<K extends keyof FormCita>(campo: K, valor: FormCita[K]) {
    this.form.update(f => ({ ...f, [campo]: valor }));
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
    this.mostrarSelectorServicio.update(v => !v);
  }

  cerrarSelectorServicio() {
    this.mostrarSelectorServicio.set(false);
  }

  enviarFormulario() {
    if (!this.formValido()) return;
    this.enviando.set(true);

    // Simulación. Luego conectas al backend con CitasService.crear(this.form())
    setTimeout(() => {
      this.enviando.set(false);
      this.enviado.set(true);
    }, 1500);
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
      hora: ''
    });
    this.enviado.set(false);
  }
}
