import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servicio } from './servicio.entity';

@Injectable()
export class ServiciosService {
  constructor(@InjectRepository(Servicio) private repo: Repository<Servicio>) {}

  findAll() {
    return this.repo.find({ order: { orden: 'ASC', id: 'ASC' } });
  }

  async findOne(id: number) {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Servicio no encontrado');
    return s;
  }

  async crear(datos: Partial<Servicio>) {
    delete (datos as any).id;
    const ultimo = await this.repo.find({ order: { orden: 'DESC' }, take: 1 });
    const orden = (ultimo[0]?.orden ?? 0) + 1;
    const servicio = this.repo.create({ ...datos, orden });
    return this.repo.save(servicio);
  }

  async actualizar(id: number, datos: Partial<Servicio>) {
    const servicio = await this.findOne(id);
    delete (datos as any).id;
    Object.assign(servicio, datos);
    return this.repo.save(servicio);
  }

  async eliminar(id: number) {
    const servicio = await this.findOne(id);
    await this.repo.remove(servicio);
    return { message: 'Servicio eliminado', id };
  }

   async sincronizar(lista: Partial<Servicio>[]) {
    const existentes = await this.repo.find();
    const idsEnviados = lista.filter((s) => s.id).map((s) => s.id);

    // 1) borrar los que ya no están en la lista
    const aEliminar = existentes.filter((e) => !idsEnviados.includes(e.id));
    if (aEliminar.length) await this.repo.remove(aEliminar);

    // 2) crear/actualizar respetando el orden (orden = posición)
    const resultado: Servicio[] = [];
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
