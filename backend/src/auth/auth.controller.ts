// src/auth/auth.controller.ts
import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ForgotDto } from './dto/forgot.dto';
import { VerificarDto } from './dto/verificar.dto';
import { ResetDto } from './dto/reset.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // 🔒 LOGIN: 5 intentos por minuto (anti brute-force de passwords)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.correo, dto.password);
  }

  // 🟢 ME: el JwtAuthGuard ya lo protege; throttle global (60/min) es suficiente
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req) {
    return req.user;
  }

  // 🔒 FORGOT: 3 emails por hora (anti-spam de correos)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('forgot')
  forgot(@Body() dto: ForgotDto) {
    return this.auth.solicitarRecuperacion(dto.correo);
  }

  // 🔒 VERIFICAR: 10 intentos por hora (anti-brute force del código)
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @Post('verificar')
  verificar(@Body() dto: VerificarDto) {
    return this.auth.verificarCodigo(dto.correo, dto.codigo);
  }

  // 🔒 RESET: 5 intentos por hora (anti-spam + anti-brute force)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Post('reset')
  reset(@Body() dto: ResetDto) {
    return this.auth.restablecer(dto.correo, dto.codigo, dto.password);
  }
}