import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CitasService } from './citas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ⚠️ ajusta a tu ruta real
import { EstadoCita } from './cita.entity';

@Controller('citas')
export class CitasController {
  constructor(private readonly servicio: CitasService) {}

  // PÚBLICO — el formulario de la web crea la cita
  @Post()
  crear(@Body() data: any) {
    return this.servicio.crear(data);
  }

  // PROTEGIDOS — admin
  @UseGuards(JwtAuthGuard)
  @Get()
  listar() {
    return this.servicio.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado') estado: EstadoCita,
  ) {
    return this.servicio.cambiarEstado(id, estado);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.eliminar(id);
  }
}