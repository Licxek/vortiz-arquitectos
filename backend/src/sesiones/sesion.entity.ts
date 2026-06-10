import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('sesiones')
export class Sesion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'token_hash', unique: true })
  tokenHash: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ nullable: true })
  ip: string | null;

  @Column({ nullable: true })
  navegador: string | null;

  @Column({ name: 'sistema_operativo', nullable: true })
  sistemaOperativo: string | null;

  @Column({ nullable: true })
  dispositivo: string | null;

  @Column({ nullable: true })
  ubicacion: string | null;

  @Column({ name: 'ultimo_acceso', default: () => 'NOW()' })
  ultimoAcceso: Date;

  @CreateDateColumn({ name: 'creada_en' })
  creadaEn: Date;

  @Column({ default: true })
  activa: boolean;

  @Column({ name: 'cerrada_en', nullable: true })
  cerradaEn: Date | null;
}