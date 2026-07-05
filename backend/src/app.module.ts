import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CitasModule } from './citas/citas.module';
import { PaginasModule } from './paginas/paginas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServiciosModule } from './servicios/servicios.module';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi'; // nuevo (opcional)
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { ContenidoPaginasModule } from './contenido-paginas/contenido-paginas.module';
import { MailModule } from './mail/mail.module';
import { PerfilModule } from './perfil/perfil.module';
import { InicioModule } from './inicio/inicio.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthModule } from './health/health.module';
import { ReportesModule } from './reportes/reportes.module';
import { SesionesModule } from './sesiones/sesiones.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ScheduleModule } from '@nestjs/schedule';  // 👈 AGREGAR import
import { ImapModule } from './imap/imap.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { ColoresGuardadosModule } from './colores-guardados/colores-guardados.module';
import { CategoriasModule } from './categorias/categorias.module';
import { PaginasFijasModule } from './paginas-fijas/paginas-fijas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        // === Entorno ===
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),

        // === Base de datos ===
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),

        // === JWT ===
        JWT_SECRET: Joi.string().min(32).required(),

        // === Email ===
        SMTP_HOST: Joi.string().allow('').default(''),
        SMTP_PORT: Joi.number().default(587),
        SMTP_USER: Joi.string().allow('').default(''),
        SMTP_PASS: Joi.string().allow('').default(''),
        SMTP_FROM: Joi.string().default('no-reply@vortizarquitectos.com'),

        // === CORS y URL pública ===
        CORS_ORIGINS: Joi.string().required(),
        PUBLIC_URL: Joi.string().uri().required(),

        // === Throttling (opcional pero recomendado configurable) ===
        THROTTLE_TTL: Joi.number().default(60000),
        THROTTLE_LIMIT: Joi.number().default(60),

        GA_PROPERTY_ID: Joi.string().optional(),
        GA_CLIENT_EMAIL: Joi.string().email().optional(),
        GA_PRIVATE_KEY: Joi.string().optional(),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 10, // máx 10 req/seg (anti-DDoS)
      },
      {
        name: 'medium',
        ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hora
        limit: 1000, // máx 1000 req/hora (anti-bot)
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production', // (7) apaga logs en prod
    }),
    AuthModule,
    UsuariosModule,
    CitasModule,
    ServiciosModule,
    PaginasModule,
    ConfiguracionModule,
    ProyectosModule,
    ContenidoPaginasModule,
    MailModule,
    PerfilModule,
    InicioModule,
    UploadsModule,
    HealthModule,
    ReportesModule,
    SesionesModule,
    AnalyticsModule,
    WhatsAppModule,
    ScheduleModule.forRoot(),
    ImapModule,
    NotificacionesModule,
    ColoresGuardadosModule,
    CategoriasModule,
    PaginasFijasModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
