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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.correo, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req) {
    return req.user;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot')
  forgot(@Body() dto: ForgotDto) {
    return this.auth.solicitarRecuperacion(dto.correo);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verificar')
  verificar(@Body() dto: VerificarDto) {
    return this.auth.verificarCodigo(dto.correo, dto.codigo);
  }

  @Post('reset')
  reset(@Body() dto: ResetDto) {
    return this.auth.restablecer(dto.correo, dto.codigo, dto.password);
  }
}