import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CodigoVerificacion,
  PropositoVerificacion,
} from './codigo-verificacion.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { MailService } from '../mail/mail.service'; // ⚠️ ajusta la ruta a tu MailService

@Injectable()
export class VerificacionService {
  constructor(
    @InjectRepository(CodigoVerificacion)
    private repo: Repository<CodigoVerificacion>,
    private mailService: MailService,
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
    const accion =
      proposito === 'cambiar_correo'
        ? 'cambiar tu correo'
        : 'cambiar tu contraseña';

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="background: linear-gradient(135deg, #0a1f3d 0%, #0a4d7a 100%); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; font-size: 22px; margin: 0;">Vortiz Arquitectos</h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0;">Código de verificación</p>
      </div>

      <div style="background: white; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 16px 16px;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          Recibiste este código porque solicitaste <strong>${accion}</strong> en tu cuenta.
        </p>

        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">
            Tu código
          </p>
          <p style="color: #0a4d7a; font-size: 36px; font-weight: 800; letter-spacing: 0.3em; margin: 0; font-family: 'Courier New', monospace;">
            ${codigo}
          </p>
        </div>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
          Este código expira en <strong>10 minutos</strong>.
          Si no fuiste tú quien lo solicitó, ignora este correo y considera cambiar tu contraseña.
        </p>
      </div>
    </div>
  `;

    await this.mailService.enviar(
      correoDestino,
      `Tu código de verificación: ${codigo}`,
      html,
    );
  }
}
