import { Injectable, inject } from '@angular/core';
import { CatalogoService } from './catalogo.service';
import { Pagina } from './paginas.service';

export interface ResultadoBusqueda {
  tipo: 'pagina' | 'servicio' | 'proyecto' | 'pagina-dinamica';
  titulo: string;
  descripcion?: string;
  ruta: string;
  queryParams?: Record<string, any>;
  badge?: string; // ej: "Proyecto", "Servicio"
}

interface PaginaFija {
  titulo: string;
  ruta: string;
  descripcion: string;
  keywords: string;
}

@Injectable({ providedIn: 'root' })
export class BusquedaService {
  private catalogo = inject(CatalogoService);

  private readonly STORAGE_RECIENTES = 'vortiz_busquedas_recientes';

  /** Páginas fijas con keywords ampliadas para mejor matching */
  private paginasFijas: PaginaFija[] = [
    {
      titulo: 'Inicio',
      ruta: '/',
      descripcion: 'Página principal de Vortiz Arquitectos',
      keywords: 'inicio home principal portada',
    },
    {
      titulo: 'Servicios',
      ruta: '/servicios',
      descripcion: 'Nuestros servicios profesionales de arquitectura',
      keywords: 'servicios diseño construcción gerencia trámites BIM',
    },
    {
      titulo: 'Proyectos',
      ruta: '/proyectos',
      descripcion: 'Portafolio de proyectos realizados',
      keywords: 'proyectos portafolio obras clientes trabajo realizado',
    },
    {
      titulo: 'Nosotros',
      ruta: '/nosotros',
      descripcion: 'Conoce a Vortiz Arquitectos y su trayectoria',
      keywords: 'nosotros sobre arquitecto historia equipo experiencia',
    },
    {
      titulo: 'Citas',
      ruta: '/citas',
      descripcion: 'Agenda una cita con nosotros',
      keywords: 'citas agendar contacto reunión consulta cotización',
    },
  ];

  /** Busca en todo el catálogo y devuelve resultados ordenados por relevancia. */
  buscar(query: string, paginasDinamicas: Pagina[] = []): ResultadoBusqueda[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const resultados: ResultadoBusqueda[] = [];

    // Páginas fijas
    for (const p of this.paginasFijas) {
      const texto = `${p.titulo} ${p.descripcion} ${p.keywords}`.toLowerCase();
      if (texto.includes(q)) {
        resultados.push({
          tipo: 'pagina',
          titulo: p.titulo,
          descripcion: p.descripcion,
          ruta: p.ruta,
          badge: 'Página',
        });
      }
    }

    // Servicios
    for (const s of this.catalogo.getServicios()) {
      const texto = `${s.titulo} ${s.descripcion || ''} ${s.categoria || ''}`.toLowerCase();
      if (texto.includes(q)) {
        resultados.push({
          tipo: 'servicio',
          titulo: s.titulo,
          descripcion: this.recortar(s.descripcion, 80),
          ruta: '/servicios',
          badge: this.catalogo.etiquetaCategoriaServicio(s.categoria),
        });
      }
    }

    // Proyectos
    for (const p of this.catalogo.getProyectos()) {
      const texto =
        `${p.nombre} ${p.descripcion || ''} ${p.categoria} ${p.cliente || ''} ${p.ubicacion || ''}`.toLowerCase();
      if (texto.includes(q)) {
        resultados.push({
          tipo: 'proyecto',
          titulo: p.nombre,
          descripcion: `${this.catalogo.etiquetaCategoriaProyecto(p.categoria)} · ${p.anio}`,
          ruta: '/proyectos',
          queryParams: { showcase: p.id },
          badge: 'Proyecto',
        });
      }
    }

    // Páginas dinámicas
    for (const p of paginasDinamicas) {
      if (p.titulo.toLowerCase().includes(q)) {
        resultados.push({
          tipo: 'pagina-dinamica',
          titulo: p.titulo,
          descripcion: 'Página personalizada',
          ruta: `/p/${p.slug}`,
          badge: 'Página',
        });
      }
    }

    return resultados.slice(0, 12);
  }

  private recortar(texto: string | undefined, n: number): string {
    if (!texto) return '';
    return texto.length > n ? texto.substring(0, n).trim() + '…' : texto;
  }

  // ===== Búsquedas recientes (localStorage) =====

  obtenerRecientes(): string[] {
    try {
      const data = JSON.parse(localStorage.getItem(this.STORAGE_RECIENTES) || '[]');
      if (!Array.isArray(data)) return [];

      // Filtrar solo strings válidos (defensivo contra basura previa)
      const limpios = data.filter((q): q is string => typeof q === 'string' && q.trim().length > 0);

      // Si filtramos algo, actualizar localStorage para limpiar la basura
      if (limpios.length !== data.length) {
        localStorage.setItem(this.STORAGE_RECIENTES, JSON.stringify(limpios));
      }

      return limpios;
    } catch {
      return [];
    }
  }

  guardarReciente(query: string) {
    // Validación defensiva: SOLO strings no vacíos
    if (!query || typeof query !== 'string' || !query.trim()) return;

    const recientes = this.obtenerRecientes();
    const filtradas = recientes.filter((q) => q.toLowerCase() !== query.toLowerCase());
    filtradas.unshift(query.trim());
    const top = filtradas.slice(0, 5);
    localStorage.setItem(this.STORAGE_RECIENTES, JSON.stringify(top));
  }

  eliminarReciente(query: string): string[] {
    const recientes = this.obtenerRecientes().filter((q) => q !== query);
    localStorage.setItem(this.STORAGE_RECIENTES, JSON.stringify(recientes));
    return recientes;
  }

  limpiarRecientes() {
    localStorage.removeItem(this.STORAGE_RECIENTES);
  }
}
