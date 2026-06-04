import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { LocalAlmacenamiento } from './local.almacenamiento';
import { ALMACENAMIENTO_TOKEN } from './almacenamiento.interface';

@Module({
  controllers: [UploadsController],
  providers: [
    {
      provide: ALMACENAMIENTO_TOKEN,
      useClass: LocalAlmacenamiento, // 👈 cambias UNA línea para usar Cloudinary
    },
  ],
})
export class UploadsModule {}