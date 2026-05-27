// src/usuarios/usuario.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'usuarios' })
export class Usuario {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 100 }) nombre: string;
  @Column({ length: 100 }) apellidos: string;
  @Column({ length: 150, unique: true }) correo: string;
  @Column({ length: 255 }) password: string;
  @Column({ length: 20, default: 'admin' }) rol: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @Column({ name: 'reset_token', length: 255, nullable: true })
  resetToken: string | null;
  @Column({ name: 'reset_token_expira', type: 'timestamp', nullable: true })
  resetTokenExpira: Date | null;
}