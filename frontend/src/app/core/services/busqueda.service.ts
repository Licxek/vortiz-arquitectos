import { Injectable, inject } from '@angular/core';
import { CatalogoService } from './catalogo.service';
import { ContenidoService } from './contenido.service';
import { Pagina, BloquePagina } from './paginas.service';

export interface ResultadoBusqueda {
  tipo: 'pagina' | 'servicio' | 'proyecto' | 'pagina-dinamica';
  titulo: string;
  descripcion?: string;
  ruta: string;
  queryParams?: Record<string, any>;
  badge?: string;
  contexto?: string;
  seccionId?: string; // 👈 NUEVO: ID de sección para scrollear ('mision', 'arquitecto', etc.)
}

interface PaginaFija {
  key: string; // 'inicio', 'nosotros', etc → para leer su contenido editable
  titulo: string;
  ruta: string;
  descripcion: string;
  keywords: string;
}

@Injectable({ providedIn: 'root' })
export class BusquedaService {
  private catalogo = inject(CatalogoService);
  private contenido = inject(ContenidoService);

  private readonly STORAGE_RECIENTES = 'vortiz_busquedas_recientes';

  /** Etiquetas amigables para cada sección de cada página fija */
  private nombresSecciones: Record<string, Record<string, string>> = {
    inicio: {
      hero: 'Hero principal',
      filosofia: 'Filosofía',
      stats: 'Estadísticas',
      servicios: 'Servicios destacados',
      proyectos: 'Proyectos destacados',
      proceso: 'Proceso de trabajo',
      cta: 'Llamada a la acción',
    },
    nosotros: {
      hero: 'Hero',
      intro: 'Introducción',
      mision: 'Misión',
      vision: 'Visión',
      arquitecto: 'El arquitecto',
      credenciales: 'Credenciales',
      hitos: 'Hitos',
      valores: 'Valores',
      cta: 'Llamada a la acción',
    },
    proyectos: {
      hero: 'Hero',
      intro: 'Introducción',
      catalogo: 'Catálogo',
      cta: 'Llamada a la acción',
    },
    servicios: {
      hero: 'Hero',
      intro: 'Introducción',
      catalogo: 'Catálogo',
      cta: 'Llamada a la acción',
    },
    citas: {
      hero: 'Hero',
      beneficios: 'Beneficios',
    },
  };

  private paginasFijas: PaginaFija[] = [
    {
      key: 'inicio',
      titulo: 'Inicio',
      ruta: '/',
      descripcion: 'Página principal de Vortiz Arquitectos',
      keywords: 'inicio home principal portada',
    },
    {
      key: 'servicios',
      titulo: 'Servicios',
      ruta: '/servicios',
      descripcion: 'Nuestros servicios profesionales de arquitectura',
      keywords: 'servicios diseño construcción gerencia trámites BIM',
    },
    {
      key: 'proyectos',
      titulo: 'Proyectos',
      ruta: '/proyectos',
      descripcion: 'Portafolio de proyectos realizados',
      keywords: 'proyectos portafolio obras clientes trabajo realizado',
    },
    {
      key: 'nosotros',
      titulo: 'Nosotros',
      ruta: '/nosotros',
      descripcion: 'Conoce a Vortiz Arquitectos y su trayectoria',
      keywords: 'nosotros sobre arquitecto historia equipo experiencia',
    },
    {
      key: 'citas',
      titulo: 'Citas',
      ruta: '/citas',
      descripcion: 'Agenda una cita con nosotros',
      keywords: 'citas agendar contacto reunión consulta cotización',
    },
  ];

