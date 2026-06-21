import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CitasService } from './citas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EstadoCita } from './cita.entity';
import { Throttle } from '@nestjs/throttler';
import { CrearCitaDto } from './dto/crear-cita.dto';

@Controller('citas')
export class CitasController {
  constructor(private readonly servicio: CitasService) {}

  // 🔒 PÚBLICO — 3 citas por hora por IP (anti-spam)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post()
  crear(@Body() data: CrearCitaDto) {
    // 👈 tipo seguro
    return this.servicio.crear(data);
  }

  // 👇 ENDPOINT PÚBLICO — debe ir ANTES de @Get(':id')
  @Get('horarios-ocupados')
  async getHorariosOcupados(@Query('fecha') fecha: string) {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return { ocupadas: [] };
    }
    const ocupadas = await this.servicio.getHorariosOcupados(fecha); // 👈 this.servicio, no this.citasService
    return { ocupadas };
  }

  // PROTEGIDOS — admin (JWT + throttle global 60/min ya protegen)
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/responder')
  async responder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { mensaje: string },
  ) {
    if (!body.mensaje?.trim()) {
      throw new BadRequestException('El mensaje no puede estar vacío');
    }
    return this.servicio.responderConsulta(id, body.mensaje);
  }
}
