import { Injectable, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { IAlmacenamiento, ResultadoUpload } from './almacenamiento.interface';

@Injectable()
export class LocalAlmacenamiento implements IAlmacenamiento {
  private readonly carpetaRaiz = join(process.cwd(), 'uploads');
  private readonly urlBase = process.env.PUBLIC_URL || 'http://localhost:3000';

  async subir(file: Express.Multer.File, carpeta: string): Promise<ResultadoUpload> {
    // Sanitizar carpeta (evitar path traversal)
    const carpetaSegura = carpeta.replace(/[^a-z0-9\-]/gi, '');
    if (!carpetaSegura) throw new BadRequestException('Carpeta inválida');

    // Generar nombre único
    const extension = extname(file.originalname).toLowerCase();
    const nombre = `${randomUUID()}${extension}`;

    // Asegurar que la carpeta exista
    const destino = join(this.carpetaRaiz, carpetaSegura);
    await fs.mkdir(destino, { recursive: true });

    // Escribir archivo
    const rutaCompleta = join(destino, nombre);
    await fs.writeFile(rutaCompleta, file.buffer);

    // Retornar URL pública (servida por NestJS estático)
    const publicId = `${carpetaSegura}/${nombre}`;
    return {
      url: `${this.urlBase}/uploads/${publicId}`,
      publicId,
    };
  }

  async eliminar(publicId: string): Promise<void> {
    // Sanitizar publicId
    if (publicId.includes('..')) return;
    const ruta = join(this.carpetaRaiz, publicId);
    try {
      await fs.unlink(ruta);
    } catch {
      // Si no existe, ignorar
    }
  }
}