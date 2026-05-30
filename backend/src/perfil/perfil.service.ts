import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../usuarios/usuario.entity'; // ⚠️ ajusta la ruta

@Injectable()
export class PerfilService {
  constructor(
    @InjectRepository(Usuario) private usuariosRepo: Repository<Usuario>,
  ) {}

  async obtener(userId: number) {
    const usuario = await this.usuariosRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    // Nunca devolver password ni tokens
    const { password, resetToken, resetTokenExpira, ...resto } = usuario as any;
    return resto;
  }

  async actualizar(
    userId: number,
    data: {
      nombre?: string;
      apellidos?: string;
      correo?: string;
      telefono?: string | null;
    },
  ) {
    const usuario = await this.usuariosRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Validar que el correo no esté en uso por otro usuario
    if (data.correo && data.correo.trim().toLowerCase() !== usuario.correo) {
      const correoLimpio = data.correo.trim().toLowerCase();
      const existe = await this.usuariosRepo.findOne({
        where: { correo: correoLimpio, id: Not(userId) },
      });
      if (existe) {
        throw new BadRequestException('Ese correo ya está en uso por otro usuario');
      }
      usuario.correo = correoLimpio;
    }

    if (data.nombre !== undefined) usuario.nombre = data.nombre.trim();
    if (data.apellidos !== undefined) usuario.apellidos = data.apellidos.trim();
    if (data.telefono !== undefined) {
      usuario.telefono = data.telefono?.trim() || null;
    }

    await this.usuariosRepo.save(usuario);
    return this.obtener(userId);
  }

  async cambiarPassword(userId: number, actual: string, nueva: string) {
    if (!actual || !nueva) throw new BadRequestException('Faltan datos');
    if (nueva.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(nueva)) {
      throw new BadRequestException('La contraseña debe tener al menos una mayúscula');
    }
    if (!/\d/.test(nueva)) {
      throw new BadRequestException('La contraseña debe tener al menos un número');
    }

    const usuario = await this.usuariosRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const ok = await bcrypt.compare(actual, usuario.password);
    if (!ok) throw new UnauthorizedException('La contraseña actual no es correcta');

    usuario.password = await bcrypt.hash(nueva, 12);
    await this.usuariosRepo.save(usuario);

    return { ok: true };
  }
}