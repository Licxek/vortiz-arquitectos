import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Body,
  Post,
  Res,
  Req,
} from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import { PdfReportesService } from './pdf-reportes.service';
import { EmailReportesService } from './email-reportes.service';
import { Delete } from '@nestjs/common';
import { HistorialReportesService } from './historial-reportes.service';
import { Request } from 'express';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(
    private readonly reportesService: ReportesService,
    private readonly pdfService: PdfReportesService,
    private readonly emailService: EmailReportesService,
    private readonly historialService: HistorialReportesService,
  ) {}

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

  @Post('generar-pdf/:tipo')
  async generarPDF(
    @Param('tipo') tipo: string,
    @Body()
    body: {
      desde?: string;
      hasta?: string;
      accion: 'descargar' | 'enviar' | 'ambas';
      destinatarios?: string[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validaciones
    const accionesValidas = ['descargar', 'enviar', 'ambas'];
    if (!accionesValidas.includes(body.accion)) {
      throw new BadRequestException(
        `Acción no válida: ${body.accion}. Usa 'descargar', 'enviar' o 'ambas'.`,
      );
    }
    if (
      (body.accion === 'enviar' || body.accion === 'ambas') &&
      (!body.destinatarios || body.destinatarios.length === 0)
    ) {
      throw new BadRequestException(
        'Para enviar el reporte por correo, especifica al menos un destinatario.',
      );
    }

    // Mapeo de títulos por tipo
    const titulos: { [key: string]: { titulo: string; descripcion: string } } =
      {
        'citas-por-mes': {
          titulo: 'Reporte de Citas por Mes',
          descripcion: 'Evolución mensual del volumen de citas agendadas',
        },
        'categorias-servicios': {
          titulo: 'Reporte de Categorías de Servicios',
          descripcion: 'Distribución de citas por categoría',
        },
        'actividad-semanal': {
          titulo: 'Reporte de Actividad Diaria',
          descripcion: 'Actividad diaria de citas en el período seleccionado',
        },
        'clientes-nuevos': {
          titulo: 'Reporte de Clientes Nuevos',
          descripcion: 'Clientes que reservan por primera vez',
        },
        visitas: {
          titulo: 'Reporte de Visitas al Sitio',
          descripcion: 'Tráfico web registrado en Google Analytics',
        },
      };

    const meta = titulos[tipo];
    if (!meta) {
      throw new BadRequestException(`Tipo de reporte no válido: ${tipo}`);
    }

    // Obtener los datos del reporte
    const detalle = await this.reportesService.obtenerDetalle(
      tipo,
      body.desde,
      body.hasta,
    );

    // Generar el PDF
    const pdfBuffer = await this.pdfService.generarReportePDF(
      detalle,
      meta.titulo,
      meta.descripcion,
    );

    // 🆕 Guardar en historial
    const usuarioId = (req as any).user?.id || (req as any).user?.sub;
    const reporteGuardado = await this.historialService.guardarReporte({
      tipo,
      titulo: meta.titulo,
      descripcion: meta.descripcion,
      rangoDesde: detalle.rango.desde,
      rangoHasta: detalle.rango.hasta,
      pdfBuffer,
      destinatarios: body.destinatarios || [],
      emailEnviado: body.accion === 'enviar' || body.accion === 'ambas',
      generadoPorId: usuarioId,
      metadata: { accion: body.accion },
    });
    console.log(`📚 Reporte ${reporteGuardado.id} guardado en historial`);

    const fechaActual = new Date().toISOString().split('T')[0];
    const filename = `vortiz-${tipo}-${fechaActual}.pdf`;

    // Enviar por correo si aplica
    let emailResult: { enviados: number; previewUrl?: string } | null = null;
    if (body.accion === 'enviar' || body.accion === 'ambas') {
      const rangoTexto = `${detalle.rango.desde} al ${detalle.rango.hasta}`;
      emailResult = await this.emailService.enviarReporte({
        destinatarios: body.destinatarios!,
        titulo: meta.titulo,
        descripcion: meta.descripcion,
        rangoTexto,
        pdfBuffer,
        filename,
      });
    }

    // Responder según la acción
    if (body.accion === 'enviar') {
      res.json({
        mensaje: `Reporte enviado a ${emailResult!.enviados} destinatario(s).`,
        destinatarios: body.destinatarios,
        previewUrl: emailResult!.previewUrl,
      });
      return;
    }

    // 'descargar' o 'ambas' → mandar PDF como stream
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Si era 'ambas', agrega un header informativo
    if (body.accion === 'ambas' && emailResult) {
      res.setHeader('X-Email-Sent-To', emailResult.enviados.toString());
    }

    res.end(pdfBuffer);
    return;
  }

  // ============ HISTORIAL DE REPORTES (Sub-Fase B) ============

  @Get('historial')
  async listarHistorial(
    @Query('tipo') tipo?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.historialService.listar({
      tipo,
      desde,
      hasta,
      limit: limitNum,
    });
  }

  @Get('historial/:id/descargar')
  async descargarHistorial(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.historialService.leerPDF(
      parseInt(id, 10),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
    return;
  }

  @Post('historial/:id/reenviar')
  async reenviarHistorial(
    @Param('id') id: string,
    @Body() body: { destinatarios: string[] },
  ) {
    if (!body.destinatarios || body.destinatarios.length === 0) {
      throw new BadRequestException('Especifica al menos un destinatario.');
    }

    const { buffer, filename, reporte } = await this.historialService.leerPDF(
      parseInt(id, 10),
    );

    // Enviar email
    const result = await this.emailService.enviarReporte({
      destinatarios: body.destinatarios,
      titulo: reporte.titulo,
      descripcion: reporte.descripcion || '',
      rangoTexto: `${reporte.rangoDesde} al ${reporte.rangoHasta}`,
      pdfBuffer: buffer,
      filename,
    });

    // Actualizar BD
    await this.historialService.marcarReenviado(
      parseInt(id, 10),
      body.destinatarios,
    );

    return {
      mensaje: `Reporte reenviado a ${result.enviados} destinatario(s).`,
      destinatarios: body.destinatarios,
      previewUrl: result.previewUrl,
    };
  }

  @Delete('historial/:id')
  async eliminarHistorial(@Param('id') id: string) {
    await this.historialService.eliminar(parseInt(id, 10));
    return { mensaje: 'Reporte eliminado correctamente.' };
  }
}
