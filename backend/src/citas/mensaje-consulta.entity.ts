import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Cita } from './cita.entity';

export type AutorMensaje = 'cliente' | 'admin';
export type MetodoMensaje = 'email' | 'whatsapp' | 'guardado' | 'inbound';

@Entity('mensajes_consulta')
export class MensajeConsulta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  citaId: number;

  @ManyToOne(() => Cita, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'citaId' })
  cita: Cita;

  @Column({ type: 'varchar', length: 10 })
  autor: AutorMensaje;

  @Column({ type: 'text' })
  texto: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  metodo: MetodoMensaje | null;

  @CreateDateColumn()
  createdAt: Date;
}