import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { Cita } from './cita.entity';
import { MailService } from '../mail/mail.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';

@Injectable()
export class ResumenesService {
  private readonly logger = new Logger('ResumenesService');

  constructor(
    @InjectRepository(Cita) private citasRepo: Repository<Cita>,
    private mailService: MailService,
    private configuracionService: ConfiguracionService,
  ) {}

  /** Resumen diario - todos los días 8AM hora México */
  @Cron('0 8 * * *', { timeZone: 'America/Mexico_City' })
  async enviarResumenDiario() {
    const config = await this.configuracionService.obtener();
    if (!config.notificaciones?.resumenDiario) {
      return; // toggle apagado
    }

    const hoy = this.fechaHoy();
    const citasHoy = await this.citasRepo.find({
      where: {
        fecha: hoy,
        estado: In(['pendiente', 'confirmada']),
      },
      relations: ['servicio'],
      order: { hora: 'ASC' },
    });

    const stats = await this.statsDia(hoy);
    const html = this.htmlResumenDiario(hoy, citasHoy, stats);

    const destinatarios = await this.obtenerDestinatarios(config);
    if (destinatarios.length === 0) {
      this.logger.warn('No hay destinatarios para el resumen diario');
      return;
    }

    for (const correo of destinatarios) {
      await this.mailService
        .enviar(correo, `📅 Citas de hoy ${this.formatearFechaCorta(hoy)} · Vortiz`, html)
        .catch((err) => this.logger.error(`Error enviando resumen diario a ${correo}: ${err.message}`));
    }

    this.logger.log(`📊 Resumen diario enviado a ${destinatarios.length} destinatarios`);
  }

  /** Resumen semanal - lunes 8AM hora México */
  @Cron('0 8 * * 1', { timeZone: 'America/Mexico_City' })
  async enviarResumenSemanal() {
    const config = await this.configuracionService.obtener();
    if (!config.notificaciones?.resumenSemanal) {
      return;
    }

    const { inicio, fin } = this.rangoSemanaAnterior();
    const stats = await this.statsRango(inicio, fin);
    const citasProximas = await this.citasProximas();

    const html = this.htmlResumenSemanal(inicio, fin, stats, citasProximas);

    const destinatarios = await this.obtenerDestinatarios(config);
    if (destinatarios.length === 0) {
      this.logger.warn('No hay destinatarios para el resumen semanal');
      return;
    }

    for (const correo of destinatarios) {
      await this.mailService
        .enviar(correo, '📊 Resumen semanal · Vortiz', html)
        .catch((err) => this.logger.error(`Error enviando resumen semanal a ${correo}: ${err.message}`));
    }

    this.logger.log(`📊 Resumen semanal enviado a ${destinatarios.length} destinatarios`);
  }

  // ============ HELPERS DE QUERIES ============

  private async statsDia(fecha: string) {
    const result = await this.citasRepo
      .createQueryBuilder('c')
      .where('c.fecha = :fecha', { fecha })
      .select([
        'COUNT(*) as total',
        `SUM(CASE WHEN c.estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas`,
        `SUM(CASE WHEN c.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes`,
        `SUM(CASE WHEN c.estado = 'completada' THEN 1 ELSE 0 END) as completadas`,
        `SUM(CASE WHEN c.estado = 'no_asistio' THEN 1 ELSE 0 END) as no_asistio`,
      ])
      .getRawOne();

    return {
      total: parseInt(result?.total || '0'),
      confirmadas: parseInt(result?.confirmadas || '0'),
      pendientes: parseInt(result?.pendientes || '0'),
      completadas: parseInt(result?.completadas || '0'),
      noAsistio: parseInt(result?.no_asistio || '0'),
    };
  }

