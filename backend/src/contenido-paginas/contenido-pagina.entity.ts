import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('contenido_paginas')
export class ContenidoPagina {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  pagina: string;

  @Column('jsonb', { default: () => "'{}'" })
  contenido: Record<string, Record<string, string>>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}