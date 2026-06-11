import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContenidoPagina } from './contenido-pagina.entity';
import { ContenidoPaginasService } from './contenido-paginas.service';
import { ContenidoPaginasController } from './contenido-paginas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContenidoPagina])],
  controllers: [ContenidoPaginasController],
  providers: [ContenidoPaginasService],
})
export class ContenidoPaginasModule {}