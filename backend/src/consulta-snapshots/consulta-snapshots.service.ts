import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsultaSnapshot } from './consulta-snapshot.entity';
import { Cita } from '../citas/cita.entity';
import { MensajeConsulta } from '../citas/mensaje-consulta.entity';

// ⚠️ Ajusta el import de MensajeConsulta según donde esté tu entity de mensajes.
// Si no la tienes como entity separada, avísame y ajustamos.

@Injectable()
export class ConsultaSnapshotsService {
  constructor(
    @InjectRepository(ConsultaSnapshot)
    private snapshotsRepo: Repository<ConsultaSnapshot>,
    @InjectRepository(Cita)
    private citasRepo: Repository<Cita>,
    @InjectRepository(MensajeConsulta)
    private mensajesRepo: Repository<MensajeConsulta>,
  ) {}

  async crearSnapshot(
    citaId: number,
    motivo: 'automatico_resuelto' | 'automatico_archivado' | 'manual',
    creadoPor: number | null,
  ): Promise<ConsultaSnapshot> {
    const cita = await this.citasRepo.findOne({
      where: { id: citaId },
      relations: ['servicio'],
    });

    if (!cita) throw new NotFoundException(`Cita ${citaId} no encontrada`);

    const mensajes = await this.mensajesRepo.find({
      where: { citaId },
      order: { createdAt: 'ASC' },
    });

    const clienteSnapshot = {
      nombre: cita.nombre,
      correo: cita.correo,
      telefono: cita.telefono,
    };

    const consultaSnapshot = {
      id: cita.id,
      tipo: cita.tipo,
      motivo: cita.motivo,
      servicio: cita.servicio?.titulo || null,
      fecha: cita.fecha,
      hora: cita.hora,
      estado: cita.estado,
      createdAt: cita.createdAt,
    };

    const mensajesSnapshot = mensajes.map((m) => ({
      id: m.id,
      autor: m.autor,
      texto: m.texto,
      metodo: m.metodo,
      createdAt: m.createdAt,
    }));

    // Duración: días entre creación de la cita y ahora
    const inicio = new Date(cita.createdAt).getTime();
    const fin = Date.now();
    const duracionDias = Math.max(0, Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)));

    const snapshot = this.snapshotsRepo.create({
      citaId,
      motivo,
      clienteSnapshot,
      consultaSnapshot,
      mensajesSnapshot,
      totalMensajes: mensajes.length,
      duracionDias,
      creadoPor,
    });

    return this.snapshotsRepo.save(snapshot);
  }

  async listarTodos(): Promise<ConsultaSnapshot[]> {
    return this.snapshotsRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['usuario'],
    });
  }

  async obtenerPorCita(citaId: number): Promise<ConsultaSnapshot[]> {
    return this.snapshotsRepo.find({
      where: { citaId },
      order: { createdAt: 'DESC' },
      relations: ['usuario'],
    });
  }

  async obtenerPorId(id: number): Promise<ConsultaSnapshot> {
    const snapshot = await this.snapshotsRepo.findOne({
      where: { id },
      relations: ['usuario'],
    });
    if (!snapshot) throw new NotFoundException(`Snapshot ${id} no encontrado`);
    return snapshot;
  }

  async eliminar(id: number): Promise<void> {
    const snapshot = await this.obtenerPorId(id);
    await this.snapshotsRepo.remove(snapshot);
  }
}