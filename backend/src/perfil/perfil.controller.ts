import {Body, Controller, Get, Post, Put, Request, UseGuards,} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ⚠️ ajusta la ruta
import { PerfilService } from './perfil.service';
import { UpdatePerfilDto } from './dto/update-perfil.dto';

@UseGuards(JwtAuthGuard)
@Controller('perfil')
export class PerfilController {
  constructor(private servicio: PerfilService) {}

  @Get()
  obtener(@Request() req: any) {
    const userId = req.user.id ?? req.user.sub;
    return this.servicio.obtener(userId);
  }

  @Put()
  actualizar(@Request() req: any, @Body() data: UpdatePerfilDto) {  // 👈 cambiado
    const userId = req.user.id ?? req.user.sub;
    return this.servicio.actualizar(userId, data);
  }
  
  @Post('cambiar-password')
  cambiarPassword(
    @Request() req: any,
    @Body() body: { actual: string; nueva: string },
  ) {
    const userId = req.user.id ?? req.user.sub;
    return this.servicio.cambiarPassword(userId, body.actual, body.nueva);
  }
}
