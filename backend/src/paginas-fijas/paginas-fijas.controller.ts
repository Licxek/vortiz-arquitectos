import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { PaginasFijasService } from './paginas-fijas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('paginas-fijas')
export class PaginasFijasController {
  constructor(private service: PaginasFijasService) {}

  // 🔓 Público — lo lee el navbar del sitio
  @Get()
  listar() {
    return this.service.listar();
  }

  // 🔒 Protegido — solo admin
  @UseGuards(JwtAuthGuard)
  @Patch(':slug')
  actualizar(@Param('slug') slug: string, @Body('visible') visible: boolean) {
    // Decodificar el slug (viene URL-encoded desde el frontend)
    const slugDecodificado = decodeURIComponent(slug);
    return this.service.actualizarVisibilidad(slugDecodificado, visible);
  }
}