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
}