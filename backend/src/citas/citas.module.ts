import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from './cita.entity';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';
import { ConfiguracionModule } from '../configuracion/configuracion.module'; // 👈 NUEVO
import { MailModule } from '../mail/mail.module';
import { RecordatoriosService } from './recordatorios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cita]),MailModule,  ConfiguracionModule,],
  controllers: [CitasController],
  providers: [CitasService, RecordatoriosService],
})
export class CitasModule {}