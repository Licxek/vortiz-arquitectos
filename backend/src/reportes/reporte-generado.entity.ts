import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('reportes_generados')
export class ReporteGenerado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  tipo: string;

  @Column({ length: 200 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'date', name: 'rango_desde' })
  rangoDesde: string;

  @Column({ type: 'date', name: 'rango_hasta' })
  rangoHasta: string;

  @Column({ length: 500 })
  archivo: string;

  @Column({ default: 0, name: 'tamanio_kb' })
  tamanioKb: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  destinatarios: string[];

  @Column({ default: false, name: 'email_enviado' })
  emailEnviado: boolean;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'generado_por' })
  generadoPor: Usuario | null;

  @Column({ name: 'generado_por', nullable: true })
  generadoPorId: number | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}