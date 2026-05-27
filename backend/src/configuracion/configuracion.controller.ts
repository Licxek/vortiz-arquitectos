import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private servicio: ConfiguracionService) {}

  @Get('publica') // público
  publica() {
    return this.servicio.obtenerPublica();
  }

  @UseGuards(JwtAuthGuard)
  @Get() // admin: completo
  obtener() {
    return this.servicio.obtener();
  }

  @UseGuards(JwtAuthGuard)
  @Put(':seccion') // admin: guardar una sección
  actualizar(@Param('seccion') seccion: string, @Body() datos: any) {
    return this.servicio.actualizarSeccion(seccion, datos);
  }
}