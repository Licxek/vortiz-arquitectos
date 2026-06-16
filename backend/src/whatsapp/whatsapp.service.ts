import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger('WhatsAppService');

  private get token(): string {
    return process.env.WHATSAPP_TOKEN || '';
  }

  private get phoneId(): string {
    return process.env.WHATSAPP_PHONE_ID || '';
  }

  /** ¿Está configurado WhatsApp? */
  get habilitado(): boolean {
    return !!this.token && !!this.phoneId;
  }

  constructor(private http: HttpService) {}

  /**
   * Envía un mensaje basado en template pre-aprobado por Meta.
   * Ejemplo: enviarTemplate('+5216181234567', 'recordatorio_cita_24h', ['Juan', '15 de junio', '10:00 AM'])
   */
  async enviarTemplate(
    telefono: string,
    templateName: string,
    parametros: string[] = [],
    idiomaCode = 'es_MX',
  ): Promise<boolean> {
    if (!this.habilitado) {
      this.logger.warn('WhatsApp no configurado (falta WHATSAPP_TOKEN o WHATSAPP_PHONE_ID), omitiendo envío');
      return false;
    }

    const numero = this.limpiarNumero(telefono);
    if (!numero) {
      this.logger.warn(`Número inválido para WhatsApp: ${telefono}`);
      return false;
    }

    const body = {
      messaging_product: 'whatsapp',
      to: numero,
      type: 'template',
      template: {
        name: templateName,
        language: { code: idiomaCode },
        components:
          parametros.length > 0
            ? [
                {
                  type: 'body',
                  parameters: parametros.map((p) => ({ type: 'text', text: p })),
                },
              ]
            : [],
      },
    };

    try {
      await firstValueFrom(
        this.http.post(
          `https://graph.facebook.com/v18.0/${this.phoneId}/messages`,
          body,
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      this.logger.log(`📱 WhatsApp enviado a ${numero}: ${templateName}`);
      return true;
    } catch (err: any) {
      this.logger.error(
        `Error WhatsApp: ${err.message}`,
        JSON.stringify(err.response?.data || {}),
      );
      return false;
    }
  }

  /** Convierte "+52 618 123-4567" o "618 123 4567" a "526181234567" */
  private limpiarNumero(telefono: string): string {
    if (!telefono) return '';
    let limpio = telefono.replace(/\D/g, '');
    // Si es número mexicano sin código de país, agregar 52
    if (limpio.length === 10) limpio = '52' + limpio;
    return limpio;
  }
}