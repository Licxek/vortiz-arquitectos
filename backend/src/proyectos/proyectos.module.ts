import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proyecto } from './proyecto.entity';
import { ProyectosService } from './proyectos.service';
import { ProyectosController } from './proyectos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Proyecto])],
  controllers: [ProyectosController],
  providers: [ProyectosService],
})
export class ProyectosModule {}