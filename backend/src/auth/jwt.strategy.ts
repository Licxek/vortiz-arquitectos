// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../usuarios/usuarios.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usuarios: UsuariosService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'cambia-esto',
    });
  }
  async validate(payload: any) {
    const usuario = await this.usuarios.findById(payload.sub);
    if (!usuario) throw new UnauthorizedException();
    const { password, ...datos } = usuario;
    return datos; // queda en req.user
  }
}
