import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(_exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Mensaje específico según el endpoint
    let message = 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.';

    if (request.url.includes('/auth/login')) {
      message = 'Demasiados intentos de inicio de sesión. Espera unos minutos antes de intentar de nuevo.';
    } else if (request.url.includes('/auth/forgot-password') || request.url.includes('/auth/reset-password')) {
      message = 'Demasiadas solicitudes de recuperación de contraseña. Intenta de nuevo en una hora.';
    } else if (request.url.includes('/citas')) {
      message = 'Has enviado demasiadas solicitudes de cita. Por favor, intenta de nuevo más tarde.';
    }

    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: 429,
      message,
      error: 'Too Many Requests',
    });
  }
}