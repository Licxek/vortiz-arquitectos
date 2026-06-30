import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/usuario.entity'; // ⚠️ ajusta a tu ruta
import { MailService } from './mail.service';
import { EmailLayoutService } from './email-layout.service';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Usuario]),ConfiguracionModule],
  providers: [MailService,EmailLayoutService],
  exports: [MailService,EmailLayoutService],
})
export class MailModule {}