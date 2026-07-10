import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Usuario } from '../usuarios/usuario.entity';
import { PerfilService } from './perfil.service';
import { VerificacionService } from './verificacion.service';
import { UpdatePerfilDto } from './dto/update-perfil.dto';

@UseGuards(JwtAuthGuard)
@Controller('perfil')
export class PerfilController {
  constructor(
    private servicio: PerfilService,
    private verificacionService: VerificacionService,
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,
  ) {}

  // ====== GET /perfil — obtener perfil ======
  @Get()
  obtener(@Req() req: any) {
    const userId = req.user.id ?? req.user.sub;
    return this.servicio.obtener(userId);
  }

  // ====== GET /perfil/estadisticas — proyectos totales + clientes únicos ======
  @Get('estadisticas')
  estadisticas() {
    return this.servicio.obtenerEstadisticas();
  }

  // ====== GET /perfil/metricas-mes — métricas del mes actual para el modal ======
  @Get('metricas-mes')
  metricasMes() {
    return this.servicio.obtenerMetricasMes();
  }

  // ====== PATCH /perfil — actualizar (exige código si cambia correo) ======
  @Patch()
  async actualizar(
    @Req() req: any,
    @Body() body: UpdatePerfilDto & { codigo?: string },
  ) {
    const userId = req.user.id ?? req.user.sub;

    // Si cambia el correo, exigir código de verificación
    if (body.correo) {
      const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
      if (usuario && body.correo !== usuario.correo) {
        if (!body.codigo) {
          throw new BadRequestException(
            'Se requiere código de verificación para cambiar el correo.',
          );
        }
        await this.verificacionService.verificar(
          userId,
          body.codigo,
          'cambiar_correo',
        );
      }
    }

    const { codigo, ...datos } = body;
    return this.servicio.actualizar(userId, datos);
  }

  // ====== POST /perfil/cambiar-password — cambiar contraseña (exige código) ======
  @Post('cambiar-password')
  async cambiarPassword(
    @Req() req: any,
    @Body() body: { actual: string; nueva: string; codigo: string },
  ) {
    const userId = req.user.id ?? req.user.sub;

    if (!body.codigo) {
      throw new BadRequestException(
        'Se requiere código de verificación para cambiar la contraseña.',
      );
    }

    await this.verificacionService.verificar(
      userId,
      body.codigo,
      'cambiar_password',
    );

    return this.servicio.cambiarPassword(userId, body.actual, body.nueva);
  }

  // ====== POST /perfil/solicitar-codigo — generar y enviar PIN ======
  @Post('solicitar-codigo')
  async solicitarCodigo(
    @Req() req: any,
    @Body()
    body: {
      proposito: 'cambiar_correo' | 'cambiar_password';
      payload?: any;
    },
  ) {
    const userId = req.user.id ?? req.user.sub;
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });

    if (!usuario) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    await this.verificacionService.generarYEnviar(
      usuario,
      body.proposito,
      body.payload,
    );

    return { message: 'Código enviado a tu correo' };
  }
}
