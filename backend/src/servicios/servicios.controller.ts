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
import { ServiciosService } from './servicios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ⚠️ ajusta a tu ruta real

@Controller('servicios')
export class ServiciosController {
  constructor(private readonly servicios: ServiciosService) {}

  // Público (lo lee la web)
  @Get()
  findAll() {
    return this.servicios.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicios.findOne(id);
  }

  // Protegidos (admin)
  @UseGuards(JwtAuthGuard)
  @Post()
  crear(@Body() datos: any) {
    return this.servicios.crear(datos);
  }

  @UseGuards(JwtAuthGuard)
  @Put('sync')
  sincronizar(@Body() lista: any[]) {
    return this.servicios.sincronizar(lista);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() datos: any) {
    return this.servicios.actualizar(id, datos);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.servicios.eliminar(id);
  }
}