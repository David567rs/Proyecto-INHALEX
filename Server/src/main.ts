import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : true,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  try {
    await app.listen(port);
    logger.log(`INHALEX API escuchando en http://localhost:${port}/api`);
  } catch (error) {
    const errorCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
        ? error.code
        : null;

    if (errorCode === 'EADDRINUSE') {
      logger.error(
        `El puerto ${port} ya esta ocupado. Si ya tienes el backend corriendo, no abras otra instancia. Si lo usa otra app, cambia PORT o libera ese puerto.`,
      );
      await app.close();
      process.exit(1);
    }

    throw error;
  }
}
bootstrap();
