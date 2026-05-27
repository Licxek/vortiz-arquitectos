import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
  nombre: string;
  iniciales: string;
  logoUrl?: string;
  categoria: string;
  ubicacion: string;
  anio: number;
  colorMarca: string;
  descripcion?: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);
  private baseServicios = `${environment.apiUrl}/servicios`;

  // Servicios reactivos (vienen de la base)
  servicios = signal<Servicio[]>([]);

  constructor() {
    this.cargarServicios();
  }

  cargarServicios() {
    this.http.get<Servicio[]>(this.baseServicios).subscribe({
      next: (lista) => this.servicios.set(lista),
      error: () => this.servicios.set([]),
    });
  }

  // Compatibilidad: devuelve el valor actual de la señal (lo usa Páginas)
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

  etiquetaCategoriaServicio(cat: string): string {
    const map: Record<string, string> = {
      tramites: 'Trámites',
      gerencia: 'Gerencia',
      diseno: 'Diseño',
      construccion: 'Construcción',
      especiales: 'Especiales',
    };
    return map[cat] || cat;
  }

  // ===== Proyectos (aún quemados; los pasamos a la base en el siguiente paso) =====
  proyectos: Proyecto[] = [
    {
      nombre: 'Toyota',
      iniciales: 'TY',
      logoUrl: '/assets/img/icons/logoToyota.ico',
      categoria: 'corporativo',
      ubicacion: 'Guanajuato',
      anio: 2018,
      colorMarca: '#EB0A1E',
      descripcion: 'Planta automotriz y áreas corporativas.',
    },
    {
      nombre: 'Bancomer',
      iniciales: 'BX',
      logoUrl: '/assets/img/icons/logoBBVA.ico',
      categoria: 'corporativo',
      ubicacion: 'Durango',
      anio: 2015,
      colorMarca: '#004481',
      descripcion: 'Remodelación de sucursales bancarias.',
    },
    {
      nombre: 'Aeropuerto de Cancún',
      iniciales: 'AC',
      logoUrl: '/assets/img/icons/logoAirport.ico',
      categoria: 'infraestructura',
      ubicacion: 'Quintana Roo',
      anio: 2019,
      colorMarca: '#00A859',
      descripcion: 'Ampliación de terminal de pasajeros.',
    },
    {
      nombre: 'Puente Baluarte',
      iniciales: 'PB',
      logoUrl: '/assets/img/icons/logoPuente.ico',
      categoria: 'infraestructura',
      ubicacion: 'Durango–Sinaloa',
      anio: 2012,
      colorMarca: '#6B7280',
      descripcion: 'Obra hidráulica complementaria.',
    },
    {
      nombre: 'COFICAB',
      iniciales: 'CF',
      logoUrl: '/assets/img/icons/logoCoficab.svg',
      categoria: 'industrial',
      ubicacion: 'Aguascalientes',
      anio: 2020,
      colorMarca: '#0066B3',
      descripcion: 'Nave industrial y oficinas.',
    },
    {
      nombre: 'CA Automotive',
      iniciales: 'CA',
      logoUrl: '/assets/img/icons/logoCA.ico',
      categoria: 'industrial',
      ubicacion: 'Durango',
      anio: 2021,
      colorMarca: '#1F2937',
      descripcion: 'Planta y centro de distribución.',
    },
    {
      nombre: 'Casas Geo',
      iniciales: 'CG',
      logoUrl: '/assets/img/icons/logoCasas.ico',
      categoria: 'residencial',
      ubicacion: 'Varios estados',
      anio: 2017,
      colorMarca: '#7DC242',
      descripcion: 'Fraccionamientos residenciales.',
    },
    {
      nombre: 'Paseo Durango',
      iniciales: 'PD',
      logoUrl: '/assets/img/icons/logoPaseo.ico',
      categoria: 'comercial',
      ubicacion: 'Durango',
      anio: 2016,
      colorMarca: '#F59E0B',
      descripcion: 'Plaza comercial y entretenimiento.',
    },
    {
      nombre: 'Ecocab',
      iniciales: 'EC',
      logoUrl: '/assets/img/icons/logoEcocab.ico',
      categoria: 'industrial',
      ubicacion: 'Durango',
      anio: 2019,
      colorMarca: '#10B981',
      descripcion: 'Planta de manufactura eléctrica.',
    },
    {
      nombre: 'Fanosa',
      iniciales: 'FN',
      logoUrl: '/assets/img/icons/logoFanosa.ico',
      categoria: 'industrial',
      ubicacion: 'Durango',
      anio: 2022,
      colorMarca: '#DC2626',
      descripcion: 'Almacenes y áreas operativas.',
    },
    {
      nombre: 'Centro Penitenciario',
      iniciales: 'CP',
      logoUrl: '/assets/img/icons/logoPrision.ico',
      categoria: 'institucional',
      ubicacion: 'Durango',
      anio: 2014,
      colorMarca: '#374151',
      descripcion: 'Infraestructura institucional.',
    },
  ];
  getProyectos(): Proyecto[] {
    return this.proyectos;
  }

  etiquetaCategoriaProyecto(cat: string): string {
    const map: Record<string, string> = {
      corporativo: 'Corporativo',
      industrial: 'Industrial',
      comercial: 'Comercial',
      residencial: 'Residencial',
      infraestructura: 'Infraestructura',
      institucional: 'Institucional',
    };
    return map[cat] || cat;
  }

  sincronizarServicios(lista: Partial<Servicio>[]) {
    return this.http.put<Servicio[]>(`${this.baseServicios}/sync`, lista);
  }
}
