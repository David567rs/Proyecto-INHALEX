import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProductsService } from '../modules/products/products.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const productsService = app.get(ProductsService);
    const result = await productsService.seedDefaults();

    // eslint-disable-next-line no-console
    console.log(
      `Products seed completed. created=${result.created} updated=${result.updated} total=${result.total}`,
    );
  } finally {
    await app.close();
  }
}

void bootstrap();

