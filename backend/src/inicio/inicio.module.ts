import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from '../citas/cita.entity'; // ⚠️ ajusta
import { Proyecto } from '../proyectos/proyecto.entity'; // ⚠️ ajusta
import { InicioController } from './inicio.controller';
import { InicioService } from './inicio.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cita, Proyecto])],
  controllers: [InicioController],
  providers: [InicioService],
})
export class InicioModule {}