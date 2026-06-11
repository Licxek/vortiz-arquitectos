import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { ReporteGenerado } from './reporte-generado.entity';

@Injectable()
export class HistorialReportesService {
  private readonly logger = new Logger(HistorialReportesService.name);
  private readonly UPLOADS_DIR = '/app/uploads/reportes';

  constructor(
    @InjectRepository(ReporteGenerado)
    private repo: Repository<ReporteGenerado>,
  ) {
    this.asegurarDirectorio();
  }

  private asegurarDirectorio() {
    if (!fs.existsSync(this.UPLOADS_DIR)) {
      fs.mkdirSync(this.UPLOADS_DIR, { recursive: true });
      this.logger.log(`Carpeta creada: ${this.UPLOADS_DIR}`);
    }
  }

  /**
   * Guarda físicamente un PDF en /app/uploads/reportes y lo registra en BD.
   */
  async guardarReporte(opciones: {
    tipo: string;
    titulo: string;
    descripcion: string;
    rangoDesde: string;
    rangoHasta: string;
    pdfBuffer: Buffer;
    destinatarios: string[];
    emailEnviado: boolean;
    generadoPorId?: number;
    metadata?: any;
  }): Promise<ReporteGenerado> {
    const timestamp = Date.now();
    const nombreArchivo = `${opciones.tipo}_${timestamp}.pdf`;
    const rutaCompleta = path.join(this.UPLOADS_DIR, nombreArchivo);

    // Guardar archivo físico
    fs.writeFileSync(rutaCompleta, opciones.pdfBuffer);
    const tamanioKb = Math.round(opciones.pdfBuffer.length / 1024);

    // Registrar en BD
    const reporte = this.repo.create({
      tipo: opciones.tipo,
      titulo: opciones.titulo,
      descripcion: opciones.descripcion,
      rangoDesde: opciones.rangoDesde,
      rangoHasta: opciones.rangoHasta,
      archivo: nombreArchivo,
      tamanioKb,
      destinatarios: opciones.destinatarios || [],
      emailEnviado: opciones.emailEnviado,
      generadoPorId: opciones.generadoPorId || null,
      metadata: opciones.metadata || {},
    });

    return this.repo.save(reporte);
  }

  /**
   * Lista reportes con filtros opcionales.
   */
  async listar(filtros?: {
    tipo?: string;
    desde?: string;
    hasta?: string;
    limit?: number;
  }): Promise<ReporteGenerado[]> {
    const query = this.repo.createQueryBuilder('r')
      .leftJoinAndSelect('r.generadoPor', 'usuario')
      .orderBy('r.createdAt', 'DESC');

    if (filtros?.tipo) {
      query.andWhere('r.tipo = :tipo', { tipo: filtros.tipo });
    }
    if (filtros?.desde) {
      query.andWhere('r.createdAt >= :desde', { desde: filtros.desde });
    }
    if (filtros?.hasta) {
      query.andWhere('r.createdAt <= :hasta', { hasta: filtros.hasta });
    }
    if (filtros?.limit) {
      query.limit(filtros.limit);
    }

    return query.getMany();
  }

  /**
   * Obtiene un reporte por ID.
   */
  async obtenerPorId(id: number): Promise<ReporteGenerado> {
    const reporte = await this.repo.findOne({
      where: { id },
      relations: ['generadoPor'],
    });
    if (!reporte) {
      throw new NotFoundException(`Reporte ${id} no encontrado`);
    }
    return reporte;
  }

  /**
   * Lee el PDF físico desde disco.
   */
  async leerPDF(id: number): Promise<{ buffer: Buffer; filename: string; reporte: ReporteGenerado }> {
    const reporte = await this.obtenerPorId(id);
    const ruta = path.join(this.UPLOADS_DIR, reporte.archivo);

    if (!fs.existsSync(ruta)) {
      throw new NotFoundException(`Archivo físico del reporte ${id} no existe`);
    }

    const buffer = fs.readFileSync(ruta);
    return {
      buffer,
      filename: `vortiz-${reporte.tipo}-${reporte.rangoDesde}.pdf`,
      reporte,
    };
  }

  /**
   * Actualiza el campo destinatarios + emailEnviado tras re-envío.
   */
  async marcarReenviado(id: number, destinatarios: string[]): Promise<ReporteGenerado> {
    const reporte = await this.obtenerPorId(id);
    // Merge sin duplicados
    const todos = Array.from(new Set([...reporte.destinatarios, ...destinatarios]));
    reporte.destinatarios = todos;
    reporte.emailEnviado = true;
    return this.repo.save(reporte);
  }

  /**
   * Elimina registro + archivo físico.
   */
  async eliminar(id: number): Promise<void> {
    const reporte = await this.obtenerPorId(id);
    const ruta = path.join(this.UPLOADS_DIR, reporte.archivo);

    // Eliminar archivo físico (no falla si no existe)
    try {
      if (fs.existsSync(ruta)) {
        fs.unlinkSync(ruta);
      }
    } catch (err) {
      this.logger.warn(`No se pudo eliminar el archivo ${ruta}:`, err);
    }

    // Eliminar registro BD
    await this.repo.delete(id);
  }
}