  private async statsRango(fechaInicio: string, fechaFin: string) {
    const result = await this.citasRepo
      .createQueryBuilder('c')
      .where('c.fecha BETWEEN :inicio AND :fin', { inicio: fechaInicio, fin: fechaFin })
      .select([
        'COUNT(*) as total',
        `SUM(CASE WHEN c.estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas`,
        `SUM(CASE WHEN c.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes`,
        `SUM(CASE WHEN c.estado = 'completada' THEN 1 ELSE 0 END) as completadas`,
        `SUM(CASE WHEN c.estado = 'no_asistio' THEN 1 ELSE 0 END) as no_asistio`,
        `SUM(CASE WHEN c.estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas`,
        `SUM(CASE WHEN c.tipo = 'consulta' THEN 1 ELSE 0 END) as consultas`,
        `SUM(CASE WHEN c.tipo = 'proyecto' THEN 1 ELSE 0 END) as proyectos`,
      ])
      .getRawOne();

    return {
      total: parseInt(result?.total || '0'),
      confirmadas: parseInt(result?.confirmadas || '0'),
      pendientes: parseInt(result?.pendientes || '0'),
      completadas: parseInt(result?.completadas || '0'),
      noAsistio: parseInt(result?.no_asistio || '0'),
      canceladas: parseInt(result?.canceladas || '0'),
      consultas: parseInt(result?.consultas || '0'),
      proyectos: parseInt(result?.proyectos || '0'),
    };
  }

  private async citasProximas() {
    const hoy = this.fechaHoy();
    const en7dias = this.sumarDias(hoy, 7);
    return this.citasRepo.find({
      where: {
        fecha: Between(hoy, en7dias),
        estado: In(['pendiente', 'confirmada']),
      },
      relations: ['servicio'],
      order: { fecha: 'ASC', hora: 'ASC' },
      take: 20,
    });
  }

  private async obtenerDestinatarios(config: any): Promise<string[]> {
    const correoConfig = (config.contacto?.correoNotificaciones || '').trim();
    if (correoConfig) return [correoConfig];
    return this.mailService.getAdminEmails();
  }

  // ============ HELPERS DE FECHA ============

  private fechaHoy(): string {
    const d = new Date();
    return this.formatoISO(d);
  }

  private formatoISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private sumarDias(fechaISO: string, dias: number): string {
    const d = new Date(fechaISO + 'T00:00:00');
    d.setDate(d.getDate() + dias);
    return this.formatoISO(d);
  }

  private rangoSemanaAnterior(): { inicio: string; fin: string } {
    const hoy = new Date();
    // Lunes anterior
    const diaSemana = hoy.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
    const diasAtrasAlLunesPasado = diaSemana === 0 ? 13 : diaSemana + 6;
    const lunesPasado = new Date(hoy);
    lunesPasado.setDate(hoy.getDate() - diasAtrasAlLunesPasado);
    const domingoPasado = new Date(lunesPasado);
    domingoPasado.setDate(lunesPasado.getDate() + 6);
    return {
      inicio: this.formatoISO(lunesPasado),
      fin: this.formatoISO(domingoPasado),
    };
  }

  private formatearFechaCorta(fechaISO: string): string {
    const d = new Date(fechaISO + 'T00:00:00');
    const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
  }

  private formatearFechaLarga(fechaISO: string): string {
    const d = new Date(fechaISO + 'T00:00:00');
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
  }

  // ============ PLANTILLAS HTML ============

  private layout(titulo: string, contenido: string): string {
    return `
<div style="font-family: Arial, sans-serif; background: #f3f4f6; padding: 24px;">
  <div style="max-width: 640px; margin: auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #0a1f3d, #0a4d7a); color: white; padding: 24px;">
      <h1 style="margin: 0; font-size: 22px;">Vortiz Arquitectos</h1>
      <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">${titulo}</p>
    </div>
    <div style="padding: 28px; color: #0a1f3d;">
      ${contenido}
    </div>
    <div style="background: #f9fafb; padding: 16px 28px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
      Este resumen se envía automáticamente. Puedes desactivarlo en admin → Configuración → Notificaciones.
    </div>
  </div>
</div>`;
  }

  private statBox(num: number, label: string, color: string): string {
    return `
    <div style="background: ${color}; padding: 16px; border-radius: 10px; text-align: center; flex: 1;">
      <p style="margin: 0; font-size: 28px; font-weight: bold; color: #0a1f3d;">${num}</p>
      <p style="margin: 4px 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${label}</p>
    </div>`;
  }

