import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificacionesService } from './notificaciones.service';

@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private servicio: NotificacionesService) {}

  /** GET /notificaciones/estados — lista todos los estados del usuario */
  @Get('estados')
  estados(@Req() req: any) {
    const userId = req.user.id ?? req.user.sub;
    return this.servicio.listar(userId);
  }

  /** POST /notificaciones/marcar-leida — body: { externalId } */
  @Post('marcar-leida')
  marcarLeida(@Req() req: any, @Body() body: { externalId: string }) {
    const userId = req.user.id ?? req.user.sub;
    return this.servicio.marcarLeida(userId, body.externalId);
  }

  /** POST /notificaciones/marcar-borrada — body: { externalId } */
  @Post('marcar-borrada')
  marcarBorrada(@Req() req: any, @Body() body: { externalId: string }) {
    const userId = req.user.id ?? req.user.sub;
    return this.servicio.marcarBorrada(userId, body.externalId);
  }

  /** POST /notificaciones/marcar-todas-leidas — body: { externalIds: [] } */
  @Post('marcar-todas-leidas')
  marcarTodasLeidas(
    @Req() req: any,
    @Body() body: { externalIds: string[] },
  ) {
    const userId = req.user.id ?? req.user.sub;
    return this.servicio.marcarTodasLeidas(userId, body.externalIds);
  }
}