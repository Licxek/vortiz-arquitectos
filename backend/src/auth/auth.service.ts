// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { MailService } from '../mail/mail.service';
import { randomInt } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usuarios: UsuariosService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async login(correo: string, password: string) {
    const usuario = await this.usuarios.findByCorreo(correo);
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const payload = {
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    };
    const token = await this.jwt.signAsync(payload);

    const { password: _, ...datos } = usuario; // nunca devolver el hash
    return { token, usuario: datos };
  }

  // PASO 1: genera y "envía" el código de 6 dígitos
  async solicitarRecuperacion(correo: string) {
    const usuario = await this.usuarios.findByCorreo(correo);
    if (usuario) {
      const codigo = randomInt(100000, 1000000).toString();
      usuario.resetToken = codigo;
      usuario.resetTokenExpira = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await this.usuarios.guardar(usuario);
      await this.mail.enviarRecuperacion(usuario.correo, codigo);
    }
    // Respondemos igual exista o no el correo (no revelar correos registrados)
    return {
      message: 'Si el correo existe, te enviamos un código de verificación.',
    };
  }

  // PASO 2: valida el código (sin consumirlo todavía)
  async verificarCodigo(correo: string, codigo: string) {
    const usuario = await this.usuarios.findByCorreo(correo);
    if (
      !usuario ||
      usuario.resetToken !== codigo ||
      !usuario.resetTokenExpira ||
      usuario.resetTokenExpira < new Date()
    ) {
      throw new BadRequestException('El código es inválido o ya expiró.');
    }
    return { message: 'Código verificado.' };
  }

  // PASO 3: cambia la contraseña y consume el código
  async restablecer(correo: string, codigo: string, nuevaPassword: string) {
    await this.verificarCodigo(correo, codigo); // re-valida por seguridad
    const usuario = await this.usuarios.findByCorreo(correo);
    usuario!.password = await bcrypt.hash(nuevaPassword, 12);
    usuario!.resetToken = null;
    usuario!.resetTokenExpira = null;
    await this.usuarios.guardar(usuario!);
    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }
}