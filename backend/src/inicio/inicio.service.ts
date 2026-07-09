import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cita } from '../citas/cita.entity'; // ⚠️ ajusta la ruta
import { Proyecto } from '../proyectos/proyecto.entity'; // ⚠️ ajusta la ruta

type Periodo = 'hoy' | 'semana' | 'mes' | 'anio';

@Injectable()
export class InicioService {
  constructor(
    @InjectRepository(Cita) private citasRepo: Repository<Cita>,
    @InjectRepository(Proyecto) private proyectosRepo: Repository<Proyecto>,
  ) {}

  async obtenerStats(periodo: Periodo, timezone?: string) {
    const { desde, hasta } = this.rangoPorPeriodo(periodo, timezone);
    const previo = this.periodoAnterior(periodo, timezone);

    const [
      citasActual,
      citasPrevio,
      consultasActual,
      consultasPrevio,
      proyectosTotales,
    ] = await Promise.all([
      this.contarCitas(desde, hasta),
      this.contarCitas(previo.desde, previo.hasta),
      this.contarCitas(desde, hasta, 'consulta'),
      this.contarCitas(previo.desde, previo.hasta, 'consulta'),
      this.proyectosRepo.count(),
    ]);

    return {
      periodo,
      citas: {
        valor: citasActual,
        cambio: this.calcularCambio(citasActual, citasPrevio),
      },
      consultas: {
        valor: consultasActual,
        cambio: this.calcularCambio(consultasActual, consultasPrevio),
      },
      proyectos: {
        valor: proyectosTotales,
      },
      visitas: {
        valor: 0, // TODO: implementar al final con sistema de tracking
      },
    };
  }

  private async contarCitas(
    desde: string,
    hasta: string,
    tipo?: string,
  ): Promise<number> {
    const qb = this.citasRepo
      .createQueryBuilder('c')
      .where('c.fecha >= :desde', { desde })
      .andWhere('c.fecha <= :hasta', { hasta });
    if (tipo) qb.andWhere('c.tipo = :tipo', { tipo });
    return qb.getCount();
  }

  private calcularCambio(actual: number, previo: number): number {
    if (previo === 0) return actual > 0 ? 100 : 0;
    return Math.round(((actual - previo) / previo) * 100);
  }

  private rangoPorPeriodo(
    periodo: Periodo,
    timezone?: string,
  ): { desde: string; hasta: string } {
    const hoy = this.getHoy(timezone);
    hoy.setHours(0, 0, 0, 0);

    switch (periodo) {
      case 'hoy':
        return { desde: this.fmt(hoy), hasta: this.fmt(hoy) };
      case 'semana': {
        const diaSemana = hoy.getDay() || 7;
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - (diaSemana - 1));
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        return { desde: this.fmt(lunes), hasta: this.fmt(domingo) };
      }
      case 'mes': {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        return { desde: this.fmt(inicio), hasta: this.fmt(fin) };
      }
      case 'anio': {
        const inicio = new Date(hoy.getFullYear(), 0, 1);
        const fin = new Date(hoy.getFullYear(), 11, 31);
        return { desde: this.fmt(inicio), hasta: this.fmt(fin) };
      }
    }
  }

  private periodoAnterior(
    periodo: Periodo,
    timezone?: string,
  ): { desde: string; hasta: string } {
    const hoy = this.getHoy(timezone);
    hoy.setHours(0, 0, 0, 0);

    switch (periodo) {
      case 'hoy': {
        const ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);
        return { desde: this.fmt(ayer), hasta: this.fmt(ayer) };
      }
      case 'semana': {
        const diaSemana = hoy.getDay() || 7;
        const lunesAnt = new Date(hoy);
        lunesAnt.setDate(hoy.getDate() - (diaSemana - 1) - 7);
        const domingoAnt = new Date(lunesAnt);
        domingoAnt.setDate(lunesAnt.getDate() + 6);
        return { desde: this.fmt(lunesAnt), hasta: this.fmt(domingoAnt) };
      }
      case 'mes': {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        return { desde: this.fmt(inicio), hasta: this.fmt(fin) };
      }
      case 'anio': {
        const inicio = new Date(hoy.getFullYear() - 1, 0, 1);
        const fin = new Date(hoy.getFullYear() - 1, 11, 31);
        return { desde: this.fmt(inicio), hasta: this.fmt(fin) };
      }
    }
  }

  private fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async obtenerAgendaDelDia(timezone?: string) {
    const hoy = this.fmt(this.getHoy(timezone));
    return this.citasRepo.find({
      where: {
        fecha: hoy,
        estado: In(['pendiente', 'confirmada']),
      },
      order: { hora: 'ASC' },
      relations: ['servicio'],
    });
  }

  async obtenerConsultasPendientes() {
    // 1. Traer citas pendientes (igual que antes, pero SIN filtrar tipo)
    //    Los mensajes pueden llegar a citas de proyecto también
    const citas = await this.citasRepo.find({
      where: {
        tipo: 'consulta',
      },
      order: { createdAt: 'DESC' },
      relations: ['servicio'],
    });

    if (citas.length === 0) return citas;

    // 2. Último mensaje de cada cita en una sola query
    const ids = citas.map((c) => c.id);
    const ultimos = await this.citasRepo.manager.query(
      `
    SELECT DISTINCT ON ("citaId") 
      "citaId", id, texto, autor, metodo, "createdAt"
    FROM mensajes_consulta
    WHERE "citaId" = ANY($1)
    ORDER BY "citaId", "createdAt" DESC
    `,
      [ids],
    );

    const mapa = new Map<number, any>();
    ultimos.forEach((m: any) => mapa.set(m.citaId, m));

    // 3. Adjuntar ultimoMensaje a cada cita
    return citas.map((cita) => ({
      ...cita,
      ultimoMensaje: mapa.get(cita.id) || null,
    })) as any;
  }

  private getHoy(timezone?: string): Date {
    const tz = this.tzValido(timezone);
    const ahora = new Date();
    const enZona = new Date(ahora.toLocaleString('en-US', { timeZone: tz }));
    enZona.setHours(0, 0, 0, 0);
    return enZona;
  }

  private tzValido(tz?: string): string {
    const fallback = 'America/Mexico_City';
    if (!tz || typeof tz !== 'string') return fallback;
    try {
      new Date().toLocaleString('en-US', { timeZone: tz });
      return tz;
    } catch {
      return fallback;
    }
  }
  async obtenerProyectosRecientes(limit: number = 4) {
    return this.proyectosRepo.find({
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }
}
