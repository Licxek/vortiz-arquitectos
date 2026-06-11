import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('servicios')
export class Servicio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  titulo: string;

  @Column('text', { default: '' })
  descripcion: string;

  @Column({ default: '' })
  imagen: string;

  @Column({ default: 'tramites' })
  categoria: string;

  @Column({ default: 'document' })
  icono: string;

  @Column({ default: 0 })
  orden: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}