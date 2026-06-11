import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ⚠️ ajusta la ruta
import { InicioService } from './inicio.service';

@UseGuards(JwtAuthGuard)
@Controller('inicio')
export class InicioController {
  constructor(private servicio: InicioService) {}

  @Get('stats')
  stats(
    @Query('periodo') periodo: 'hoy' | 'semana' | 'mes' | 'anio' = 'mes',
    @Headers('x-timezone') timezone?: string,
  ) {
    const valido = ['hoy', 'semana', 'mes', 'anio'].includes(periodo)
      ? periodo
      : 'mes';
    return this.servicio.obtenerStats(valido as any, timezone);
  }
  @Get('agenda')
  agenda(@Headers('x-timezone') timezone?: string) {
    return this.servicio.obtenerAgendaDelDia(timezone);
  }

  @Get('consultas-pendientes')
  consultasPendientes() {
    return this.servicio.obtenerConsultasPendientes();
  }

  @Get('proyectos-recientes')
  proyectosRecientes() {
    return this.servicio.obtenerProyectosRecientes(4);
  }
}
