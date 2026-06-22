import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from '../citas/cita.entity';
import { CitasModule } from '../citas/citas.module';
import { ImapService } from './imap.service';
import { ImapController } from './imap.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cita]),
    CitasModule, // para usar MensajesConsultaService
  ],
  controllers: [ImapController],
  providers: [ImapService],
})
export class ImapModule {}