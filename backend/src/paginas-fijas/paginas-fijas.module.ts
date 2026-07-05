import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaginaFijaConfig } from './paginas-fijas.entity';
import { PaginasFijasService } from './paginas-fijas.service';
import { PaginasFijasController } from './paginas-fijas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaginaFijaConfig])],
  controllers: [PaginasFijasController],
  providers: [PaginasFijasService],
  exports: [PaginasFijasService],
})
export class PaginasFijasModule {}