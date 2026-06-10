// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { MailService } from '../mail/mail.service';
import { randomInt } from 'crypto';
import { SesionesService } from '../sesiones/sesiones.service';

interface IntentosEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthService implements OnModuleDestroy {
  // 🔒 Rate limit por email (en memoria, complementa el throttle por IP)
  private intentosLogin = new Map<string, IntentosEntry>();
  private readonly MAX_INTENTOS_LOGIN = 5;
  private readonly BLOQUEO_LOGIN_MS = 15 * 60 * 1000; // 15 min

  // 🧹 Cleanup periódico para evitar memory leak
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private usuarios: UsuariosService,
    private jwt: JwtService,
    private mail: MailService,
    private sesionesService: SesionesService, // 👈 AGREGAR
  ) {
    // Cada hora limpia entradas caducadas
    this.cleanupInterval = setInterval(
      () => this.limpiarIntentosCaducados(),
      60 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  private normalizar(correo: string): string {
    return correo.toLowerCase().trim();
  }

  async login(correo: string, password: string, userAgent: string, ip: string) {
    // 🔒 1) Verificar bloqueo por exceso de intentos
    const correoNorm = this.normalizar(correo);
    this.verificarBloqueoLogin(correoNorm);

    // 2) Buscar usuario
    const usuario = await this.usuarios.findByCorreo(correo);
    if (!usuario) {
      this.registrarIntentoLoginFallido(correo);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3) Comparar password
    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) {
      this.registrarIntentoLoginFallido(correo);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // ✅ 4) Login exitoso: limpiar contador
    this.intentosLogin.delete(correo);

    const payload = {
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    };
    const token = await this.jwt.signAsync(payload);

    // 👇 NUEVO: registrar la sesión
    try {
      await this.sesionesService.registrar(usuario.id, token, userAgent, ip);
    } catch (err) {
      // No bloqueamos el login si falla el registro de sesión
      console.error('Error registrando sesión:', err);
    }

    const { password: _, ...datos } = usuario;
    return { token, usuario: datos };
  }

  // PASO 1: genera y envía el código de 6 dígitos
  async solicitarRecuperacion(correo: string) {
    const usuario = await this.usuarios.findByCorreo(correo);
    if (usuario) {
      const codigo = randomInt(100000, 1000000).toString();
      usuario.resetToken = codigo;
      usuario.resetTokenExpira = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await this.usuarios.guardar(usuario);
      await this.mail.enviarRecuperacion(usuario.correo, codigo);
    }
    // Respondemos igual exista o no el correo (no revelar correos registrados)
    return {
      message: 'Si el correo existe, te enviamos un código de verificación.',
    };
  }

  // PASO 2: valida el código (sin consumirlo todavía)
  async verificarCodigo(correo: string, codigo: string) {
    const usuario = await this.usuarios.findByCorreo(correo);
    if (
      !usuario ||
      usuario.resetToken !== codigo ||
      !usuario.resetTokenExpira ||
      usuario.resetTokenExpira < new Date()
    ) {
      throw new BadRequestException('El código es inválido o ya expiró.');
    }
    return { message: 'Código verificado.' };
  }

  // PASO 3: cambia la contraseña y consume el código
  async restablecer(correo: string, codigo: string, nuevaPassword: string) {
    await this.verificarCodigo(correo, codigo); // re-valida por seguridad
    const usuario = await this.usuarios.findByCorreo(correo);
    usuario!.password = await bcrypt.hash(nuevaPassword, 12);
    usuario!.resetToken = null;
    usuario!.resetTokenExpira = null;
    await this.usuarios.guardar(usuario!);

    // ✅ Al restablecer, limpiar también el bloqueo de login
    this.intentosLogin.delete(correo);

    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }

  // ═══════════════════════════════════════════════════════════
  // 🔒 PRIVADOS — Rate limit por email
  // ═══════════════════════════════════════════════════════════

  private verificarBloqueoLogin(correo: string): void {
    const ahora = Date.now();
    const entry = this.intentosLogin.get(correo);

    if (!entry || entry.resetAt <= ahora) return;

    if (entry.count >= this.MAX_INTENTOS_LOGIN) {
      const minutos = Math.ceil((entry.resetAt - ahora) / 60000);
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente por exceso de intentos. Intenta en ${minutos} ${
          minutos === 1 ? 'minuto' : 'minutos'
        }.`,
      );
    }
  }

  private registrarIntentoLoginFallido(correo: string): void {
    const ahora = Date.now();
    const entry = this.intentosLogin.get(correo);

    if (entry && entry.resetAt > ahora) {
      entry.count++;
    } else {
      this.intentosLogin.set(correo, {
        count: 1,
        resetAt: ahora + this.BLOQUEO_LOGIN_MS,
      });
    }
  }

  private limpiarIntentosCaducados(): void {
    const ahora = Date.now();
    for (const [correo, entry] of this.intentosLogin.entries()) {
      if (entry.resetAt <= ahora) {
        this.intentosLogin.delete(correo);
      }
    }
  }
  async logout(token: string): Promise<void> {
    await this.sesionesService.cerrarSesionPorToken(token);
  }
}
