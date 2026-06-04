import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pagina } from './pagina.entity';
import { ActualizarPaginaDto, CrearPaginaDto } from './dto/pagina.dto';

@Injectable()
export class PaginasService {
  constructor(
    @InjectRepository(Pagina)
    private readonly repo: Repository<Pagina>,
  ) {}

  /** Para el navbar/menú público: solo páginas publicadas y visibles */
  findPublicas(): Promise<Pagina[]> {
    return this.repo.find({
      where: { estado: 'publicada', visible: true },
      order: { posicionMenu: 'ASC', titulo: 'ASC' },
    });
  }

  /** Página pública por slug (solo si está publicada y visible) */
  async findBySlug(slug: string): Promise<Pagina> {
    const pagina = await this.repo.findOne({
      where: { slug, estado: 'publicada', visible: true },
    });
    if (!pagina) {
      throw new NotFoundException(`Página con slug "${slug}" no encontrada`);
    }
    return pagina;
  }

  /** Para el admin: TODAS las páginas (incluyendo borradores y ocultas) */
  findAllAdmin(): Promise<Pagina[]> {
    return this.repo.find({
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Pagina> {
    const pagina = await this.repo.findOneBy({ id });
    if (!pagina) {
      throw new NotFoundException(`Página ${id} no encontrada`);
    }
    return pagina;
  }

  async crear(dto: CrearPaginaDto): Promise<Pagina> {
    const slug = this.generarSlug(dto.slug || dto.titulo);
    const existe = await this.repo.findOneBy({ slug });
    if (existe) {
      throw new ConflictException(`Ya existe una página con el slug "${slug}"`);
    }
    const pagina = this.repo.create({ ...dto, slug });
    return this.repo.save(pagina);
  }

  async actualizar(id: number, dto: ActualizarPaginaDto): Promise<Pagina> {
    const pagina = await this.findOne(id);
    if (dto.slug) {
      const slug = this.generarSlug(dto.slug);
      if (slug !== pagina.slug) {
        const conflicto = await this.repo.findOneBy({ slug });
        if (conflicto && conflicto.id !== id) {
          throw new ConflictException(`Ya existe otra página con el slug "${slug}"`);
        }
      }
      dto.slug = slug;
    }
    Object.assign(pagina, dto);
    return this.repo.save(pagina);
  }

  async eliminar(id: number): Promise<{ ok: boolean }> {
    const result = await this.repo.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Página ${id} no encontrada`);
    }
    return { ok: true };
  }

  /** Convierte un texto cualquiera en slug (lowercase, sin acentos, guiones) */
  private generarSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}