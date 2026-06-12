import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { Cita } from '../citas/cita.entity';
import { Servicio } from '../servicios/servicio.entity';
import { Proyecto } from '../proyectos/proyecto.entity';
import { PdfReportesService } from './pdf-reportes.service'; // 👈 NUEVO
import { EmailReportesService } from './email-reportes.service'; // 👈 NUEVO
import { HistorialReportesService } from './historial-reportes.service'; // 👈 NUEVO
import { ReporteGenerado } from './reporte-generado.entity'; // 👈 NUEVO
import { AnalyticsModule } from '../analytics/analytics.module'; 

@Module({
  imports: [TypeOrmModule.forFeature([Cita, Servicio, Proyecto, ReporteGenerado,AnalyticsModule,])],
  controllers: [ReportesController],
  providers: [ReportesService, PdfReportesService,EmailReportesService,HistorialReportesService,],
})
export class ReportesModule {}