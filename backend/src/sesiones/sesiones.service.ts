import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Sesion } from './sesion.entity';
import { parseUserAgent } from './user-agent.parser';
import { MailService } from '../mail/mail.service';
import { UsuariosService } from '../usuarios/usuarios.service';

@Injectable()
export class SesionesService {
  constructor(
    @InjectRepository(Sesion)
    private repo: Repository<Sesion>,
    private mailService: MailService, // 👈 NUEVO
    private usuariosService: UsuariosService, // 👈 NUEVO
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

      const html = this.crearHtmlAlertaSesion(
        usuario.nombre || 'Usuario',
        sesion,
      );
      await this.mailService.enviar(
        usuario.correo,
        '🔐 Nuevo inicio de sesión en Vortiz Arquitectos',
        html,
      );
    } catch (err) {
      console.error('Error enviando alerta de dispositivo nuevo:', err);
    }
  }

  private crearHtmlAlertaSesion(nombre: string, sesion: Sesion): string {
    const fechaHora = new Date(sesion.creadaEn).toLocaleString('es-MX', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    const ubicacion = sesion.ubicacion || 'Ubicación no disponible';
    const ipLimpia =
      (sesion.ip || '').replace(/^::ffff:/, '') || 'No disponible';

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0a1f3d,#0a4d7a);padding:32px 28px;color:white;">
          <div style="font-size:28px;margin-bottom:6px;">🔐</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;">Nuevo inicio de sesión</h1>
          <p style="margin:6px 0 0;font-size:13px;opacity:0.85;">Detectamos acceso desde un dispositivo nuevo</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 28px;">
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
            Hola <strong style="color:#0a1f3d;">${nombre}</strong>, alguien inició sesión en tu cuenta desde un dispositivo que no habíamos visto antes.
          </p>

          <!-- Detalles -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:20px;">
            <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">📱 Dispositivo</td><td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;">${sesion.navegador} en ${sesion.sistemaOperativo}</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">🌍 Ubicación</td><td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${ubicacion}</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">🌐 IP</td><td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;font-family:monospace;">${ipLimpia}</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">🕐 Fecha</td><td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${fechaHora}</td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">
            <strong>¿Fuiste tú?</strong> No tienes que hacer nada.
          </p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
            <strong>¿No reconoces este acceso?</strong> Cambia tu contraseña inmediatamente y cierra todas las otras sesiones desde tu perfil.
          </p>

          <div style="text-align:center;margin:24px 0 8px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/admin/perfil" style="display:inline-block;padding:12px 28px;background:#0a4d7a;color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
              Revisar mi cuenta
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 28px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            Este correo se envió porque iniciaste sesión en Vortiz Arquitectos.<br>
            Si no fuiste tú, contacta al administrador del sistema.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
