import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './categoria.entity';
import { CrearCategoriaDto } from './dto/categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria) private repo: Repository<Categoria>,
  ) {}

  async listar(tipo: 'servicio' | 'proyecto'): Promise<Categoria[]> {
    return this.repo.find({
      where: { tipo },
      order: { orden: 'ASC', label: 'ASC' },
    });
  }

  async crear(dto: CrearCategoriaDto): Promise<Categoria> {
    // Validar duplicado
    const existente = await this.repo.findOne({
      where: { tipo: dto.tipo, value: dto.value },
    });
    if (existente) {
      throw new BadRequestException(`Ya existe una categoría con ese identificador`);
    }

    const cat = this.repo.create({
      tipo: dto.tipo,
      value: dto.value,
      label: dto.label,
      orden: dto.orden ?? 999,
      esPersonalizada: true,
    });
    return this.repo.save(cat);
  }

  async eliminar(id: number): Promise<{ message: string }> {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    if (!cat.esPersonalizada) {
      throw new BadRequestException(
        'No se pueden eliminar categorías del sistema, solo las personalizadas',
      );
    }
    await this.repo.remove(cat);
    return { message: 'Categoría eliminada' };
  }

  /** Semilla las categorías del sistema si la tabla está vacía */
  async seedSiVacio(): Promise<void> {
    const total = await this.repo.count();
    if (total > 0) return;

    const servicios = [
      { value: 'tramites', label: 'Trámites', orden: 1 },
      { value: 'gerencia', label: 'Gerencia', orden: 2 },
      { value: 'diseno', label: 'Diseño', orden: 3 },
      { value: 'construccion', label: 'Construcción', orden: 4 },
      { value: 'especiales', label: 'Proyectos Especiales', orden: 5 },
    ];
    const proyectos = [
      { value: 'corporativo', label: 'Corporativo', orden: 1 },
      { value: 'industrial', label: 'Industrial', orden: 2 },
      { value: 'comercial', label: 'Comercial', orden: 3 },
      { value: 'residencial', label: 'Residencial', orden: 4 },
      { value: 'infraestructura', label: 'Infraestructura', orden: 5 },
      { value: 'institucional', label: 'Institucional', orden: 6 },
    ];

    const todos = [
      ...servicios.map((s) => ({ ...s, tipo: 'servicio' as const, esPersonalizada: false })),
      ...proyectos.map((p) => ({ ...p, tipo: 'proyecto' as const, esPersonalizada: false })),
    ];

    for (const cat of todos) {
      await this.repo.save(this.repo.create(cat));
    }
  }
}