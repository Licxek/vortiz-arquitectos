import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotificacionEstado } from './notificacion-estado.entity';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(NotificacionEstado)
    private repo: Repository<NotificacionEstado>,
  ) {}

  /** Lista todos los estados del usuario */
  async listar(usuarioId: number) {
    return this.repo.find({
      where: { usuarioId },
      order: { updatedAt: 'DESC' },
    });
  }

  /** Marca una notificación como leída (upsert) */
  async marcarLeida(usuarioId: number, externalId: string) {
    if (!externalId) throw new BadRequestException('externalId requerido');

    let estado = await this.repo.findOne({
      where: { usuarioId, externalId },
    });

    if (!estado) {
      estado = this.repo.create({
        usuarioId,
        externalId,
        leida: true,
        leidaEn: new Date(),
      });
    } else {
      estado.leida = true;
      if (!estado.leidaEn) estado.leidaEn = new Date();
    }

    return this.repo.save(estado);
  }

  /** Marca una notificación como borrada */
  async marcarBorrada(usuarioId: number, externalId: string) {
    if (!externalId) throw new BadRequestException('externalId requerido');

    let estado = await this.repo.findOne({
      where: { usuarioId, externalId },
    });

    if (!estado) {
      estado = this.repo.create({
        usuarioId,
        externalId,
        borrada: true,
      });
    } else {
      estado.borrada = true;
    }

    return this.repo.save(estado);
  }

  /** Marca todas las pasadas como leídas (bulk) */
  async marcarTodasLeidas(usuarioId: number, externalIds: string[]) {
    if (!Array.isArray(externalIds) || externalIds.length === 0) {
      return { actualizadas: 0 };
    }

    const existentes = await this.repo.find({
      where: { usuarioId, externalId: In(externalIds) },
    });
    const existentesIds = new Set(existentes.map((e) => e.externalId));
    const ahora = new Date();

    // Actualizar los existentes
    for (const estado of existentes) {
      if (!estado.leida) {
        estado.leida = true;
        estado.leidaEn = ahora;
      }
    }

    // Crear los que no existen
    const nuevos = externalIds
      .filter((id) => !existentesIds.has(id))
      .map((externalId) =>
        this.repo.create({
          usuarioId,
          externalId,
          leida: true,
          leidaEn: ahora,
        }),
      );

    const todos = [...existentes, ...nuevos];
    await this.repo.save(todos);

    return { actualizadas: todos.length };
  }
}