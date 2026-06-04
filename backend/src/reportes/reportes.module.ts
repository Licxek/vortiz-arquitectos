import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { Cita } from '../citas/cita.entity';
import { Servicio } from '../servicios/servicio.entity';
import { Proyecto } from '../proyectos/proyecto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cita, Servicio, Proyecto])],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}