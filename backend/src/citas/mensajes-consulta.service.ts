import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MensajeConsulta, AutorMensaje, MetodoMensaje } from './mensaje-consulta.entity';
import { Cita } from './cita.entity';

@Injectable()
export class MensajesConsultaService {
  constructor(
    @InjectRepository(MensajeConsulta) private repo: Repository<MensajeConsulta>,
    @InjectRepository(Cita) private citaRepo: Repository<Cita>,
  ) {}

  listar(citaId: number) {
    return this.repo.find({
      where: { citaId },
      order: { createdAt: 'ASC' },
    });
  }

  async crear(
    citaId: number,
    data: { autor: AutorMensaje; texto: string; metodo?: MetodoMensaje },
  ) {
    if (!['cliente', 'admin'].includes(data.autor)) {
      throw new BadRequestException('Autor inválido');
    }
    if (!data.texto?.trim()) {
      throw new BadRequestException('El texto no puede estar vacío');
    }

    const cita = await this.citaRepo.findOne({ where: { id: citaId } });
    if (!cita) throw new NotFoundException('Consulta no encontrada');

    const mensaje = this.repo.create({
      citaId,
      autor: data.autor,
      texto: data.texto.trim(),
      metodo: data.metodo || null,
    });
    return this.repo.save(mensaje);
  }

  async contarPorCita(citaId: number): Promise<number> {
    return this.repo.count({ where: { citaId } });
  }
}