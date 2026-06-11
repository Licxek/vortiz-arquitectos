import { Injectable, UnauthorizedException  } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { SesionesService } from '../sesiones/sesiones.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private sesionesService: SesionesService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'cambia-esto',
      passReqToCallback: true, // 👈 NUEVO: pasamos el request al validate
    });
  }

  async validate(req: Request, payload: any) {
    const token = this.extraerToken(req);
    const userAgent = req.headers['user-agent'] || '';
    const ip = this.obtenerIp(req);

    if (token) {
      const estado = await this.sesionesService.estadoToken(token);

      if (estado === 'cerrada') {
        // 🔒 La sesión fue cerrada explícitamente → rechazar
        throw new UnauthorizedException(
          'Tu sesión fue cerrada. Vuelve a iniciar sesión.',
        );
      }

      if (estado === 'no_existe') {
        // Edge case: JWT válido sin sesión registrada → crearla
        try {
          await this.sesionesService.registrar(
            payload.sub,
            token,
            userAgent,
            ip,
          );
        } catch (err) {
          console.error('Error auto-registrando sesión:', err);
        }
      } else {
        // estado === 'activa' → tocar último acceso
        try {
          await this.sesionesService.tocar(token);
        } catch (err) {
          console.error('Error actualizando último acceso:', err);
        }
      }
    }

    return { id: payload.sub, correo: payload.correo, rol: payload.rol };
  }

  private extraerToken(req: Request): string {
    const auth = req.headers.authorization || '';
    return auth.replace(/^Bearer\s+/i, '');
  }

  private obtenerIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || '';
  }
}
