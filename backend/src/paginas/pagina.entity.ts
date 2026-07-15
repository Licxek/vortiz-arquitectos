import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type EstadoPagina = 'borrador' | 'publicada' | 'programada';
export type VisibilidadPagina = 'publica' | 'registrados' | 'contrasena';

export interface SeoPagina {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
}

export type CtaDestinoTipo = 'url' | 'whatsapp' | 'telefono' | 'email' | 'seccion';

export interface BloquePagina {
  id: number;
  tipo:
    | 'hero'
    | 'texto'
    | 'imagen'
    | 'galeria'
    | 'cita'
    | 'cta'
    | 'estadisticas'
    | 'servicios'
    | 'contacto'
    | 'mapa';
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
  imagenUrl?: string;
  textoBoton?: string;
  items?: any[];
  imagenes?: string[];
  direccion?: string;
  campos?: string[];
  serviciosIds?: number[];
  // 👇 NUEVO para CTA multi-destino
  ctaDestinoTipo?: CtaDestinoTipo;
  ctaDestinoValor?: string;
  ctaMensajePredeterminado?: string;
  ctaAbrirEnNuevaPestana?: boolean;
}

@Entity({ name: 'paginas' })
export class Pagina {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', default: '' })
  descripcion: string;

  @Column({
    type: 'varchar',
    length: 500,
    name: 'imagen_destacada',
    default: '',
  })
  imagenDestacada: string;

  @Column({ type: 'varchar', length: 50, default: 'standard' })
  categoria: string;

  @Column({ type: 'varchar', length: 20, default: 'borrador' })
  estado: EstadoPagina;

  @Column({ type: 'varchar', length: 20, default: 'publica' })
  visibilidad: VisibilidadPagina;

  @Column({ type: 'boolean', name: 'mostrar_en_menu', default: true })
  mostrarEnMenu: boolean;

  @Column({ type: 'int', name: 'posicion_menu', default: 0 })
  posicionMenu: number;

  @Column({ type: 'boolean', default: true })
  visible: boolean;

  @Column({ type: 'timestamp', name: 'fecha_publicacion', nullable: true })
  fechaPublicacion: Date | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  bloques: BloquePagina[];

  @Column({
    type: 'jsonb',
    default: () =>
      `'{"metaTitle":"","metaDescription":"","keywords":""}'::jsonb`,
  })
  seo: SeoPagina;

  @Column({ type: 'boolean', name: 'permitir_comentarios', default: false })
  permitirComentarios: boolean;

  @Column({ type: 'varchar', length: 30, default: 'document' })
  icono: string;

  @Column({ type: 'varchar', length: 20, default: 'gray' })
  color: string;

  // 👇 NUEVO
  @Column({ type: 'text', name: 'notas_internas', default: '' })
  notasInternas: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
