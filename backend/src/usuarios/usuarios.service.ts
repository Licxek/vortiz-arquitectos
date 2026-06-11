// src/usuarios/usuarios.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(@InjectRepository(Usuario) private repo: Repository<Usuario>) {}

  findByCorreo(correo: string) {
    return this.repo.findOne({ where: { correo } });
  }
  findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  findByResetToken(token: string) {
    return this.repo.findOne({ where: { resetToken: token } });
  }
  guardar(usuario: Usuario) {
    return this.repo.save(usuario);
  }
}