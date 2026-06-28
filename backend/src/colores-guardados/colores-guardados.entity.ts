import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'colores_guardados' })
export class ColorGuardado {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 7, unique: true })
  hex!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}