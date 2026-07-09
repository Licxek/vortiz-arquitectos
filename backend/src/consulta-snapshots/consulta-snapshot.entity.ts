import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cita } from '../citas/cita.entity';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('consulta_snapshots')
export class ConsultaSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cita_id' })
  citaId: number;

  @ManyToOne(() => Cita, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cita_id' })
  cita: Cita;

  @Column({ length: 50 })
  motivo: 'automatico_resuelto' | 'automatico_archivado' | 'manual';

  @Column({ name: 'cliente_snapshot', type: 'jsonb' })
  clienteSnapshot: Record<string, any>;

  @Column({ name: 'consulta_snapshot', type: 'jsonb' })
  consultaSnapshot: Record<string, any>;

  @Column({ name: 'mensajes_snapshot', type: 'jsonb' })
  mensajesSnapshot: Array<Record<string, any>>;

  @Column({ name: 'total_mensajes', default: 0 })
  totalMensajes: number;

  @Column({ name: 'duracion_dias', nullable: true })
  duracionDias: number | null;

  @Column({ name: 'creado_por', nullable: true })
  creadoPor: number | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'creado_por' })
  usuario: Usuario | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}