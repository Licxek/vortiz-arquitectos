import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Pagina } from './pagina.entity';

@Injectable()
export class PaginasCronService {
  private readonly logger = new Logger(PaginasCronService.name);

  constructor(
    @InjectRepository(Pagina)
    private readonly paginasRepo: Repository<Pagina>,
  ) {}

  /**
   * 🕐 Se ejecuta cada minuto.
   * Busca páginas con estado='programada' cuya fecha_publicacion ya llegó
   * y las cambia a 'publicada'.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async publicarProgramadas() {
    try {
      const ahora = new Date();

      const paginasAPublicar = await this.paginasRepo.find({
        where: {
          estado: 'programada',
          fechaPublicacion: LessThanOrEqual(ahora),
        },
      });

      if (paginasAPublicar.length === 0) return;

      this.logger.log(
        `📅 Publicando ${paginasAPublicar.length} página(s) programada(s)...`,
      );

      for (const pagina of paginasAPublicar) {
        pagina.estado = 'publicada';
        await this.paginasRepo.save(pagina);
        this.logger.log(
          `✅ Página publicada: "${pagina.titulo}" (id=${pagina.id})`,
        );
      }
    } catch (err) {
      this.logger.error('Error publicando páginas programadas', err);
    }
  }
}