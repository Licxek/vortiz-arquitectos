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

  // 🔒 Protegido — solo admin: toggle de visibilidad
  @UseGuards(JwtAuthGuard)
  @Patch(':slug')
  actualizar(@Param('slug') slug: string, @Body('visible') visible: boolean) {
    const slugDecodificado = decodeURIComponent(slug);
    return this.service.actualizarVisibilidad(slugDecodificado, visible);
  }

  // 🔒 Protegido — solo admin: personalización visual (color + ícono)
  @UseGuards(JwtAuthGuard)
  @Patch(':slug/personalizacion')
  actualizarPersonalizacion(
    @Param('slug') slug: string,
    @Body() body: { color?: string | null; icono?: string | null },
  ) {
    const slugDecodificado = decodeURIComponent(slug);
    return this.service.actualizarPersonalizacion(slugDecodificado, body.color, body.icono);
  }
}