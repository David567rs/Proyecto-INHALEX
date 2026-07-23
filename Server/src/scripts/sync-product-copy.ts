import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProductsService } from '../modules/products/products.service';

function isLocalMongoUri(uri: string): boolean {
  try {
    const hostname = new URL(uri).hostname.toLowerCase();
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return /^mongodb:\/\/(?:[^@/]+@)?(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/)/i.test(
      uri,
    );
  }
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const configService = app.get(ConfigService);
    const mongoUri =
      configService.get<string>('MONGODB_URI') ??
      'mongodb://127.0.0.1:27017/inhalex';
    const allowRemote =
      configService.get<string>('ALLOW_REMOTE_PRODUCT_COPY_SYNC') === 'true';

    if (!isLocalMongoUri(mongoUri) && !allowRemote) {
      throw new Error(
        'Product copy sync is restricted to local MongoDB. Set ALLOW_REMOTE_PRODUCT_COPY_SYNC=true only for an intentional remote update.',
      );
    }

    const productsService = app.get(ProductsService);
    const result = await productsService.syncDefaultProductCopy();

    // eslint-disable-next-line no-console
    console.log(
      `Product copy sync completed. matched=${result.matched} updated=${result.updated} total=${result.total} missing=${result.missingSlugs.length}`,
    );

    if (result.missingSlugs.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`Missing products: ${result.missingSlugs.join(', ')}`);
    }
  } finally {
    await app.close();
  }
}

void bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(
    error instanceof Error ? error.message : 'Product copy sync failed.',
  );
  process.exitCode = 1;
});
