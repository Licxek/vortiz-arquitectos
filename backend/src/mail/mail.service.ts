// src/mail/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');

  async enviarRecuperacion(correo: string, codigo: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`Código de recuperación para ${correo}: ${codigo}`);
      return;
    }
    // PRODUCCIÓN: enviar por Nodemailer (lo enchufamos al final)
  }
}