import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MensajesConsultaService } from './mensajes-consulta.service';
import { AutorMensaje, MetodoMensaje } from './mensaje-consulta.entity';

@Controller('citas/:citaId/mensajes')
@UseGuards(JwtAuthGuard)
export class MensajesConsultaController {
  constructor(private servicio: MensajesConsultaService) {}

  @Get()
  listar(@Param('citaId', ParseIntPipe) citaId: number) {
    return this.servicio.listar(citaId);
  }

  @Post()
  crear(
    @Param('citaId', ParseIntPipe) citaId: number,
    @Body() data: { autor: AutorMensaje; texto: string; metodo?: MetodoMensaje },
  ) {
    if (!data.autor || !data.texto?.trim()) {
      throw new BadRequestException('Faltan campos requeridos');
    }
    return this.servicio.crear(citaId, data);
  }
}