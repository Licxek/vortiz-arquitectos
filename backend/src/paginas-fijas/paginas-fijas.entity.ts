import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('paginas_fijas_config')
export class PaginaFijaConfig {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  slug!: string;

  @Column({ type: 'boolean', default: true })
  visible!: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icono!: string | null;

  @UpdateDateColumn({ name: 'actualizado_at' })
  actualizadoAt!: Date;
}