import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Sesion } from './sesion.entity';
import { parseUserAgent } from './user-agent.parser';
import { MailService } from '../mail/mail.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { EmailLayoutService } from '../mail/email-layout.service';

@Injectable()
export class SesionesService {
  constructor(
    @InjectRepository(Sesion)
    private repo: Repository<Sesion>,
    private mailService: MailService,
    private usuariosService: UsuariosService,
    private emailLayout: EmailLayoutService,
  ) {}

  /** Hash determinístico del JWT para guardarlo (no guardamos el token en claro) */
  private hashearToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Registra una nueva sesión al hacer login */
  async registrar(
    usuarioId: number,
    token: string,
    userAgent: string,
    ip: string,
  ): Promise<Sesion> {
    const parsed = parseUserAgent(userAgent || '');
    const ubicacion = await this.obtenerUbicacion(ip); // 👈 NUEVO

    const sesion = this.repo.create({
      usuario: { id: usuarioId } as any,
      tokenHash: this.hashearToken(token),
      userAgent: userAgent || null,
      ip: ip || null,
      navegador: parsed.navegador,
      sistemaOperativo: parsed.sistemaOperativo,
      dispositivo: parsed.dispositivo,
      ubicacion, // 👈 ya no es null
      activa: true,
    });

    const guardada = await this.repo.save(sesion);

    // 👇 Llamamos la detección de nuevo dispositivo (sección 3)
    this.verificarDispositivoNuevo(usuarioId, guardada).catch((err) =>
      console.error('Error verificando nuevo dispositivo:', err),
    );

    return guardada;
  }

  /** Actualiza el último acceso de una sesión activa */
  async tocar(token: string): Promise<void> {
    const tokenHash = this.hashearToken(token);
    await this.repo.update(
      { tokenHash, activa: true },
      { ultimoAcceso: new Date() },
    );
  }

  /** Lista todas las sesiones activas del usuario */
  async listarPorUsuario(
    usuarioId: number,
    tokenActual: string,
  ): Promise<any[]> {
    const sesiones = await this.repo.find({
      where: { usuario: { id: usuarioId } as any, activa: true },
      order: { ultimoAcceso: 'DESC' },
    });
    const hashActual = this.hashearToken(tokenActual);
    return sesiones.map((s) => ({
      id: s.id,
      navegador: s.navegador,
      sistemaOperativo: s.sistemaOperativo,
      dispositivo: s.dispositivo,
      ip: s.ip,
      ubicacion: s.ubicacion,
      ultimoAcceso: s.ultimoAcceso,
      creadaEn: s.creadaEn,
      esActual: s.tokenHash === hashActual,
    }));
  }

  /** Cierra una sesión específica (verifica que pertenezca al usuario) */
  async cerrarSesion(sesionId: number, usuarioId: number): Promise<void> {
    await this.repo.update(
      { id: sesionId, usuario: { id: usuarioId } as any },
      { activa: false, cerradaEn: new Date() },
    );
  }

  /** Cierra TODAS las sesiones del usuario excepto la actual */
  async cerrarOtras(usuarioId: number, tokenActual: string): Promise<number> {
    const hashActual = this.hashearToken(tokenActual);
    const sesiones = await this.repo.find({
      where: { usuario: { id: usuarioId } as any, activa: true },
    });
    let cerradas = 0;
    for (const s of sesiones) {
      if (s.tokenHash !== hashActual) {
        s.activa = false;
        s.cerradaEn = new Date();
        await this.repo.save(s);
        cerradas++;
      }
    }
    return cerradas;
  }

