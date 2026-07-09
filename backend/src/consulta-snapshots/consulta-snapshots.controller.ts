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
import { Response } from 'express';
import { PdfConsultaService } from './pdf-consulta.service';
import {Res, StreamableFile } from '@nestjs/common';

@Controller('consulta-snapshots')
@UseGuards(JwtAuthGuard)
export class ConsultaSnapshotsController {
  constructor(
    private service: ConsultaSnapshotsService,
    private pdfConsultaService: PdfConsultaService,
  ) {}

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
  @Get(':id/pdf')
  async descargarPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const snapshot = await this.service.obtenerPorId(id);
    const pdfBuffer = await this.pdfConsultaService.generarPdfDeSnapshot(snapshot);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="snapshot-${snapshot.id}-${snapshot.clienteSnapshot.nombre.toLowerCase().replace(/\s+/g, '-')}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}