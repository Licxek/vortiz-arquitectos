import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
  // 🩺 Umbrales dinámicos según entorno
  // En dev (ts-node) el heap es naturalmente más alto por el compilador TS
  private readonly isProd = process.env.NODE_ENV === 'production';
  private readonly heapLimit = this.isProd
    ? 250 * 1024 * 1024 // 250 MB en producción (node directo)
    : 500 * 1024 * 1024; // 500 MB en desarrollo (ts-node)

  private readonly rssLimit = this.isProd
    ? 500 * 1024 * 1024 // 500 MB en producción
    : 1024 * 1024 * 1024; // 1 GB en desarrollo

  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  // 🩺 Healthcheck: skip throttle para que Docker/K8s no se bloquee
  @SkipThrottle()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // BD respondiendo en <1.5s
      () => this.db.pingCheck('database', { timeout: 1500 }),

      // Heap de Node (ajustado por entorno)
      () => this.memory.checkHeap('memory_heap', this.heapLimit),

      // RSS (memoria total del proceso, ajustado por entorno)
      () => this.memory.checkRSS('memory_rss', this.rssLimit),
    ]);
  }
}