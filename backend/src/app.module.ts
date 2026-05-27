import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CitasModule } from './citas/citas.module';
import { PagesModule } from './pages/pages.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { ProfileModule } from './profile/profile.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServiciosModule } from './servicios/servicios.module';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi'; // nuevo (opcional)
import { ConfiguracionModule } from './configuracion/configuracion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().min(32).required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize:  false,
      logging: process.env.NODE_ENV !== 'production', // (7) apaga logs en prod
    }),
    AuthModule,
    UsuariosModule,
    CitasModule,
    ServiciosModule,
    PagesModule,
    DashboardsModule,
    ProfileModule,
    ConfiguracionModule,
  ],
  controllers: [AppController],
  providers: [AppService ,{ provide: APP_GUARD, useClass: ThrottlerGuard },],
})
export class AppModule {}