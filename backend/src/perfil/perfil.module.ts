import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/usuario.entity'; // ⚠️ ajusta la ruta
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [PerfilController],
  providers: [PerfilService],
})
export class PerfilModule {}