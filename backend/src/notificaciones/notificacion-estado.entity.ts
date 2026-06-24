import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('notificaciones_estado')
@Unique(['usuarioId', 'externalId'])
@Index(['usuarioId'])
export class NotificacionEstado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  /** ID externo de la notificación, ej: 'cita_42', 'consulta_15', 'mensaje_62_1750000000000' */
  @Column({ type: 'varchar', length: 100 })
  externalId: string;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @Column({ type: 'boolean', default: false })
  borrada: boolean;

  @Column({ type: 'timestamp', nullable: true })
  leidaEn: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}