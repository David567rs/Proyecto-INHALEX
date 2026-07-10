import 'dotenv/config';
import { createServer } from 'node:net';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

function resolveCorsOrigin(): boolean | string[] {
  const corsOrigin = process.env.CORS_ORIGIN;

  if (corsOrigin) {
    return corsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return process.env.NODE_ENV === 'production' ? false : true;
}

function isAddressInUseError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'EADDRINUSE'
  );
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = createServer()
      .once('error', (error) => {
        if (isAddressInUseError(error)) {
          resolve(false);
          return;
        }

        reject(error);
      })
      .once('listening', () => {
        server.close(() => resolve(true));
      });

    server.listen(port);
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT ?? 3000);

  if (!(await isPortAvailable(port))) {
    logger.error(
      `El puerto ${port} ya esta ocupado. Si ya tienes el backend corriendo, usa esa instancia. Si quedo trabado, ejecuta npm run start:dev para que el limpiador cierre la instancia previa.`,
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: resolveCorsOrigin(),
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

  try {
    await app.listen(port);
    logger.log(`INHALEX API escuchando en http://localhost:${port}/api`);
  } catch (error) {
    if (isAddressInUseError(error)) {
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
