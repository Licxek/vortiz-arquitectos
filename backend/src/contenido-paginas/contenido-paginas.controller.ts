import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ContenidoPaginasService } from './contenido-paginas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ⚠️ ajusta a tu ruta real

@Controller('contenido')
export class ContenidoPaginasController {
  constructor(private readonly servicio: ContenidoPaginasService) {}

  // Públicos
  @Get()
  obtenerTodo() {
    return this.servicio.obtenerTodo();
  }

  @Get(':pagina')
  obtenerPagina(@Param('pagina') pagina: string) {
    return this.servicio.obtenerPagina(pagina);
  }

  // Protegido
  @UseGuards(JwtAuthGuard)
  @Put(':pagina')
  guardar(
    @Param('pagina') pagina: string,
    @Body() contenido: Record<string, Record<string, any>>,
  ) {
    return this.servicio.guardar(pagina, contenido);
  }
}
