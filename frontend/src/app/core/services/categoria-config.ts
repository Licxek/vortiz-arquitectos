import { CategoriaResultado } from './buscador-admin.service';

export interface CategoriaConfig {
  label: string;
  iconoPath: string;
  bgIconHex: string;   // 👈 NUEVO
  textIconHex: string; // 👈 NUEVO
  borderHex: string;
  orden: number;
}

export const CATEGORIA_CONFIG: Record<CategoriaResultado, CategoriaConfig> = {
  proyecto: {
    label: 'Proyectos',
    iconoPath: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    bgIconHex: '#dbeafe',
    textIconHex: '#0a4d7a',
    borderHex: '#0a4d7a',
    orden: 1,
  },
  cita: {
    label: 'Citas',
    iconoPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    bgIconHex: '#d1fae5',
    textIconHex: '#047857',
    borderHex: '#047857',
    orden: 2,
  },
  consulta: {
    label: 'Consultas',
    iconoPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    bgIconHex: '#f3e8ff',
    textIconHex: '#7e22ce',
    borderHex: '#7e22ce',
    orden: 3,
  },
  reporte: {
    label: 'Reportes',
    iconoPath: 'M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2M7 7h10M7 11h4m6 10H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z',
    bgIconHex: '#ccfbf1',
    textIconHex: '#0f766e',
    borderHex: '#0f766e',
    orden: 4,
  },
  accion: {
    label: 'Acciones',
    iconoPath: 'M13 10V3L4 14h7v7l9-11h-7z',
    bgIconHex: '#fef3c7',
    textIconHex: '#b45309',
    borderHex: '#b45309',
    orden: 5,
  },
  pagina: {
    label: 'Páginas',
    iconoPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    bgIconHex: '#e0f2fe',
    textIconHex: '#0369a1',
    borderHex: '#0369a1',
    orden: 6,
  },
  config: {
    label: 'Configuración',
    iconoPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    bgIconHex: '#f3f4f6',
    textIconHex: '#374151',
    borderHex: '#374151',
    orden: 7,
  },
};

export const CATEGORIA_RECIENTE: CategoriaConfig = {
  label: 'Recientes',
  iconoPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  bgIconHex: '#f3f4f6',
  textIconHex: '#4b5563',
  borderHex: '#6b7280',
  orden: 0,
};

export const CATEGORIA_RECOMENDADO: CategoriaConfig = {
  label: 'Recomendado para ti',
  // Estrella (Heroicons star)
  iconoPath:
    'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  bgIconHex: '#fef3c7',
  textIconHex: '#b45309',
  borderHex: '#b45309',
  orden: 99,
};

export function obtenerCategoriaConfig(key: string): CategoriaConfig {
  if (key === 'reciente') return CATEGORIA_RECIENTE;
  if (key === 'recomendado') return CATEGORIA_RECOMENDADO; // 👈 NUEVO
  const k = key as CategoriaResultado;
  return CATEGORIA_CONFIG[k] || CATEGORIA_RECIENTE;
}
