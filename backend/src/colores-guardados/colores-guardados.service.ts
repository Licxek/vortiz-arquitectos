import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ColorGuardado } from './colores-guardados.entity';

@Injectable()
export class ColoresGuardadosService {
  private readonly LIMITE = 12;

  constructor(
    @InjectRepository(ColorGuardado) private repo: Repository<ColorGuardado>,
  ) {}

  /** Lista los colores más recientes (hasta el LIMITE) */
  async listar(): Promise<string[]> {
    const items = await this.repo.find({
      order: { updatedAt: 'DESC' },
      take: this.LIMITE,
    });
    return items.map((c) => c.hex);
  }

  /** Guarda un color (upsert). Si ya existe, actualiza updatedAt para que suba al tope */
  async guardar(hex: string): Promise<string[]> {
    const hexNorm = hex.toLowerCase();
    const existente = await this.repo.findOne({ where: { hex: hexNorm } });

    if (existente) {
      // Forzar actualización de updatedAt
      existente.updatedAt = new Date();
      await this.repo.save(existente);
    } else {
      const nuevo = this.repo.create({ hex: hexNorm });
      await this.repo.save(nuevo);

      // Limpiar excedentes: si hay más de LIMITE, borrar los más viejos
      const total = await this.repo.count();
      if (total > this.LIMITE) {
        const sobrantes = await this.repo.find({
          order: { updatedAt: 'ASC' },
          take: total - this.LIMITE,
        });
        await this.repo.remove(sobrantes);
      }
    }

    return this.listar();
  }

  /** Elimina un color por hex (sin el #). Devuelve la lista actualizada */
  async eliminar(hex: string): Promise<string[]> {
    const hexNorm = hex.toLowerCase();
    await this.repo.delete({ hex: hexNorm });
    return this.listar();
  }
}