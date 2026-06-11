import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

export interface MantenimientoConfig {
  activo: boolean;
  mensaje: string;
  fechaEstimada?: string;
}

@Entity({ name: 'configuracion' })
export class Configuracion {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'jsonb', default: {} }) negocio: any;
  @Column({ type: 'jsonb', default: {} }) contacto: any;
  @Column({ type: 'jsonb', default: [] }) redes: any;
  @Column({ type: 'jsonb', default: {} }) agenda: any;
  @Column({ type: 'jsonb', default: {} }) apariencia: any;
  @Column({ type: 'jsonb', default: {} }) notificaciones: any;
  @Column({ type: 'jsonb', default: {} }) seo: any;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @Column({
    type: 'jsonb',
    default: {
      activo: false,
      mensaje: 'Estamos haciendo mejoras en el sitio. Volveremos muy pronto.',
      fechaEstimada: '',
    },
  })
  mantenimiento!: MantenimientoConfig;
}
