import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  InicioService,
  ProyectoBackend,
} from '../../../core/services/inicio.service';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import { ImageCarouselComponent } from '../../../shared/image-carousel/image-carousel.component';
import { ImageGalleryInputComponent } from '../../../shared/image-gallery-input/image-gallery-input.component';

interface Proyecto {
  id: number;
  nombre: string;
  estado: string;
  imagen: string;
  imagenes: string[];
  cliente?: string;
  ubicacion?: string;
  superficie?: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaEntrega?: string;
  progreso?: number;
}

@Component({
  selector: 'app-proyectos-detalle',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SkeletonComponent,
    ImageCarouselComponent,
    ImageGalleryInputComponent,
  ],
  templateUrl: './proyectos-detalle.component.html',
})
export class ProyectosDetalleComponent implements OnInit {
  private inicioService = inject(InicioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  proyecto: Proyecto | null = null;
  esNuevo = false;
  modoEdicion = false;
  cargando = true;
  guardando = false;

  estadosProyecto = ['En diseño', 'En proceso', 'En revisión', 'Pausado', 'Finalizado'];

  // Modal eliminar
  mostrarConfirmarEliminar = false;
  eliminando = false;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id === 'nuevo') {
      this.esNuevo = true;
      this.modoEdicion = true;
      this.proyecto = this.proyectoVacio();
      this.cargando = false;
      this.cdr.detectChanges();
      return;
    }

    const numId = Number(id);
    if (!numId) {
      this.router.navigate(['/admin/proyectos']);
      return;
    }

    this.cargarProyecto(numId);
  }

  private cargarProyecto(id: number) {
    this.cargando = true;
    // Como no tienes endpoint individual, traemos todos y filtramos
    this.inicioService.obtenerProyectosAdmin().subscribe({
      next: (lista) => {
        const encontrado = lista.find((p) => p.id === id);
        if (!encontrado) {
          this.router.navigate(['/admin/proyectos']);
          return;
        }
        this.proyecto = this.mapearProyecto(encontrado);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.router.navigate(['/admin/proyectos']);
      },
    });
  }

  activarEdicion() {
    this.modoEdicion = true;
  }

  cancelarEdicion() {
    if (this.esNuevo) {
      this.router.navigate(['/admin/proyectos']);
      return;
    }
    this.modoEdicion = false;
    // Re-cargar el proyecto para descartar cambios
    if (this.proyecto?.id) this.cargarProyecto(this.proyecto.id);
  }

  guardar() {
    if (!this.proyecto || this.guardando) return;
    if (!this.proyecto.nombre.trim()) {
      alert('El nombre del proyecto es requerido.');
      return;
    }

    this.guardando = true;
    const payload = this.armarPayloadBackend(this.proyecto);

    if (this.esNuevo) {
      this.inicioService.crearProyecto(payload).subscribe({
        next: (creado) => {
          this.guardando = false;
          this.router.navigate(['/admin/proyectos', creado.id]);
        },
        error: () => {
          this.guardando = false;
          alert('Error al crear el proyecto. Intenta de nuevo.');
        },
      });
    } else {
      this.inicioService.actualizarProyecto(this.proyecto.id, payload).subscribe({
        next: (actualizado) => {
          this.proyecto = this.mapearProyecto(actualizado);
          this.modoEdicion = false;
          this.guardando = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.guardando = false;
          alert('Error al guardar. Intenta de nuevo.');
        },
      });
    }
  }

  solicitarEliminar() {
    this.mostrarConfirmarEliminar = true;
  }

  cerrarConfirmarEliminar() {
    this.mostrarConfirmarEliminar = false;
  }

  confirmarEliminar() {
    if (!this.proyecto || this.eliminando) return;
    this.eliminando = true;
    // Si tienes endpoint eliminar:
    // this.inicioService.eliminarProyecto(this.proyecto.id).subscribe(...)
    // Por ahora marcar como pendiente al backend
    alert('Función de eliminar pendiente de implementar en backend. Pásame el endpoint cuando lo tengas.');
    this.eliminando = false;
    this.mostrarConfirmarEliminar = false;
  }

  volver() {
    this.router.navigate(['/admin/proyectos']);
  }

  imagenesDelProyecto(): string[] {
    if (!this.proyecto) return [];
    if (this.proyecto.imagenes && this.proyecto.imagenes.length > 0) return this.proyecto.imagenes;
    if (this.proyecto.imagen) return [this.proyecto.imagen];
    return [];
  }

  private proyectoVacio(): Proyecto {
    return {
      id: 0,
      nombre: '',
      estado: 'En diseño',
      imagen: '',
      imagenes: [],
      cliente: '',
      ubicacion: '',
      superficie: '',
      descripcion: '',
      fechaEntrega: '',
      progreso: 0,
    };
  }

  private mapearProyecto(p: ProyectoBackend): Proyecto {
    const imagenes =
      Array.isArray(p.imagenes) && p.imagenes.length > 0
        ? p.imagenes
        : p.imagen
          ? [p.imagen]
          : [];
    return {
      id: p.id,
      nombre: p.nombre,
      estado: this.estadoLabel(p.estado),
      imagen: p.imagen || '',
      imagenes,
      cliente: p.cliente,
      ubicacion: p.ubicacion,
      superficie: p.superficie,
      descripcion: p.descripcion,
      fechaInicio: p.fechaInicio || '',
      fechaEntrega: p.fechaEntrega || '',
      progreso: p.progreso,
    };
  }

  private estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      en_diseno: 'En diseño',
      en_proceso: 'En proceso',
      en_revision: 'En revisión',
      pausado: 'Pausado',
      finalizado: 'Finalizado',
    };
    return map[estado] || estado;
  }

  private estadoBackend(label: string): string {
    const map: Record<string, string> = {
      'En diseño': 'en_diseno',
      'En proceso': 'en_proceso',
      'En revisión': 'en_revision',
      Pausado: 'pausado',
      Finalizado: 'finalizado',
    };
    return map[label] || 'en_diseno';
  }

  private armarPayloadBackend(p: Proyecto): Partial<ProyectoBackend> {
    const imagenes = (p.imagenes || []).filter((x) => !!x && x.trim().length > 0);
    return {
      nombre: (p.nombre || '').trim(),
      estado: this.estadoBackend(p.estado),
      cliente: (p.cliente || '').trim(),
      ubicacion: (p.ubicacion || '').trim(),
      superficie: (p.superficie || '').trim(),
      descripcion: (p.descripcion || '').trim(),
      progreso: Number(p.progreso) || 0,
      fechaInicio: p.fechaInicio || null,
      fechaEntrega: p.fechaEntrega || null,
      imagen: imagenes[0] || '',
      imagenes,
    };
  }

  formatearFechaCorta(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  }
}
