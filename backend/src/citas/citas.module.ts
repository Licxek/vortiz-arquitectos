import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from './cita.entity';
import { MensajeConsulta } from './mensaje-consulta.entity'; // 👈 NUEVO
import { CitasService } from './citas.service';
import { MensajesConsultaService } from './mensajes-consulta.service'; // 👈 NUEVO
import { CitasController } from './citas.controller';
import { MensajesConsultaController } from './mensajes-consulta.controller'; // 👈 NUEVO
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { MailModule } from '../mail/mail.module';
import { RecordatoriosService } from './recordatorios.service';
import { ResumenesService } from './resumenes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cita, MensajeConsulta]), // 👈 agregar MensajeConsulta
    MailModule,
    ConfiguracionModule,
  ],
  controllers: [
    CitasController,
    MensajesConsultaController, // 👈 NUEVO
  ],
  providers: [
    CitasService,
    RecordatoriosService,
    ResumenesService,
    MensajesConsultaService, // 👈 NUEVO
  ],
  exports: [
    MensajesConsultaService, // 👈 lo usamos en A1.3 para guardar mensajes desde responderConsulta
  ],
})
export class CitasModule {}