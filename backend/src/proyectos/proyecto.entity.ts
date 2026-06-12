import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('proyectos')
export class Proyecto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ default: '' })
  iniciales: string;

  @Column({ default: '', name: 'logo_url' })
  logoUrl: string;

  @Column({ default: 'corporativo' })
  categoria: string;

  @Column({ default: '' })
  ubicacion: string;

  @Column({ default: 0 })
  anio: number;

  @Column({ default: '#0a4d7a', name: 'color_marca' })
  colorMarca: string;

  @Column('text', { default: '' })
  descripcion: string;

  @Column({ default: 0 })
  orden: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ default: 'en_diseno' })
  estado: string;

  @Column({ default: false })
  publicado: boolean;

  @Column({ default: '' })
  cliente: string;

  @Column({ default: '' })
  superficie: string;

  @Column({ default: 0 })
  progreso: number;

  @Column({ type: 'date', nullable: true, name: 'fecha_inicio' })
  fechaInicio: string | null;

  @Column({ type: 'date', nullable: true, name: 'fecha_entrega' })
  fechaEntrega: string | null;

  @Column({ default: '' })
  imagen: string;

  @Column({ type: 'jsonb', default: [] })
  imagenes: string[];
}
