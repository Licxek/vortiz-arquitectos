import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export type PeriodoGA = 'hoy' | 'semana' | 'mes' | 'año';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private client: BetaAnalyticsDataClient | null = null;
  private propertyId = '';

  constructor(private config: ConfigService) {
    const clientEmail = this.config.get<string>('GA_CLIENT_EMAIL');
    const privateKeyRaw = this.config.get<string>('GA_PRIVATE_KEY');
    this.propertyId = this.config.get<string>('GA_PROPERTY_ID') || '';

    if (!clientEmail || !privateKeyRaw || !this.propertyId) {
      this.logger.warn('Google Analytics no configurado (faltan variables de entorno).');
      return;
    }

    try {
      // El private_key viene con \n literales, hay que convertirlos a saltos reales
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

      this.client = new BetaAnalyticsDataClient({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      });
      this.logger.log(`Google Analytics conectado (Property: ${this.propertyId})`);
    } catch (e) {
      this.logger.error('Error inicializando GA client', e);
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  /** Visitas para un periodo + % de cambio vs periodo anterior */
  async obtenerVisitas(periodo: PeriodoGA): Promise<{ valor: number; cambio: number }> {
    if (!this.client) return { valor: 0, cambio: 0 };

    const { actual, anterior } = this.calcularRangos(periodo);

    try {
      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [actual, anterior],
        metrics: [{ name: 'activeUsers' }],
      });

      const valorActual = Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);
      const valorAnterior = Number(response.rows?.[1]?.metricValues?.[0]?.value || 0);

      let cambio = 0;
      if (valorAnterior > 0) {
        cambio = Math.round(((valorActual - valorAnterior) / valorAnterior) * 100);
      } else if (valorActual > 0) {
        cambio = 100; // de 0 a algo
      }

      return { valor: valorActual, cambio };
    } catch (e) {
      this.logger.error('Error obteniendo visitas de GA', (e as Error).message);
      return { valor: 0, cambio: 0 };
    }
  }

  /** Dashboard rico para el modal de detalle (lo usaremos en Fase 5) */
  async obtenerDashboardDetalle() {
    if (!this.client) return { configurado: false };

    try {
      const startDate = '30daysAgo';
      const endDate = 'today';
      const property = `properties/${this.propertyId}`;

      // Ejecutamos todas las queries en paralelo para velocidad
      const [
        [sparkResp],
        [pagesResp],
        [countriesResp],
        [devicesResp],
        [sourcesResp],
      ] = await Promise.all([
        this.client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        }),
        this.client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pageTitle' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 5,
        }),
        this.client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 5,
        }),
        this.client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }],
        }),
        this.client.runReport({
          property,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionSource' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 5,
        }),
      ]);

      return {
        configurado: true,
        periodo: 'Últimos 30 días',
        sparkline: (sparkResp.rows || []).map((r) => ({
          fecha: r.dimensionValues?.[0]?.value || '',
          valor: Number(r.metricValues?.[0]?.value || 0),
        })),
        topPaginas: (pagesResp.rows || []).map((r) => ({
          nombre: r.dimensionValues?.[0]?.value || 'Sin título',
          vistas: Number(r.metricValues?.[0]?.value || 0),
        })),
        topPaises: (countriesResp.rows || []).map((r) => ({
          pais: r.dimensionValues?.[0]?.value || 'Desconocido',
          usuarios: Number(r.metricValues?.[0]?.value || 0),
        })),
        dispositivos: (devicesResp.rows || []).map((r) => ({
          tipo: r.dimensionValues?.[0]?.value || 'desconocido',
          usuarios: Number(r.metricValues?.[0]?.value || 0),
        })),
        topFuentes: (sourcesResp.rows || []).map((r) => ({
          fuente: r.dimensionValues?.[0]?.value || 'desconocido',
          usuarios: Number(r.metricValues?.[0]?.value || 0),
        })),
      };
    } catch (e) {
      this.logger.error('Error obteniendo dashboard de GA', (e as Error).message);
      return { configurado: false };
    }
  }

  private calcularRangos(periodo: PeriodoGA) {
    const map = {
      hoy: {
        actual: { startDate: 'today', endDate: 'today' },
        anterior: { startDate: 'yesterday', endDate: 'yesterday' },
      },
      semana: {
        actual: { startDate: '7daysAgo', endDate: 'today' },
        anterior: { startDate: '14daysAgo', endDate: '8daysAgo' },
      },
      mes: {
        actual: { startDate: '30daysAgo', endDate: 'today' },
        anterior: { startDate: '60daysAgo', endDate: '31daysAgo' },
      },
      año: {
        actual: { startDate: '365daysAgo', endDate: 'today' },
        anterior: { startDate: '730daysAgo', endDate: '366daysAgo' },
      },
    };
    return map[periodo];
  }
}