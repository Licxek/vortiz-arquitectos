import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pagina } from './pagina.entity';
import { PaginasController } from './paginas.controller';
import { PaginasService } from './paginas.service';
import { PaginasCronService } from './paginas-cron.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pagina])],
  controllers: [PaginasController],
  providers: [PaginasService, PaginasCronService],
  exports: [PaginasService],
})
export class PaginasModule {}