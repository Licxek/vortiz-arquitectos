import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CodigoVerificacion,
  PropositoVerificacion,
} from './codigo-verificacion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { MailService } from '../mail/mail.service'; // ⚠️ ajusta la ruta a tu MailService
import { EmailLayoutService } from '../mail/email-layout.service';

@Injectable()
export class VerificacionService {
  constructor(
    @InjectRepository(CodigoVerificacion)
    private repo: Repository<CodigoVerificacion>,
    private mailService: MailService,
    private emailLayout: EmailLayoutService,
  ) {}

  /** Genera código de 6 dígitos y lo envía al correo del usuario */
  async generarYEnviar(
    usuario: Usuario,
    proposito: PropositoVerificacion,
    payload?: any,
  ): Promise<void> {
    // 1. Invalidar códigos anteriores del mismo propósito
    await this.repo.update(
      { usuario: { id: usuario.id } as any, proposito, usado: false },
      { usado: true },
    );

    // 2. Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEn = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // 3. Guardar en BD
    const registro = this.repo.create({
      usuario,
      codigo,
      proposito,
      payload: payload ? JSON.stringify(payload) : null,
      expiraEn,
    });
    await this.repo.save(registro);

    // 4. Enviar correo
    await this.enviarCorreo(usuario.correo, codigo, proposito);
  }

  /** Verifica el código y devuelve su payload si es válido */
  async verificar(
    usuarioId: number,
    codigo: string,
    proposito: PropositoVerificacion,
  ): Promise<any> {
    const registro = await this.repo.findOne({
      where: { usuario: { id: usuarioId } as any, proposito, usado: false },
      order: { createdAt: 'DESC' },
    });

    if (!registro) {
      throw new BadRequestException(
        'No hay código pendiente. Solicita uno nuevo.',
      );
    }

    if (registro.expiraEn < new Date()) {
      throw new BadRequestException('El código expiró. Solicita uno nuevo.');
    }

    if (registro.intentos >= 5) {
      registro.usado = true;
      await this.repo.save(registro);
      throw new BadRequestException(
        'Demasiados intentos fallidos. Solicita un código nuevo.',
      );
    }

    if (registro.codigo !== codigo.trim()) {
      registro.intentos += 1;
      await this.repo.save(registro);
      throw new BadRequestException(
        `Código incorrecto. Te quedan ${5 - registro.intentos} intentos.`,
      );
    }

    registro.usado = true;
    await this.repo.save(registro);

    return registro.payload ? JSON.parse(registro.payload) : null;
  }

  private async enviarCorreo(
    correoDestino: string,
    codigo: string,
    proposito: PropositoVerificacion,
  ) {
    const ctx = await this.emailLayout.obtenerContexto();

    const accion =
      proposito === 'cambiar_correo'
        ? 'cambiar tu correo'
        : 'cambiar tu contraseña';

    const accionCorta =
      proposito === 'cambiar_correo' ? 'Cambio de correo' : 'Cambio de contraseña';

    const cajaCodigo = this.emailLayout.cajaCodigo({
      codigo,
      label: 'Tu código de verificación',
    });

    const contenido = `
      <p style="margin: 0 0 16px;">
        Recibiste este código porque solicitaste <strong style="color: #0a4d7a;">${accion}</strong> en tu cuenta. Úsalo para confirmar la operación.
      </p>
      ${cajaCodigo}
      <p style="margin: 16px 0 12px; color: #1a2e4a; font-size: 13px;">
        Este código expira en <strong>10 minutos</strong>. Si no fuiste tú quien hizo esta solicitud, ignora este correo y considera <strong style="color: #a83a2c;">cambiar tu contraseña</strong> por seguridad.
      </p>
      <p style="margin: 0; color: #6b7a8c; font-size: 12px; font-style: italic;">
        Por seguridad, nunca compartas este código con nadie.
      </p>`;

    const html = this.emailLayout.layout({
      eyebrow: accionCorta,
      titulo: 'Tu código de verificación',
      subtitulo: `Necesario para ${accion}.`,
      contenido,
      ctx,
    });

    await this.mailService.enviar(
      correoDestino,
      `Tu código de verificación: ${codigo}`,
      html,
    );
  }
}
