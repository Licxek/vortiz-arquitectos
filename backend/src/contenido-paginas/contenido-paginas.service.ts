import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContenidoPagina } from './contenido-pagina.entity';

const PAGINAS_PERMITIDAS = ['inicio', 'nosotros', 'proyectos', 'servicios', 'citas'];

@Injectable()
export class ContenidoPaginasService {
  constructor(
    @InjectRepository(ContenidoPagina)
    private repo: Repository<ContenidoPagina>,
  ) {}

  async obtenerTodo(): Promise<Record<string, Record<string, Record<string, string>>>> {
    const filas = await this.repo.find();
    const resultado: Record<string, Record<string, Record<string, string>>> = {};
    for (const f of filas) resultado[f.pagina] = f.contenido || {};
    return resultado;
  }

  async obtenerPagina(pagina: string) {
    const fila = await this.repo.findOne({ where: { pagina } });
    return fila?.contenido || {};
  }

  async guardar(
    pagina: string,
    contenido: Record<string, Record<string, string>>,
  ) {
    if (!PAGINAS_PERMITIDAS.includes(pagina)) {
      throw new BadRequestException(`Página no válida: ${pagina}`);
    }
    let fila = await this.repo.findOne({ where: { pagina } });
    if (!fila) {
      fila = this.repo.create({ pagina, contenido });
    } else {
      fila.contenido = contenido;
    }
    await this.repo.save(fila);
    return fila;
  }
}