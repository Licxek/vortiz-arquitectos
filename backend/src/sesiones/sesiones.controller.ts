import {
  Controller,
  Delete,
  Get,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SesionesService } from './sesiones.service';

@UseGuards(JwtAuthGuard)
@Controller('perfil/sesiones')
export class SesionesController {
  constructor(private sesionesService: SesionesService) {}

  /** GET /perfil/sesiones — lista sesiones activas */
  @Get()
  async listar(@Req() req: any) {
    const userId = req.user.id ?? req.user.sub;
    const token = this.extraerToken(req);
    return this.sesionesService.listarPorUsuario(userId, token);
  }

  /** DELETE /perfil/sesiones/:id — cierra una sesión específica */
  @Delete(':id')
  async cerrar(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.id ?? req.user.sub;
    await this.sesionesService.cerrarSesion(id, userId);
    return { message: 'Sesión cerrada' };
  }

  /** DELETE /perfil/sesiones — cierra todas las sesiones excepto la actual */
  @Delete()
  async cerrarOtras(@Req() req: any) {
    const userId = req.user.id ?? req.user.sub;
    const token = this.extraerToken(req);
    const cerradas = await this.sesionesService.cerrarOtras(userId, token);
    return { message: 'Sesiones cerradas', cerradas };
  }

  private extraerToken(req: any): string {
    const auth = req.headers.authorization || '';
    return auth.replace(/^Bearer\s+/i, '');
  }
}