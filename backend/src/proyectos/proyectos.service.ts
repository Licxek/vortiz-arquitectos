import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proyecto } from './proyecto.entity';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto) private repo: Repository<Proyecto>,
  ) {}

  findAll() {
    return this.repo.find({
      where: { publicado: true },
      order: { orden: 'ASC', id: 'ASC' },
    });
  }

  // Admin: todos, ordenados por última actualización (más recientes primero)
  findAllAdmin() {
    return this.repo.find({
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Proyecto no encontrado');
    return p;
  }

  async crear(datos: Partial<Proyecto>) {
    delete (datos as any).id;
    const ultimo = await this.repo.find({ order: { orden: 'DESC' }, take: 1 });
    const orden = (ultimo[0]?.orden ?? 0) + 1;
    const proyecto = this.repo.create({ ...datos, orden });
    return this.repo.save(proyecto);
  }

  async actualizar(id: number, datos: Partial<Proyecto>) {
    const proyecto = await this.findOne(id);
    delete (datos as any).id;
    Object.assign(proyecto, datos);
    return this.repo.save(proyecto);
  }

  async eliminar(id: number) {
    const proyecto = await this.findOne(id);
    await this.repo.remove(proyecto);
    return { message: 'Proyecto eliminado', id };
  }

  async sincronizar(lista: Partial<Proyecto>[]) {
    const existentes = await this.repo.find();
    const idsEnviados = lista.filter((p) => p.id).map((p) => p.id);

    const aEliminar = existentes.filter((e) => !idsEnviados.includes(e.id));
    if (aEliminar.length) await this.repo.remove(aEliminar);

    const resultado: Proyecto[] = [];
    for (let i = 0; i < lista.length; i++) {
      const datos = lista[i];
      const orden = i + 1;
      if (datos.id) {
        const existente = await this.repo.findOne({ where: { id: datos.id } });
        if (existente) {
          Object.assign(existente, datos, { orden });
          resultado.push(await this.repo.save(existente));
          continue;
        }
      }
      const nuevo = this.repo.create({ ...datos, orden });
      delete (nuevo as any).id;
      resultado.push(await this.repo.save(nuevo));
    }
    return resultado;
  }
}