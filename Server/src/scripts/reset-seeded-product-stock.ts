import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from '../app.module';
import { DEFAULT_PRODUCTS } from '../modules/products/data/default-products';

function buildSlug(rawValue: string): string {
  return rawValue
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const db = connection.db;

    if (!db) {
      throw new Error('MongoDB connection is not initialized');
    }

    const seededSlugs = DEFAULT_PRODUCTS.map((product) =>
      buildSlug(product.name),
    );
    const result = await db.collection('productos').updateMany(
      {
        slug: { $in: seededSlugs },
        stockAvailable: 24,
        $or: [{ stockReserved: 0 }, { stockReserved: { $exists: false } }],
      },
      {
        $set: {
          stockAvailable: 0,
          stockReserved: 0,
          inStock: false,
          allowBackorder: false,
          updatedAt: new Date(),
        },
      },
    );

    // eslint-disable-next-line no-console
    console.log(
      `Seeded product stock cleanup completed. matched=${result.matchedCount} modified=${result.modifiedCount}`,
    );
  } finally {
    await app.close();
  }
}

void bootstrap();
