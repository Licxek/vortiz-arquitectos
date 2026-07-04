import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('categorias')
@Index(['tipo', 'value'], { unique: true })
export class Categoria {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 40 })
  tipo!: 'servicio' | 'proyecto';

  @Column({ type: 'varchar', length: 80 })
  value!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ type: 'integer', default: 0 })
  orden!: number;

  @Column({ type: 'boolean', default: false })
  esPersonalizada!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}