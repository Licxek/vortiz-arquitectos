import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cita } from '../citas/cita.entity';
import { ConsultaSnapshot } from './consulta-snapshot.entity';
import { ConsultaSnapshotsService } from './consulta-snapshots.service';

@Injectable()
export class ConsultaSnapshotsCronService {
  private readonly logger = new Logger(ConsultaSnapshotsCronService.name);

  constructor(
    @InjectRepository(Cita)
    private citasRepo: Repository<Cita>,
    @InjectRepository(ConsultaSnapshot)
    private snapshotsRepo: Repository<ConsultaSnapshot>,
    private snapshotsService: ConsultaSnapshotsService,
  ) {}

  /**
   * Se ejecuta todos los días a la 1:00 AM (hora del servidor).
   * Busca citas de tipo 'consulta' con fecha < hoy y sin snapshot,
   * y les genera un snapshot automático de tipo "automatico_archivado".
   */
  @Cron('0 1 * * *', {
    name: 'archivar-consultas-pasadas',
    timeZone: 'America/Mexico_City',
  })
  async archivarConsultasPasadas() {
    const inicio = Date.now();
    this.logger.log(
      '🌙 Iniciando auto-archivado nocturno de consultas pasadas...',
    );

    try {
      // 1. Fecha de hoy en formato YYYY-MM-DD (zona MX)
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
      const dd = String(hoy.getDate()).padStart(2, '0');
      const fechaHoy = `${yyyy}-${mm}-${dd}`;

      // 2. Traer todas las citas tipo consulta con fecha < hoy
      const citasPasadas = await this.citasRepo.find({
        where: {
          tipo: 'consulta',
          fecha: LessThan(fechaHoy),
        },
        select: ['id', 'nombre', 'fecha'],
      });

      if (citasPasadas.length === 0) {
        this.logger.log('✅ No hay citas pasadas para archivar.');
        return;
      }

      // 3. Filtrar las que ya tienen snapshot
      const idsCitasPasadas = citasPasadas.map((c) => c.id);
      const snapshotsExistentes = await this.snapshotsRepo.find({
        where: { citaId: In(idsCitasPasadas) },
        select: ['citaId'],
      });
      const idsConSnapshot = new Set(snapshotsExistentes.map((s) => s.citaId));

      const pendientesDeArchivar = citasPasadas.filter(
        (c) => !idsConSnapshot.has(c.id),
      );

      if (pendientesDeArchivar.length === 0) {
        this.logger.log(
          `✅ Todas las ${citasPasadas.length} citas pasadas ya tienen snapshot. Nada por hacer.`,
        );
        return;
      }

      // 4. Crear snapshots en secuencia
      this.logger.log(
        `📸 Archivando ${pendientesDeArchivar.length} de ${citasPasadas.length} citas pasadas...`,
      );

      let exitosos = 0;
      let fallidos = 0;
      for (const cita of pendientesDeArchivar) {
        try {
          await this.snapshotsService.crearSnapshot(
            cita.id,
            'automatico_archivado',
            null,
          );
          exitosos++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `❌ Error archivando cita ${cita.id} (${cita.nombre}): ${msg}`,
          );
          fallidos++;
        }
      }

      const elapsed = Date.now() - inicio;
      this.logger.log(
        `🌙 Auto-archivado nocturno completo. ` +
          `Exitosos: ${exitosos}, Fallidos: ${fallidos}, Tiempo: ${elapsed}ms`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`❌ Error en auto-archivado nocturno: ${msg}`, stack);
    }
  }
}
