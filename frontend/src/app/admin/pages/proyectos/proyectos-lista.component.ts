import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  InicioService,
  ProyectoBackend,
} from '../../../core/services/inicio.service';
import { SkeletonComponent } from '../../../shared/skeleton/skeleton.component';
import { ImageCarouselComponent } from '../../../shared/image-carousel/image-carousel.component';

interface Proyecto {
  id: number;
  nombre: string;
  estado: string;
  fecha: string;
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

type Orden = 'recientes' | 'antiguos' | 'az';
type EstadoFiltro = 'todos' | 'En diseño' | 'En proceso' | 'En revisión' | 'Pausado' | 'Finalizado';

@Component({
  selector: 'app-proyectos-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SkeletonComponent,
    ImageCarouselComponent,
  ],
  templateUrl: './proyectos-lista.component.html',
})
export class ProyectosListaComponent implements OnInit {
  private inicioService = inject(InicioService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  proyectos: Proyecto[] = [];
  cargando = true;

  busqueda = '';
  filtroEstado: EstadoFiltro = 'todos';
  ordenamiento: Orden = 'recientes';

  estadosProyecto = ['En diseño', 'En proceso', 'En revisión', 'Pausado', 'Finalizado'];

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.inicioService.obtenerProyectosAdmin().subscribe({
      next: (lista) => {
        this.proyectos = lista.map((p) => this.mapearProyecto(p));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.proyectos = [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get proyectosFiltrados(): Proyecto[] {
    let resultado = this.proyectos;

    if (this.filtroEstado !== 'todos') {
      resultado = resultado.filter((p) => p.estado === this.filtroEstado);
    }

    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.cliente?.toLowerCase().includes(q) ||
          p.ubicacion?.toLowerCase().includes(q),
      );
    }

    if (this.ordenamiento === 'az') {
      resultado = [...resultado].sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (this.ordenamiento === 'antiguos') {
      resultado = [...resultado].reverse();
    }

    return resultado;
  }

  get stats() {
    const total = this.proyectos.length;
    const finalizados = this.proyectos.filter((p) => p.estado === 'Finalizado').length;
    const enProceso = this.proyectos.filter((p) => p.estado === 'En proceso').length;
    const enDiseno = this.proyectos.filter((p) => p.estado === 'En diseño').length;
    return { total, finalizados, enProceso, enDiseno };
  }

  abrirProyecto(p: Proyecto) {
    this.router.navigate(['/admin/proyectos', p.id]);
  }

  nuevoProyecto() {
    this.router.navigate(['/admin/proyectos', 'nuevo']);
  }

  imagenesDeProyecto(p: Proyecto): string[] {
    if (p.imagenes && p.imagenes.length > 0) return p.imagenes;
    if (p.imagen) return [p.imagen];
    return [];
  }

  limpiarFiltros() {
    this.busqueda = '';
    this.filtroEstado = 'todos';
    this.ordenamiento = 'recientes';
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
      fecha: this.formatearFechaCorta(p.updatedAt),
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

  formatearFechaCorta(iso?: string | Date | null): string {
    if (!iso) return '—';
    const d =
      typeof iso === 'string' ? new Date(iso.includes('T') ? iso : iso + 'T00:00:00') : iso;
    if (isNaN(d.getTime())) return '—';
    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  }
}
