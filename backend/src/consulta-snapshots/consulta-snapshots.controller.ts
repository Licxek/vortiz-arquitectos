import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ConsultaSnapshotsService } from './consulta-snapshots.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('consulta-snapshots')
@UseGuards(JwtAuthGuard)
export class ConsultaSnapshotsController {
  constructor(private service: ConsultaSnapshotsService) {}

  @Post()
  crear(
    @Body() body: { citaId: number; motivo: 'automatico_resuelto' | 'automatico_archivado' | 'manual' },
    @Request() req: any,
  ) {
    const userId = req.user?.sub || null;
    return this.service.crearSnapshot(body.citaId, body.motivo, userId);
  }

  @Get()
  listarTodos() {
    return this.service.listarTodos();
  }

  @Get('por-cita/:citaId')
  obtenerPorCita(@Param('citaId', ParseIntPipe) citaId: number) {
    return this.service.obtenerPorCita(citaId);
  }

  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerPorId(id);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}