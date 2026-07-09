import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginaFijaConfig } from './paginas-fijas.entity';

@Injectable()
export class PaginasFijasService {
  constructor(
    @InjectRepository(PaginaFijaConfig) private repo: Repository<PaginaFijaConfig>,
  ) {}

  async listar(): Promise<PaginaFijaConfig[]> {
    return this.repo.find();
  }

  async actualizarVisibilidad(slug: string, visible: boolean): Promise<PaginaFijaConfig> {
    let config = await this.repo.findOne({ where: { slug } });
    if (!config) {
      config = this.repo.create({ slug, visible });
    } else {
      config.visible = visible;
    }
    return this.repo.save(config);
  }

  /**
   * Actualiza la personalización visual (color e ícono) de una página fija.
   * Cualquier campo undefined se conserva; NULL explícito lo resetea al default.
   */
  async actualizarPersonalizacion(
    slug: string,
    color?: string | null,
    icono?: string | null,
  ): Promise<PaginaFijaConfig> {
    let config = await this.repo.findOne({ where: { slug } });
    if (!config) {
      config = this.repo.create({ slug, visible: true, color, icono });
    } else {
      if (color !== undefined) config.color = color;
      if (icono !== undefined) config.icono = icono;
    }
    return this.repo.save(config);
  }
}