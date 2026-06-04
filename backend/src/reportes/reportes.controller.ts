import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('kpis')
  async obtenerKpis(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.obtenerKpis(desde, hasta);
  }

  // 👇 NUEVOS endpoints para las 4 gráficas
  @Get('citas-por-mes')
  async obtenerCitasPorMes() {
    return this.reportesService.obtenerCitasPorMes();
  }

  @Get('categorias-servicios')
  async obtenerCategoriasServicios() {
    return this.reportesService.obtenerCategoriasServicios();
  }

  @Get('actividad-semanal')
  async obtenerActividadSemanal() {
    return this.reportesService.obtenerActividadSemanal();
  }

  @Get('clientes-nuevos')
  async obtenerClientesNuevos() {
    return this.reportesService.obtenerClientesNuevos();
  }

  @Get('detalle/:tipo')
  async obtenerDetalle(
    @Param('tipo') tipo: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.obtenerDetalle(tipo, desde, hasta);
  }

  @Get('heatmap-horarios')
  async obtenerHeatmapHorarios(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.obtenerHeatmapHorarios(desde, hasta);
  }

  @Get('funnel-conversion')
  async obtenerFunnelConversion(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.reportesService.obtenerFunnelConversion(desde, hasta);
  }
}
