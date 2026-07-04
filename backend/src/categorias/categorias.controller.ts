import { Controller, Get, Post, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CrearCategoriaDto } from './dto/categoria.dto';

@Controller('categorias')
export class CategoriasController {
  constructor(private service: CategoriasService) {}

  @Get()
  listar(@Query('tipo') tipo: 'servicio' | 'proyecto') {
    return this.service.listar(tipo);
  }

  @Post()
  crear(@Body() dto: CrearCategoriaDto) {
    return this.service.crear(dto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}