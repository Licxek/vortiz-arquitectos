import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Proyecto {
  nombre: string;
  iniciales: string;
  logoUrl?: string;
  categoria: 'corporativo' | 'industrial' | 'comercial' | 'residencial' | 'infraestructura' | 'institucional';
  ubicacion: string;
  anio: number;
  colorMarca: string;
  descripcion?: string;
}

interface CategoriaFiltro {
  id: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './proyectos.component.html',
})
export class ProyectosComponent {

  filtroActivo = signal<string>('todos');
  busqueda = signal<string>('');

  proyectos: Proyecto[] = [
    { nombre: 'Toyota', iniciales: 'TY',logoUrl: '/assets/img/logoToyota.ico', categoria: 'corporativo', ubicacion: 'Guanajuato', anio: 2018, colorMarca: '#EB0A1E', descripcion: 'Planta automotriz y áreas corporativas.' },
    { nombre: 'Bancomer', iniciales: 'BX', categoria: 'corporativo', ubicacion: 'Durango', anio: 2015, colorMarca: '#004481', descripcion: 'Remodelación de sucursales bancarias.' },
    { nombre: 'Aeropuerto de Cancún', iniciales: 'AC', categoria: 'infraestructura', ubicacion: 'Quintana Roo', anio: 2019, colorMarca: '#00A859', descripcion: 'Ampliación de terminal de pasajeros.' },
    { nombre: 'Puente Baluarte', iniciales: 'PB', categoria: 'infraestructura', ubicacion: 'Durango–Sinaloa', anio: 2012, colorMarca: '#6B7280', descripcion: 'Obra hidráulica complementaria.' },
    { nombre: 'COFICAB', iniciales: 'CF', categoria: 'industrial', ubicacion: 'Aguascalientes', anio: 2020, colorMarca: '#0066B3', descripcion: 'Nave industrial y oficinas.' },
    { nombre: 'CA Automotive', iniciales: 'CA', categoria: 'industrial', ubicacion: 'Durango', anio: 2021, colorMarca: '#1F2937', descripcion: 'Planta y centro de distribución.' },
    { nombre: 'Casas Geo', iniciales: 'CG', categoria: 'residencial', ubicacion: 'Varios estados', anio: 2017, colorMarca: '#7DC242', descripcion: 'Fraccionamientos residenciales.' },
    { nombre: 'Paseo Durango', iniciales: 'PD', categoria: 'comercial', ubicacion: 'Durango', anio: 2016, colorMarca: '#F59E0B', descripcion: 'Plaza comercial y entretenimiento.' },
    { nombre: 'Ecocab', iniciales: 'EC', categoria: 'industrial', ubicacion: 'Durango', anio: 2019, colorMarca: '#10B981', descripcion: 'Planta de manufactura eléctrica.' },
    { nombre: 'Fanosa', iniciales: 'FN', categoria: 'industrial', ubicacion: 'Durango', anio: 2022, colorMarca: '#DC2626', descripcion: 'Almacenes y áreas operativas.' },
    { nombre: 'Centro Penitenciario', iniciales: 'CP', categoria: 'institucional', ubicacion: 'Durango', anio: 2014, colorMarca: '#374151', descripcion: 'Infraestructura institucional.' }
  ];

  categorias = computed<CategoriaFiltro[]>(() => {
    const cats = ['corporativo', 'industrial', 'comercial', 'residencial', 'infraestructura', 'institucional'];
    return [
      { id: 'todos', label: 'Todos', count: this.proyectos.length },
      ...cats.map(c => ({
        id: c,
        label: c.charAt(0).toUpperCase() + c.slice(1),
        count: this.proyectos.filter(p => p.categoria === c).length
      }))
    ];
  });

  proyectosFiltrados = computed(() => {
    let lista = this.proyectos;
    if (this.filtroActivo() !== 'todos') {
      lista = lista.filter(p => p.categoria === this.filtroActivo());
    }
    const q = this.busqueda().toLowerCase().trim();
    if (q) {
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.ubicacion.toLowerCase().includes(q)
      );
    }
    return lista;
  });

  cambiarFiltro(id: string) {
    this.filtroActivo.set(id);
  }

  actualizarBusqueda(event: Event) {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }
}
