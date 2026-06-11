import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ajusta ruta si es necesario
import { ActualizarPaginaDto, CrearPaginaDto } from './dto/pagina.dto';
import { PaginasService } from './paginas.service';

@Controller('paginas')
export class PaginasController {
  constructor(private readonly service: PaginasService) {}

  // ============ PÚBLICO ============

  /** GET /api/paginas → páginas publicadas y visibles (para el navbar) */
  @Get()
  findPublicas() {
    return this.service.findPublicas();
  }

  /** GET /api/paginas/slug/:slug → página pública por slug */
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  // ============ ADMIN ============

  /** GET /api/paginas/admin → TODAS las páginas (incluso borradores) */
  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAllAdmin() {
    return this.service.findAllAdmin();
  }

  /** GET /api/paginas/admin/:id → página por id (admin) */
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /** POST /api/paginas → crear nueva página */
  @Post()
  @UseGuards(JwtAuthGuard)
  crear(@Body() dto: CrearPaginaDto) {
    return this.service.crear(dto);
  }

  /** PUT /api/paginas/:id → actualizar */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPaginaDto,
  ) {
    return this.service.actualizar(id, dto);
  }

  /** DELETE /api/paginas/:id → eliminar */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}