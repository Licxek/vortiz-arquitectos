import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Servicio } from '../servicios/servicio.entity';

export type TipoCita = 'consulta' | 'proyecto';
export type EstadoCita = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

@Entity('citas')
export class Cita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 200 })
  correo: string;

  @Column({ length: 30 })
  telefono: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: TipoCita;

  @Column({ name: 'servicio_id', nullable: true })
  servicioId: number | null;

  @ManyToOne(() => Servicio, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicio | null;

  @Column({ type: 'text', default: '' })
  motivo: string;

  @Column({ type: 'date' })
  fecha: string; // YYYY-MM-DD

  @Column({ type: 'varchar', length: 5 })
  hora: string; // HH:MM

  @Column({ type: 'int', default: 60 })
  duracion: number;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: EstadoCita;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}