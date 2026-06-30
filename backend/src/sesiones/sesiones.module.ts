import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sesion } from './sesion.entity';
import { SesionesController } from './sesiones.controller';
import { SesionesService } from './sesiones.service';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sesion]),UsuariosModule,MailModule],
  controllers: [SesionesController],
  providers: [SesionesService],
  exports: [SesionesService], // 👈 IMPORTANTE: lo exportamos para usarlo en AuthModule
})
export class SesionesModule {}