// src/usuarios/usuario.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity({ name: 'usuarios' })
export class Usuario {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 100 }) nombre: string;
  @Column({ length: 100 }) apellidos: string;
  @Column({ length: 150, unique: true }) correo: string;

  @Column({ length: 255 })
  @Exclude()                                          // 👈 nunca se serializa al cliente
  password: string;

  @Column({ length: 20, default: 'admin' }) rol: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @Column({ name: 'reset_token', length: 255, nullable: true })
  @Exclude()                                          // 👈
  resetToken: string | null;

  @Column({ name: 'reset_token_expira', type: 'timestamp', nullable: true })
  @Exclude()                                          // 👈
  resetTokenExpira: Date | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({ type: 'text', nullable: true })
  avatar?: string | null;
}
