import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('Falta JWT_SECRET en el .env');
  }

  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: isProd
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // 1) Trust proxy — necesario detrás de nginx para que el throttler reciba la IP real
  app.set('trust proxy', 1);

  // 2) Helmet con HSTS estricto solo en prod
  app.use(
    helmet({
      // HSTS solo en producción (en dev con cert self-signed puede causar problemas)
      hsts: isProd
        ? {
            maxAge: 63072000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Angular runtime
            "'unsafe-eval'", // Angular runtime
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Tailwind y Angular estilos inline
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://images.unsplash.com', // hero images
            // En desarrollo, el backend está en otro hostname
            ...(isProd ? [] : ['https://api.vortiz.local']),
          ],
          connectSrc: [
            "'self'",
            // En desarrollo, el frontend llama al backend en otro hostname
            ...(isProd ? [] : ['https://api.vortiz.local']),
          ],
          frameSrc: [
            "'self'",
            'https://www.google.com', // iframe del mapa en footer
          ],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null, // solo en prod fuerza https
        },
      },
    }),
  );

  // 3) CORS — lista de orígenes permitidos desde .env
  const origensPermitidos = (
    process.env.CORS_ORIGINS || 'http://localhost:4200'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origensPermitidos,
    methods: 'GET,POST,PUT,DELETE,PATCH',
    credentials: true,
  });

  // 4) Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ThrottlerExceptionFilter());

  // 5) Serialización con @Exclude() — DEBE ir antes de listen
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // 6) Prefijo global
  app.setGlobalPrefix('api');

  // 7) Servir uploads con CORP cross-origin para que el frontend pueda mostrarlos
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(
    `🚀 Backend Vortiz corriendo en puerto ${port} (${process.env.NODE_ENV || 'development'})`,
    'Bootstrap',
  );
  Logger.log(
    `   CORS permitido para: ${origensPermitidos.join(', ')}`,
    'Bootstrap',
  );
}

bootstrap();
