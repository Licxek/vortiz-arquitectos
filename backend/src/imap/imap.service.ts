import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { Cita } from '../citas/cita.entity';
import { MensajesConsultaService } from '../citas/mensajes-consulta.service';

@Injectable()
export class ImapService implements OnModuleInit {
  private readonly logger = new Logger(ImapService.name);
  private readonly enabled: boolean;
  private readonly host: string;
  private readonly port: number;
  private readonly user: string;
  private readonly password: string;
  private isProcesando = false;

  constructor(
    private mensajesService: MensajesConsultaService,
    @InjectRepository(Cita) private citaRepo: Repository<Cita>,
  ) {
    this.enabled = process.env.IMAP_POLLING_ENABLED === 'true';
    this.host = process.env.IMAP_HOST || 'imap.hostinger.com';
    this.port = parseInt(process.env.IMAP_PORT || '993', 10);
    this.user = process.env.SMTP_USER || '';
    this.password = process.env.SMTP_PASS || '';
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.warn(
        '⚠️  IMAP polling DESHABILITADO. Para activar: IMAP_POLLING_ENABLED=true',
      );
      return;
    }

    const userOk = this.user ? '✅' : '❌';
    const passOk = this.password ? '✅' : '❌';
    this.logger.log(
      `🔌 IMAP polling HABILITADO — ${this.user || '(usuario vacío)'} @ ${this.host}:${this.port} cada 2 min`,
    );
    this.logger.log(`   Credenciales: user ${userOk} | password ${passOk}`);

