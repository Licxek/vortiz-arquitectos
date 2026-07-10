import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Proyecto } from '../proyectos/proyecto.entity'; // 👈 NUEVO
import { CodigoVerificacion } from './codigo-verificacion.entity';
import { MailModule } from '../mail/mail.module'; // ⚠️ ajusta la ruta a tu MailModule
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';
import { VerificacionService } from './verificacion.service';
import { Cita } from '../citas/cita.entity';
import { Pagina } from '../paginas/pagina.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, CodigoVerificacion,Proyecto, Cita, Pagina]),
    MailModule,
  ],
  controllers: [PerfilController],
  providers: [PerfilService, VerificacionService],
})
export class PerfilModule {}