  private filaCita(cita: Cita, mostrarFecha = false): string {
    const tipoLabel = cita.tipo === 'proyecto' ? 'Proyecto' : 'Consulta';
    const servicioLabel = cita.servicio?.titulo || (cita.tipo === 'consulta' ? 'Consulta inicial' : 'Sin servicio');
    const fechaCol = mostrarFecha
      ? `<td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">${this.formatearFechaCorta(cita.fecha)}</td>`
      : '';

    const estadoColor = cita.estado === 'confirmada' ? '#16a34a' : '#d97706';

    return `
    <tr>
      ${fechaCol}
      <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: 600;">${cita.hora}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${cita.nombre}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${servicioLabel}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; color: ${estadoColor}; text-transform: uppercase; font-weight: 600;">${cita.estado}</td>
    </tr>`;
  }

  private htmlResumenDiario(fecha: string, citas: Cita[], stats: any): string {
    const cuerpoTabla = citas.length > 0
      ? citas.map((c) => this.filaCita(c)).join('')
      : `<tr><td colspan="4" style="padding: 24px; text-align: center; color: #9ca3af; font-size: 13px;">No hay citas agendadas para hoy</td></tr>`;

    return this.layout(
      `Resumen del ${this.formatearFechaLarga(fecha)}`,
      `
      <h2 style="color: #0a4d7a; margin: 0 0 16px;">Tu día de hoy</h2>

      <!-- Stats -->
      <div style="display: flex; gap: 12px; margin: 20px 0;">
        ${this.statBox(stats.total, 'Total citas', '#dbeafe')}
        ${this.statBox(stats.confirmadas, 'Confirmadas', '#dcfce7')}
        ${this.statBox(stats.pendientes, 'Pendientes', '#fef3c7')}
      </div>

      <!-- Tabla -->
      <h3 style="color: #0a4d7a; font-size: 15px; margin: 24px 0 8px;">Citas programadas</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Hora</th>
            <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Cliente</th>
            <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Servicio</th>
            <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${cuerpoTabla}
        </tbody>
      </table>

      <a href="https://vortizarquitectos.com.mx/admin/citas" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #0a4d7a; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">
        Ver todas las citas →
      </a>
      `,
    );
  }

  private htmlResumenSemanal(inicio: string, fin: string, stats: any, citasProximas: Cita[]): string {
    const cuerpoProximas = citasProximas.length > 0
      ? citasProximas.map((c) => this.filaCita(c, true)).join('')
      : `<tr><td colspan="5" style="padding: 24px; text-align: center; color: #9ca3af; font-size: 13px;">No hay citas próximas</td></tr>`;

    const tasaCompletadas = stats.total > 0 ? Math.round((stats.completadas / stats.total) * 100) : 0;
    const tasaAsistencia = (stats.completadas + stats.noAsistio) > 0
      ? Math.round((stats.completadas / (stats.completadas + stats.noAsistio)) * 100)
      : 0;

    return this.layout(
      `Resumen semanal: ${this.formatearFechaCorta(inicio)} – ${this.formatearFechaCorta(fin)}`,
      `
      <h2 style="color: #0a4d7a; margin: 0 0 8px;">¡Lunes productivo!</h2>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">Aquí va tu resumen de la semana anterior y las citas de esta.</p>

      <!-- Stats principales -->
      <h3 style="color: #0a4d7a; font-size: 14px; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Semana anterior</h3>
      <div style="display: flex; gap: 12px; margin: 12px 0;">
        ${this.statBox(stats.total, 'Total', '#dbeafe')}
        ${this.statBox(stats.completadas, 'Completadas', '#dcfce7')}
        ${this.statBox(stats.noAsistio, 'No asistió', '#fee2e2')}
      </div>

      <!-- Stats secundarias -->
      <div style="display: flex; gap: 12px; margin: 12px 0;">
        ${this.statBox(stats.consultas, 'Consultas', '#f3e8ff')}
        ${this.statBox(stats.proyectos, 'Proyectos', '#fed7aa')}
        ${this.statBox(tasaAsistencia, '% Asistencia', '#cffafe')}
      </div>

      <!-- Citas próximas -->
      <h3 style="color: #0a4d7a; font-size: 15px; margin: 32px 0 8px;">Próximos 7 días</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Fecha</th>
            <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Hora</th>
            <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Cliente</th>
            <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Servicio</th>
            <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${cuerpoProximas}
        </tbody>
      </table>

      <a href="https://vortizarquitectos.com.mx/admin/inicio" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #0a4d7a; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">
        Ver dashboard completo →
      </a>
      `,
    );
  }
}
