// src/auth/jwt-auth.guard.ts
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, _context: ExecutionContext) {
    // 🕐 JWT vencido por tiempo (expiresIn: 1d)
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException({
        message: 'Token expirado por inactividad',
        code: 'TOKEN_EXPIRADO',
      });
    }

    // 🚫 JWT alterado o inválido
    if (info?.name === 'JsonWebTokenError') {
      throw new UnauthorizedException({
        message: 'Token inválido',
        code: 'TOKEN_INVALIDO',
      });
    }

    // Si la strategy ya lanzó su propio error (con code), respetarlo
    if (err) throw err;

    if (!user) {
      throw new UnauthorizedException({
        message: 'No autenticado',
        code: 'NO_AUTENTICADO',
      });
    }

    return user;
  }
}