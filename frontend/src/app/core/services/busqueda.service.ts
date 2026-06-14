import { Injectable, inject } from '@angular/core';
import { CatalogoService } from './catalogo.service';
import { Pagina, BloquePagina } from './paginas.service';

export interface ResultadoBusqueda {
  tipo: 'pagina' | 'servicio' | 'proyecto' | 'pagina-dinamica';
  titulo: string;
  descripcion?: string;
  ruta: string;
  queryParams?: Record<string, any>;
  badge?: string;
  contexto?: string; // 👈 NUEVO: "Encontrado en 'Misión y visión'"
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
      const texto = `${p.nombre} ${p.descripcion || ''} ${p.categoria} ${p.cliente || ''} ${p.ubicacion || ''}`.toLowerCase();
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

    // 🔍 PÁGINAS DINÁMICAS: buscar en título, descripción Y bloques
    for (const p of paginasDinamicas) {
      // 1. Match en título
      if (p.titulo.toLowerCase().includes(q)) {
        resultados.push({
          tipo: 'pagina-dinamica',
          titulo: p.titulo,
          descripcion: p.descripcion
            ? this.recortar(p.descripcion, 80)
            : 'Página personalizada',
          ruta: `/p/${p.slug}`,
          badge: 'Página',
        });
        continue;
      }

      // 2. Match en descripción
      if (p.descripcion && p.descripcion.toLowerCase().includes(q)) {
        resultados.push({
          tipo: 'pagina-dinamica',
          titulo: p.titulo,
          descripcion: this.recortar(p.descripcion, 80),
          ruta: `/p/${p.slug}`,
          badge: 'Página',
          contexto: '📝 En la descripción',
        });
        continue;
      }

      // 3. Match en bloques
      const matchBloque = this.buscarEnBloques(p.bloques || [], q);
      if (matchBloque) {
        resultados.push({
          tipo: 'pagina-dinamica',
          titulo: p.titulo,
          descripcion: matchBloque.fragmento,
          ruta: `/p/${p.slug}`,
          badge: 'Página',
          contexto: `📍 En "${matchBloque.contextoBloque}"`,
        });
      }
    }

    return resultados.slice(0, 15);
  }

  /** Busca dentro de los bloques de una página y devuelve el fragmento + contexto */
  private buscarEnBloques(
    bloques: BloquePagina[],
    query: string,
  ): { fragmento: string; contextoBloque: string } | null {
    for (const bloque of bloques) {
      // Recopilar TODOS los textos del bloque
      const piezas: string[] = [];

      if (bloque.titulo) piezas.push(bloque.titulo);
      if (bloque.subtitulo) piezas.push(bloque.subtitulo);
      if (bloque.contenido) piezas.push(bloque.contenido);
      if (bloque.textoBoton) piezas.push(bloque.textoBoton);
      if (bloque.direccion) piezas.push(bloque.direccion);

      // Items (estadísticas, etc.)
      if (Array.isArray(bloque.items)) {
        for (const item of bloque.items) {
          if (item.titulo) piezas.push(item.titulo);
          if (item.descripcion) piezas.push(item.descripcion);
          if (item.valor) piezas.push(item.valor);
        }
      }

      // Campos del formulario de contacto
      if (Array.isArray(bloque.campos)) {
        piezas.push(...bloque.campos);
      }

      const textoCompleto = piezas.join(' • ');
      const textoLower = textoCompleto.toLowerCase();

      if (textoLower.includes(query)) {
        // Extraer fragmento con contexto alrededor del match
        const idx = textoLower.indexOf(query);
        const inicio = Math.max(0, idx - 30);
        const fin = Math.min(textoCompleto.length, idx + query.length + 60);
        let fragmento = textoCompleto.substring(inicio, fin);

        if (inicio > 0) fragmento = '…' + fragmento;
        if (fin < textoCompleto.length) fragmento += '…';

        // Contexto: título del bloque o nombre legible del tipo
        const contextoBloque = bloque.titulo || this.labelTipoBloque(bloque.tipo);

        return { fragmento, contextoBloque };
      }
    }

    return null;
  }

  private labelTipoBloque(tipo: string): string {
    const labels: Record<string, string> = {
      hero: 'Sección principal',
      texto: 'Contenido',
      imagen: 'Imagen',
      galeria: 'Galería',
      cita: 'Cita',
      cta: 'Llamada a la acción',
      estadisticas: 'Estadísticas',
      servicios: 'Servicios',
      contacto: 'Formulario',
      mapa: 'Ubicación',
    };
    return labels[tipo] || 'Sección';
  }

  private recortar(texto: string | undefined, n: number): string {
    if (!texto) return '';
    return texto.length > n ? texto.substring(0, n).trim() + '…' : texto;
  }

  // ===== Búsquedas recientes (sin cambios) =====

  obtenerRecientes(): string[] {
    try {
      const data = JSON.parse(localStorage.getItem(this.STORAGE_RECIENTES) || '[]');
      if (!Array.isArray(data)) return [];

      const limpios = data.filter(
        (q): q is string => typeof q === 'string' && q.trim().length > 0,
      );

      if (limpios.length !== data.length) {
        localStorage.setItem(this.STORAGE_RECIENTES, JSON.stringify(limpios));
      }

      return limpios;
    } catch {
      return [];
    }
  }

  guardarReciente(query: string) {
    if (!query || typeof query !== 'string' || !query.trim()) return;
    const recientes = this.obtenerRecientes();
    const filtradas = recientes.filter(
      (q) => q.toLowerCase() !== query.toLowerCase(),
    );
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
