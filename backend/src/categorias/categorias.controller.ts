import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CrearCategoriaDto } from './dto/categoria.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categorias')
export class CategoriasController {
  constructor(private service: CategoriasService) {}

  // 🔓 PÚBLICO — el admin las lee para llenar los dropdowns
  @Get()
  listar(@Query('tipo') tipo: 'servicio' | 'proyecto') {
    return this.service.listar(tipo);
  }

  // 🔒 PROTEGIDO — solo admin autenticado puede crear
  @UseGuards(JwtAuthGuard)
  @Post()
  crear(@Body() dto: CrearCategoriaDto) {
    return this.service.crear(dto);
  }

  // 🔒 PROTEGIDO — solo admin autenticado puede eliminar
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}