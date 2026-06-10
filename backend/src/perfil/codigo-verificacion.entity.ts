import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

export type PropositoVerificacion = 'cambiar_correo' | 'cambiar_password';

@Entity('codigos_verificacion')
export class CodigoVerificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  codigo: string;

  @Column()
  proposito: PropositoVerificacion;

  @Column({ type: 'text', nullable: true })
  payload: string | null;

  @Column({ name: 'expira_en' })
  expiraEn: Date;

  @Column({ default: false })
  usado: boolean;

  @Column({ default: 0 })
  intentos: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}