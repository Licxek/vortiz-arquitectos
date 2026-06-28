import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ColoresGuardadosService } from './colores-guardados.service';
import { CrearColorDto } from './dto/color.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('colores-guardados')
export class ColoresGuardadosController {
  constructor(private servicio: ColoresGuardadosService) {}

  @Get()
  listar() {
    return this.servicio.listar();
  }

  @Post()
  guardar(@Body() dto: CrearColorDto) {
    return this.servicio.guardar(dto.hex);
  }

  /**
   * Elimina un color por hex.
   * IMPORTANTE: el cliente debe enviar el hex SIN el "#" porque rompe URLs.
   * Ejemplo: DELETE /colores-guardados/0a4d7a (no #0a4d7a)
   */
  @Delete(':hex')
  eliminar(@Param('hex') hex: string) {
    const hexCompleto = hex.startsWith('#') ? hex : `#${hex}`;
    return this.servicio.eliminar(hexCompleto);
  }
}