  /** Verifica si un token sigue activo (para el JWT guard) */
  async estadoToken(
    token: string,
  ): Promise<'activa' | 'cerrada' | 'no_existe'> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const sesion = await this.repo.findOne({ where: { tokenHash } });
    if (!sesion) return 'no_existe';
    return sesion.activa ? 'activa' : 'cerrada';
  }

  /** Obtiene la ubicación a partir de una IP usando ip-api.com */
  private async obtenerUbicacion(ip: string): Promise<string | null> {
    if (!ip) return null;

    const ipLimpia = ip.replace(/^::ffff:/, '');

    // Skip IPs locales/privadas
    if (
      ipLimpia === '::1' ||
      ipLimpia.startsWith('127.') ||
      ipLimpia.startsWith('172.') ||
      ipLimpia.startsWith('192.168.') ||
      ipLimpia.startsWith('10.')
    ) {
      return null;
    }

    try {
      const response = await fetch(
        `http://ip-api.com/json/${ipLimpia}?fields=status,country,regionName,city`,
        { signal: AbortSignal.timeout(3000) },
      );
      const data = await response.json();
      if (data.status !== 'success') return null;

      const partes = [data.city, data.regionName, data.country].filter(Boolean);
      return partes.length > 0 ? partes.join(', ') : null;
    } catch (err) {
      console.error('Error geolocalizando IP:', err);
      return null;
    }
  }
  /** Detecta si es un dispositivo nuevo (no lo había visto antes) y notifica por correo */
  private async verificarDispositivoNuevo(
    usuarioId: number,
    sesionActual: Sesion,
  ): Promise<void> {
    // Buscar sesiones anteriores (excluyendo la actual)
    const sesionesAnteriores = await this.repo.find({
      where: { usuario: { id: usuarioId } as any },
      order: { creadaEn: 'DESC' },
      take: 50,
    });

    // Es nuevo si NO había una con la misma combinación de nav/SO/dispositivo
    const dispositivoConocido = sesionesAnteriores.some(
      (s) =>
        s.id !== sesionActual.id &&
        s.navegador === sesionActual.navegador &&
        s.sistemaOperativo === sesionActual.sistemaOperativo &&
        s.dispositivo === sesionActual.dispositivo,
    );

    if (!dispositivoConocido) {
      await this.notificarNuevoDispositivo(usuarioId, sesionActual);
    }
  }

  /** Envía correo de alerta de nuevo dispositivo */
  private async notificarNuevoDispositivo(
    usuarioId: number,
    sesion: Sesion,
  ): Promise<void> {
    try {
      const usuario = await this.usuariosService.findById(usuarioId);
      if (!usuario?.correo) return;

      const ctx = await this.emailLayout.obtenerContexto();
      const html = this.crearHtmlAlertaSesion(
        usuario.nombre || 'Usuario',
        sesion,
        ctx,
      );
      await this.mailService.enviar(
        usuario.correo,
        `🔐 Nuevo inicio de sesión — ${ctx.negocio.nombre}`,
        html,
      );
    } catch (err) {
      console.error('Error enviando alerta de dispositivo nuevo:', err);
    }
  }

  private crearHtmlAlertaSesion(
    nombre: string,
    sesion: Sesion,
    ctx: any,
  ): string {
    const fechaHora = new Date(sesion.creadaEn).toLocaleString('es-MX', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    const ubicacion = sesion.ubicacion || 'Ubicación no disponible';
    const ipLimpia =
      (sesion.ip || '').replace(/^::ffff:/, '') || 'No disponible';
    const dispositivo = `${sesion.navegador} en ${sesion.sistemaOperativo}`;

    const alertaBox = this.emailLayout.alertaSeguridad({
      titulo: 'Detalles del acceso',
      items: [
        { label: 'Dispositivo', valor: dispositivo },
        { label: 'Ubicación', valor: ubicacion },
        { label: 'Dirección IP', valor: ipLimpia },
        { label: 'Fecha y hora', valor: fechaHora },
      ],
    });

    const urlPerfil = `${process.env.FRONTEND_URL || 'https://vortizarquitectos.com.mx'}/admin/perfil`;
    const cta = this.emailLayout.botonCta({
      url: urlPerfil,
      texto: 'Revisar mi cuenta',
      variante: 'primary',
      apariencia: ctx.apariencia,
    });

    const nombreEscaped = this.emailLayout.escape(nombre);

    const contenido = `
      <p style="margin: 0 0 16px;">
        Hola <strong style="color: #0a4d7a;">${nombreEscaped}</strong>, detectamos un inicio de sesión en tu cuenta desde un <strong>dispositivo que no habíamos visto antes</strong>.
      </p>
      ${alertaBox}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 18px 0 8px;">
        <tr>
          <td style="padding: 4px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #1a2e4a;">
            <strong style="color: #2d7a4f;">¿Fuiste tú?</strong> No tienes que hacer nada — estás todo bien.
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #1a2e4a;">
            <strong style="color: #a83a2c;">¿No reconoces este acceso?</strong> Cambia tu contraseña <strong>de inmediato</strong> y cierra todas las sesiones desde tu perfil.
          </td>
        </tr>
      </table>
      ${cta}
      <p style="margin: 16px 0 0; color: #6b7a8c; font-size: 12px; font-style: italic;">
        Te enviamos esta alerta automáticamente cuando detectamos accesos desde dispositivos o ubicaciones nuevas.
      </p>`;

    return this.emailLayout.layout({
      eyebrow: 'Alerta de seguridad',
      titulo: 'Nuevo inicio de sesión',
      subtitulo: 'Detectamos acceso desde un dispositivo nuevo.',
      contenido,
      ctx,
    });
  }

  /** Cierra la sesión asociada a un token específico (usado al hacer logout) */
  async cerrarSesionPorToken(token: string): Promise<void> {
    if (!token) return;
    const tokenHash = this.hashearToken(token);
    await this.repo.update(
      { tokenHash, activa: true },
      { activa: false, cerradaEn: new Date() },
    );
  }
}
