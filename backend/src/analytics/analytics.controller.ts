import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService, PeriodoGA } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('estado')
  estado() {
    return { configurado: this.service.isConfigured() };
  }

  @Get('visitas')
  async obtenerVisitas(@Query('periodo') periodo: string) {
    const periodosValidos: PeriodoGA[] = ['hoy', 'semana', 'mes', 'año'];
    const p: PeriodoGA = periodosValidos.includes(periodo as PeriodoGA)
      ? (periodo as PeriodoGA)
      : 'mes';
    return this.service.obtenerVisitas(p);
  }

  @Get('dashboard')
  async obtenerDashboard() {
    return this.service.obtenerDashboardDetalle();
  }
}