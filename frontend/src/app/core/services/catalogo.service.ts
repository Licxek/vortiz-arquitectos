import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface Servicio {
  id: number;
  titulo: string;
  descripcion: string;
  imagen: string;
  categoria: string;
  icono: string;
  orden?: number;
}

export interface Proyecto {
  id: number;
  nombre: string;
  iniciales: string;
  logoUrl?: string;
  categoria: string;
  ubicacion: string;
  anio: number;
  colorMarca: string;
  descripcion?: string;
  orden?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);
  private baseServicios = `${environment.apiUrl}/servicios`;
  private baseProyectos = `${environment.apiUrl}/proyectos`;

  // ===== Servicios =====
  servicios = signal<Servicio[]>([]);

  async precargar(): Promise<void> {
    await Promise.all([
      firstValueFrom(this.http.get<Servicio[]>(this.baseServicios))
        .then((l) => this.servicios.set(l))
        .catch(() => this.servicios.set([])),
      firstValueFrom(this.http.get<Proyecto[]>(this.baseProyectos))
        .then((l) => this.proyectos.set(l))
        .catch(() => this.proyectos.set([])),
    ]);
  }

  cargarServicios() {
    this.http.get<Servicio[]>(this.baseServicios).subscribe({
      next: (lista) => this.servicios.set(lista),
      error: () => this.servicios.set([]),
    });
  }

  getServicios(): Servicio[] {
    return this.servicios();
  }

  crearServicio(datos: Partial<Servicio>) {
    return this.http.post<Servicio>(this.baseServicios, datos);
  }
  actualizarServicio(id: number, datos: Partial<Servicio>) {
    return this.http.put<Servicio>(`${this.baseServicios}/${id}`, datos);
  }
  eliminarServicio(id: number) {
    return this.http.delete(`${this.baseServicios}/${id}`);
  }
  sincronizarServicios(lista: Partial<Servicio>[]) {
    return this.http.put<Servicio[]>(`${this.baseServicios}/sync`, lista);
  }

  etiquetaCategoriaServicio(cat: string): string {
    const map: Record<string, string> = { tramites: 'Trámites', gerencia: 'Gerencia', diseno: 'Diseño', construccion: 'Construcción', especiales: 'Especiales' };
    return map[cat] || cat;
  }

  // ===== Proyectos =====
  proyectos = signal<Proyecto[]>([]);

  cargarProyectos() {
    this.http.get<Proyecto[]>(this.baseProyectos).subscribe({
      next: (lista) => this.proyectos.set(lista),
      error: () => this.proyectos.set([]),
    });
  }

  getProyectos(): Proyecto[] {
    return this.proyectos();
  }

  crearProyecto(datos: Partial<Proyecto>) {
    return this.http.post<Proyecto>(this.baseProyectos, datos);
  }
  actualizarProyecto(id: number, datos: Partial<Proyecto>) {
    return this.http.put<Proyecto>(`${this.baseProyectos}/${id}`, datos);
  }
  eliminarProyecto(id: number) {
    return this.http.delete(`${this.baseProyectos}/${id}`);
  }
  sincronizarProyectos(lista: Partial<Proyecto>[]) {
    return this.http.put<Proyecto[]>(`${this.baseProyectos}/sync`, lista);
  }

  etiquetaCategoriaProyecto(cat: string): string {
    const map: Record<string, string> = { corporativo: 'Corporativo', industrial: 'Industrial', comercial: 'Comercial', residencial: 'Residencial', infraestructura: 'Infraestructura', institucional: 'Institucional' };
    return map[cat] || cat;
  }
}