    if (!this.user || !this.password) {
      this.logger.error(
        '⚠️  Credenciales IMAP vacías. Verifica SMTP_USER / SMTP_PASS en .env.production',
      );
    }
  }

  /** Cron job: cada 2 minutos revisa el buzón */
  @Cron('*/2 * * * *', { name: 'imap-polling' })
  async pollInbox(): Promise<{ procesados: number; identificados: number }> {
    if (!this.enabled) {
      return { procesados: 0, identificados: 0 };
    }

    if (this.isProcesando) {
      this.logger.warn('Polling anterior aún en curso — saltando este ciclo');
      return { procesados: 0, identificados: 0 };
    }

    this.isProcesando = true;

    // Salvavidas: si pasa 90s, fuerza el reset del lock
    const lockTimeout = setTimeout(() => {
      if (this.isProcesando) {
        this.logger.error(
          '⏰ Lock de polling forzado a liberarse (timeout de seguridad 90s)',
        );
        this.isProcesando = false;
      }
    }, 90000);

    try {
      // Race entre el polling y un timeout de 60s
      const result = await Promise.race([
        this.procesarBuzon(),
        new Promise<{ procesados: number; identificados: number }>(
          (_, reject) =>
            setTimeout(
              () =>
                reject(new Error('Polling timeout (60s) — IMAP no respondió')),
              60000,
            ),
        ),
      ]);
      return result;
    } catch (err: any) {
      this.logger.error(`Error en polling IMAP: ${err.message}`);
      return { procesados: 0, identificados: 0 };
    } finally {
      clearTimeout(lockTimeout);
      this.isProcesando = false;
    }
  }

  private async procesarBuzon(): Promise<{
    procesados: number;
    identificados: number;
  }> {
    const client = new ImapFlow({
      host: this.host,
      port: this.port,
      secure: true,
      auth: {
        user: this.user,
        pass: this.password,
      },
      logger: false,
      socketTimeout: 20000, // ← 20s max sin actividad
      greetingTimeout: 10000, // ← 10s max para handshake
      disableAutoIdle: true, // ← evita conexión IDLE eterna
    });

    let procesados = 0;
    let identificados = 0;
    let connected = false;

    try {
      await client.connect();
      connected = true;
      const lock = await client.getMailboxLock('INBOX');

      try {
        // 1. Buscar SOLO respuestas a consultas Vortiz sin leer (filtro server-side)
        const searchResult = await client.search(
          {
            seen: false,
            subject: '[Vortiz #',
          },
          { uid: true },
        );

        if (!Array.isArray(searchResult) || searchResult.length === 0) {
          this.logger.log(
            `📨 Búsqueda IMAP: 0 respuestas de consultas sin leer`,
          );
          return { procesados: 0, identificados: 0 };
        }

        this.logger.log(
          `📨 Búsqueda IMAP: ${searchResult.length} respuestas de consultas sin leer`,
        );

        // 2. Procesar máximo 5 por polling, uno por uno con timeout individual
        const uidsAProcesar = searchResult.slice(0, 5);

        for (const uid of uidsAProcesar) {
          try {
            const message = await Promise.race([
              client.fetchOne(
                String(uid),
                { source: true, uid: true, envelope: true },
                { uid: true },
              ),
              new Promise<null>((_, reject) =>
                setTimeout(
                  () => reject(new Error(`fetch timeout (UID ${uid})`)),
                  15000,
                ),
              ),
            ]);

            if (message) {
              procesados++;
              const result = await this.procesarMensaje(client, message as any);
              if (result.identificado) identificados++;
            }
          } catch (err: any) {
            this.logger.warn(
              `⚠️  No se pudo procesar UID ${uid}: ${err.message}`,
            );
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      // Cierre garantizado con timeout — NUNCA se cuelga aquí
      if (connected) {
        try {
          await Promise.race([
            client.logout(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('logout timeout')), 5000),
            ),
          ]);
        } catch (err: any) {
          this.logger.warn(
            `Logout IMAP falló (forzando cierre): ${err.message}`,
          );
          try {
            client.close();
          } catch {
            // ya cerrado
          }
        }
      }
    }

    if (procesados > 0) {
      this.logger.log(
        `📬 Polling: ${procesados} revisados, ${identificados} identificados`,
      );
    }

    return { procesados, identificados };
  }

  private async procesarMensaje(
    client: ImapFlow,
    message: any,
  ): Promise<{ identificado: boolean }> {
    const uid = message.uid;
    try {
      const parsed = await simpleParser(message.source);

      // 1. Ignorar si el remitente es el mismo admin (evitar self-replies)
      const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase() || '';
      if (
        fromEmail === this.user.toLowerCase() ||
        fromEmail.endsWith('@vortizarquitectos.com.mx')
      ) {
        this.logger.debug(
          `UID ${uid} ignorado (remitente es interno: ${fromEmail})`,
        );
        await this.marcarComoLeido(client, uid);
        return { identificado: false };
      }

      // 2. Buscar identificador de consulta
      const consultaId = this.extraerConsultaId(parsed);
      if (!consultaId) {
        this.logger.debug(
          `UID ${uid} de ${fromEmail} ignorado (sin identificador Vortiz)`,
        );
        // NO marcar como leído — podría ser otro email del propio Vortiz
        return { identificado: false };
      }

      // 3. Verificar que la consulta existe
      const consulta = await this.citaRepo.findOne({
        where: { id: consultaId },
      });
      if (!consulta) {
        this.logger.warn(
          `UID ${uid} apunta a consulta #${consultaId} que no existe — marcando como leído`,
        );
        await this.marcarComoLeido(client, uid);
        return { identificado: false };
      }

      // 4. Extraer texto del email
      let texto = (parsed.text || '').trim();
      if (!texto && parsed.html) {
        texto = String(parsed.html)
          .replace(/<style[^>]*>.*?<\/style>/gis, '')
          .replace(/<script[^>]*>.*?<\/script>/gis, '')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
      }

      // 5. Limpiar firmas y respuestas anidadas
      texto = this.limpiarTextoEmail(texto);

      if (!texto) {
        this.logger.warn(
          `UID ${uid} para consulta #${consultaId} sin texto utilizable`,
        );
        await this.marcarComoLeido(client, uid);
        return { identificado: false };
      }

      // 6. Guardar mensaje en BD
      await this.mensajesService.crear(consultaId, {
        autor: 'cliente',
        texto,
        metodo: 'inbound',
      });

      this.logger.log(
        `✉️  Mensaje guardado: consulta #${consultaId} de ${fromEmail} (UID ${uid})`,
      );

      // 7. Marcar como leído
      await this.marcarComoLeido(client, uid);

      return { identificado: true };
    } catch (err: any) {
      this.logger.error(`Error procesando UID ${uid}: ${err.message}`);
      return { identificado: false };
    }
  }

  /** Extrae el ID de la consulta del email (header preferido > subject) */
  private extraerConsultaId(parsed: any): number | null {
    // 1. Buscar X-Vortiz-Consulta-Id header (preferido)
    const xHeader = parsed.headers?.get('x-vortiz-consulta-id');
    if (xHeader) {
      const valor = Array.isArray(xHeader) ? xHeader[0] : String(xHeader);
      const id = parseInt(valor, 10);
      if (!isNaN(id)) return id;
    }

    // 2. Fallback: buscar [Vortiz #X] en subject
    if (parsed.subject) {
      const match = String(parsed.subject).match(/\[Vortiz\s*#(\d+)\]/i);
      if (match) {
        const id = parseInt(match[1], 10);
        if (!isNaN(id)) return id;
      }
    }

    return null;
  }

  /** Quita líneas citadas, firmas y respuestas anidadas */
  private limpiarTextoEmail(texto: string): string {
    if (!texto) return '';

    const lineas = texto.split(/\r?\n/);
    const resultado: string[] = [];

    for (const linea of lineas) {
      const trimmed = linea.trim();

      // Detectar inicio de respuesta citada (varios idiomas)
      if (
        /^(El\s|On\s|Le\s|Am\s|Il\s).*(escribió|wrote|a écrit|schrieb|ha scritto)\s*:?\s*$/i.test(
          trimmed,
        )
      ) {
        break;
      }

      // Líneas tipo "From: ... Sent: ..." (Outlook)
      if (/^(De|From):\s/i.test(trimmed)) {
        break;
      }

      // Líneas citadas con >
      if (/^>/.test(trimmed)) {
        continue;
      }

      // Separador de firma "--"
      if (/^--\s*$/.test(trimmed)) {
        break;
      }

      resultado.push(linea);
    }

    return resultado.join('\n').trim();
  }

  private async marcarComoLeido(client: ImapFlow, uid: number): Promise<void> {
    try {
      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
    } catch (err: any) {
      this.logger.warn(
        `No se pudo marcar UID ${uid} como leído: ${err.message}`,
      );
    }
  }

  async debugInbox(): Promise<any> {
    const client = new ImapFlow({
      host: this.host,
      port: this.port,
      secure: true,
      auth: { user: this.user, pass: this.password },
      logger: false,
      socketTimeout: 20000,
      greetingTimeout: 10000,
      disableAutoIdle: true,
    });

    try {
      await client.connect();

      // Listar todas las carpetas
      const mailboxes = await client.list();
      const folders = mailboxes.map((mb) => mb.path);

      // Status del INBOX
      const status = await client.status('INBOX', {
        messages: true,
        unseen: true,
        recent: true,
      });

      // Últimos 10 mensajes del INBOX
      const lock = await client.getMailboxLock('INBOX');
      const lastMessages: any[] = [];

      try {
        const total = status.messages || 0;
        const startSeq = Math.max(1, total - 9);

        const fetchStream = client.fetch(`${startSeq}:*`, {
          envelope: true,
          flags: true,
          uid: true,
        });

        for await (const msg of fetchStream) {
          lastMessages.push({
            uid: msg.uid,
            from: msg.envelope?.from?.[0]?.address || '?',
            subject: msg.envelope?.subject || '(sin asunto)',
            date: msg.envelope?.date,
            seen: msg.flags ? msg.flags.has('\\Seen') : false,
            flags: msg.flags ? Array.from(msg.flags) : [],
          });
        }
      } finally {
        lock.release();
      }

      try {
        await client.logout();
      } catch {}

      return {
        folders,
        inbox: {
          total: status.messages || 0,
          unseen: status.unseen || 0,
          recent: status.recent || 0,
        },
        lastMessages: lastMessages.reverse(),
      };
    } catch (err: any) {
      try {
        await client.logout();
      } catch {}
      return { error: err.message, code: err.code };
    }
  }
}
