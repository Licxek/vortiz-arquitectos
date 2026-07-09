import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultaSnapshot } from './consulta-snapshot.entity';
import { Cita } from '../citas/cita.entity';
import { MensajeConsulta } from '../citas/mensaje-consulta.entity';
import { ConsultaSnapshotsService } from './consulta-snapshots.service';
import { PdfConsultaService } from './pdf-consulta.service';
import { ConsultaSnapshotsCronService } from './consulta-snapshots-cron.service';
import { ConsultaSnapshotsController } from './consulta-snapshots.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConsultaSnapshot, Cita, MensajeConsulta])],
  controllers: [ConsultaSnapshotsController],
  providers: [ConsultaSnapshotsService, PdfConsultaService, ConsultaSnapshotsCronService],
  exports: [ConsultaSnapshotsService],
})
export class ConsultaSnapshotsModule {}