  // ============================================================
  // MÉTODO PRINCIPAL DE BÚSQUEDA
  // ============================================================
  buscar(query: string, paginasDinamicas: Pagina[] = []): ResultadoBusqueda[] {
    const q = this.normalizar(query);
    if (!q) return [];

    const resultados: ResultadoBusqueda[] = [];

    // 1️⃣ Páginas fijas (matching por título, descripción, keywords)
    for (const p of this.paginasFijas) {
      const texto = this.normalizar(`${p.titulo} ${p.descripcion} ${p.keywords}`);
      if (this.matchesQuery(texto, q)) {
        resultados.push({
          tipo: 'pagina',
          titulo: p.titulo,
          descripcion: p.descripcion,
          ruta: p.ruta,
          badge: 'Página',
        });
      }
    }

    // 2️⃣ CONTENIDO EDITABLE de páginas fijas (lo nuevo 🎯)
    for (const pf of this.paginasFijas) {
      const match = this.buscarEnContenidoPagina(pf.key, q);
      if (match) {
        // Si esa página ya se agregó por título/keywords, no duplicar
        const yaExiste = resultados.some((r) => r.tipo === 'pagina' && r.ruta === pf.ruta);
        if (!yaExiste) {
          resultados.push({
            tipo: 'pagina',
            titulo: pf.titulo,
            descripcion: match.fragmento,
            ruta: pf.ruta,
            badge: 'Página',
            contexto: `📍 En "${match.contextoSeccion}"`,
            seccionId: match.seccionKey, // 👈 para scrollear a la sección
          });
        }
      }
    }

    // 3️⃣ Servicios
    for (const s of this.catalogo.getServicios()) {
      const texto = this.normalizar(`${s.titulo} ${s.descripcion || ''} ${s.categoria || ''}`);
      if (this.matchesQuery(texto, q)) {
        resultados.push({
          tipo: 'servicio',
          titulo: s.titulo,
          descripcion: this.recortar(s.descripcion, 80),
          ruta: '/servicios',
          queryParams: { servicio: s.id },
          badge: this.catalogo.etiquetaCategoriaServicio(s.categoria),
        });
      }
    }

    // 4️⃣ Proyectos
    for (const p of this.catalogo.getProyectos()) {
      const texto = this.normalizar(
        `${p.nombre} ${p.descripcion || ''} ${p.categoria} ${p.cliente || ''} ${p.ubicacion || ''}`,
      );
      if (this.matchesQuery(texto, q)) {
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

    // 5️⃣ Páginas dinámicas (título, descripción, bloques)
    for (const p of paginasDinamicas) {
      // Match en título
      if (this.matchesQuery(this.normalizar(p.titulo), q)) {
        resultados.push({
          tipo: 'pagina-dinamica',
          titulo: p.titulo,
          descripcion: p.descripcion ? this.recortar(p.descripcion, 80) : 'Página personalizada',
          ruta: `/p/${p.slug}`,
          badge: 'Página',
        });
        continue;
      }

      // Match en descripción
      if (p.descripcion && this.matchesQuery(this.normalizar(p.descripcion), q)) {
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

      // Match en bloques
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

  // ============================================================
  // BÚSQUEDA EN CONTENIDO EDITABLE DE PÁGINAS FIJAS
  // ============================================================

  /** Busca dentro del contenido editado en admin de una página fija */
  private buscarEnContenidoPagina(
    paginaKey: string,
    queryNormalizada: string,
  ): { fragmento: string; contextoSeccion: string; seccionKey: string } | null {
    const paginaData = this.contenido.getPagina(paginaKey);
    if (!paginaData || Object.keys(paginaData).length === 0) return null;

    // Nombre amigable de la página para incluirlo en el texto buscable
    const pageInfo = this.paginasFijas.find((p) => p.key === paginaKey);
    const pageName = pageInfo?.titulo || paginaKey;

    for (const seccionKey of Object.keys(paginaData)) {
      const seccionData = paginaData[seccionKey];
      const seccionLabel = this.nombresSecciones[paginaKey]?.[seccionKey] || seccionKey;
      const contenidoSeccion = this.extraerTextoSeccion(seccionData);

      // 🎯 Texto buscable = nombre de página + label de sección + contenido
      // Permite que "proyectos del catalogo" matchee Proyectos→Catálogo
      // y "mision" matchee Nosotros→Misión, aunque el contenido no traiga esas palabras.
      const textoOriginal = `${pageName} • ${seccionLabel}${contenidoSeccion ? ' • ' + contenidoSeccion : ''}`;
      const textoNormalizado = this.normalizar(textoOriginal);

      if (!this.matchesQuery(textoNormalizado, queryNormalizada)) continue;

      // Snippet del contenido real (o del header si la sección no tiene texto editable)
      const textoSnippet = contenidoSeccion || `${pageName} → ${seccionLabel}`;
      const fragmento = this.buildSnippet(textoSnippet, queryNormalizada);

      return { fragmento, contextoSeccion: seccionLabel, seccionKey };
    }

    return null;
  }

  /** Extrae todo el texto buscable de una sección (incluye campos y listas) */
  private extraerTextoSeccion(seccionData: any): string {
    if (!seccionData || typeof seccionData !== 'object') return '';

    const piezas: string[] = [];

    for (const key of Object.keys(seccionData)) {
      const valor = seccionData[key];

      if (typeof valor === 'string' && valor.trim()) {
        piezas.push(valor);
      } else if (Array.isArray(valor)) {
        // Listas: estadísticas, valores, hitos, credenciales, pasos del proceso...
        for (const item of valor) {
          if (typeof item === 'string') {
            piezas.push(item);
          } else if (item && typeof item === 'object') {
            for (const subkey of Object.keys(item)) {
              const subvalor = (item as any)[subkey];
              if (typeof subvalor === 'string' && subvalor.trim()) {
                piezas.push(subvalor);
              }
            }
          }
        }
      }
    }

    return piezas.join(' • ');
  }

  // ============================================================
  // BÚSQUEDA EN BLOQUES (páginas dinámicas)
  // ============================================================

  private buscarEnBloques(
    bloques: BloquePagina[],
    queryNormalizada: string,
  ): { fragmento: string; contextoBloque: string } | null {
    for (const bloque of bloques) {
      const piezas: string[] = [];

      if (bloque.titulo) piezas.push(bloque.titulo);
      if (bloque.subtitulo) piezas.push(bloque.subtitulo);
      if (bloque.contenido) piezas.push(bloque.contenido);
      if (bloque.textoBoton) piezas.push(bloque.textoBoton);
      if (bloque.direccion) piezas.push(bloque.direccion);

      if (Array.isArray(bloque.items)) {
        for (const item of bloque.items) {
          if (item.titulo) piezas.push(item.titulo);
          if (item.descripcion) piezas.push(item.descripcion);
          if (item.valor) piezas.push(item.valor);
        }
      }

      if (Array.isArray(bloque.campos)) {
        piezas.push(...bloque.campos);
      }

      const textoOriginal = piezas.join(' • ');
      const textoNormalizado = this.normalizar(textoOriginal);

      if (this.matchesQuery(textoNormalizado, queryNormalizada)) {
        const fragmento = this.buildSnippet(textoOriginal, queryNormalizada);
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

  // ============================================================
  // HELPERS
  // ============================================================

  /** Normaliza texto: lowercase + sin acentos (busqueda → busqueda, ñ → n) */
  private normalizar(texto: string): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /** Palabras vacías en español que se ignoran al tokenizar */
  private readonly STOP_WORDS = new Set([
    'de',
    'la',
    'el',
    'en',
    'un',
    'y',
    'o',
    'a',
    'al',
    'del',
    'los',
    'las',
    'una',
    'uno',
    'por',
    'con',
    'sin',
    'para',
    'sus',
    'que',
    'son',
    'mas',
    'muy',
    'fue',
    'ser',
    'hay',
    'ese',
    'esa',
    'eso',
    'su',
    'le',
    'lo',
    'se',
  ]);

  /**
   * Match flexible: primero intenta substring exacto, luego tokeniza la query
   * y exige que TODOS los tokens significativos aparezcan en el texto (en cualquier orden).
   * Así "proyectos del catalogo" matchea texto que contenga "proyectos" Y "catalogo"
   * (ignora "del" porque está en STOP_WORDS).
   */
  private matchesQuery(textoNormalizado: string, queryNormalizada: string): boolean {
    if (!queryNormalizada) return false;

    // 1. Match exacto (más rápido)
    if (textoNormalizado.includes(queryNormalizada)) return true;

    // 2. Match por tokens (ignora stop-words españolas)
    const tokens = queryNormalizada
      .split(/\s+/)
      .filter((t) => t.length > 1 && !this.STOP_WORDS.has(t));
    if (tokens.length === 0) return false;

    return tokens.every((token) => textoNormalizado.includes(token));
  }

  /**
   * Construye un snippet de ~100 chars alrededor del primer match.
   * Si no hay match exacto, busca el primer token que sí aparezca.
   */
  private buildSnippet(textoOriginal: string, queryNormalizada: string): string {
    if (!textoOriginal) return '';
    const textoNormalizado = this.normalizar(textoOriginal);

    // Primero intentar match exacto
    let idx = textoNormalizado.indexOf(queryNormalizada);
    let largoMatch = queryNormalizada.length;

    // Si no hay match exacto, buscar el primer token que sí aparezca
    if (idx === -1) {
      const tokens = queryNormalizada
        .split(/\s+/)
        .filter((t) => t.length > 1 && !this.STOP_WORDS.has(t));
      for (const token of tokens) {
        const pos = textoNormalizado.indexOf(token);
        if (pos !== -1) {
          idx = pos;
          largoMatch = token.length;
          break;
        }
      }
    }

    if (idx === -1) {
      // Sin match → primeros 100 chars
      return textoOriginal.length > 100
        ? textoOriginal.substring(0, 100).trim() + '…'
        : textoOriginal;
    }

    const inicio = Math.max(0, idx - 30);
    const fin = Math.min(textoOriginal.length, idx + largoMatch + 60);
    let fragmento = textoOriginal.substring(inicio, fin);
    if (inicio > 0) fragmento = '…' + fragmento;
    if (fin < textoOriginal.length) fragmento += '…';
    return fragmento;
  }

  private recortar(texto: string | undefined, n: number): string {
    if (!texto) return '';
    return texto.length > n ? texto.substring(0, n).trim() + '…' : texto;
  }

  // ============================================================
  // BÚSQUEDAS RECIENTES (sin cambios)
  // ============================================================

  obtenerRecientes(): string[] {
    try {
      const data = JSON.parse(localStorage.getItem(this.STORAGE_RECIENTES) || '[]');
      if (!Array.isArray(data)) return [];

      const limpios = data.filter((q): q is string => typeof q === 'string' && q.trim().length > 0);

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
