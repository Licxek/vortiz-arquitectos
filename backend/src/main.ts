import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {

  if (!process.env.JWT_SECRET) {
    throw new Error('Falta JWT_SECRET en el .env');
  }

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    methods: 'GET,POST,PUT,DELETE,PATCH',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT || 3000);
  console.log(`Backend Vortiz corriendo en puerto ${process.env.PORT || 3000}`);
}
bootstrap();
