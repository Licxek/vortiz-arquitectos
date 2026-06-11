import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ⚠️ ajusta a tu ruta real

@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectos: ProyectosService) {}

  // Público
  @Get()
  findAll() {
    return this.proyectos.findAll();
  }

  // Admin: todos los proyectos (incluyendo borradores)
  @UseGuards(JwtAuthGuard)
  @Get('admin')
  findAllAdmin() {
    return this.proyectos.findAllAdmin();
  }

  // Protegidos
  @UseGuards(JwtAuthGuard)
  @Put('sync')
  sincronizar(@Body() lista: any[]) {
    return this.proyectos.sincronizar(lista);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.proyectos.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  crear(@Body() datos: any) {
    return this.proyectos.crear(datos);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() datos: any) {
    return this.proyectos.actualizar(id, datos);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.proyectos.eliminar(id);
  }
}