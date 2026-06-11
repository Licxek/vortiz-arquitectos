import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/usuario.entity'; // ⚠️ ajusta a tu ruta
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}