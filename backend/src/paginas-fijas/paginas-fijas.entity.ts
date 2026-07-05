import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('paginas_fijas_config')
export class PaginaFijaConfig {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  slug!: string;

  @Column({ type: 'boolean', default: true })
  visible!: boolean;

  @UpdateDateColumn({ name: 'actualizado_at' })
  actualizadoAt!: Date;
}