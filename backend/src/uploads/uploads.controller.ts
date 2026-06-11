import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseFilePipeBuilder,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ajusta a tu path
import {
  IAlmacenamiento,
  ALMACENAMIENTO_TOKEN,
} from './almacenamiento.interface';

const TIPOS_PERMITIDOS = /^image\/(jpeg|png|webp|svg\+xml|gif)$/;
const MAX_SIZE_MB = 5;

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(
    @Inject(ALMACENAMIENTO_TOKEN) private almacenamiento: IAlmacenamiento,
  ) {}

  @Post('imagen')
  @UseInterceptors(FileInterceptor('archivo'))
  async subirImagen(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_SIZE_MB * 1024 * 1024 })
        .addFileTypeValidator({ fileType: TIPOS_PERMITIDOS })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
    @Body('carpeta') carpeta?: string,
  ) {
    const carpetaFinal = (carpeta || 'general').toLowerCase();
    return await this.almacenamiento.subir(file, carpetaFinal);
  }

  @Delete('imagen')
  async eliminarImagen(@Body('publicId') publicId: string) {
    if (!publicId) throw new BadRequestException('publicId requerido');
    await this.almacenamiento.eliminar(publicId);
    return { eliminado: true };
  }
}