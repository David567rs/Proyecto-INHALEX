import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Db } from 'mongodb';
import { Connection } from 'mongoose';
import { AppModule } from '../app.module';

interface CollectionRename {
  from: string;
  to: string;
}

const RENAMES: CollectionRename[] = [
  { from: 'products', to: 'productos' },
  { from: 'users', to: 'usuarios' },
  { from: 'company_contents', to: 'contenidos_empresa' },
];

async function collectionExists(db: Db, name: string): Promise<boolean> {
  const result = await db.listCollections({ name }, { nameOnly: true }).toArray();
  return result.length > 0;
}

async function getCollectionCount(db: Db, name: string): Promise<number> {
  return db.collection(name).estimatedDocumentCount();
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

    let renamedCount = 0;

    for (const rename of RENAMES) {
      const hasSource = await collectionExists(db, rename.from);
      const hasTarget = await collectionExists(db, rename.to);

      if (hasSource && hasTarget) {
        const sourceCount = await getCollectionCount(db, rename.from);
        const targetCount = await getCollectionCount(db, rename.to);

        if (sourceCount > 0 && targetCount === 0) {
          await db.collection(rename.to).drop();
          await db.collection(rename.from).rename(rename.to);
          renamedCount += 1;

          // eslint-disable-next-line no-console
          console.log(
            `Renamed ${rename.from} -> ${rename.to} after dropping empty target collection.`,
          );
          continue;
        }

        if (sourceCount === 0 && targetCount > 0) {
          // eslint-disable-next-line no-console
          console.log(
            `Skip ${rename.from} -> ${rename.to}: target has data and source is empty.`,
          );
          continue;
        }

        if (sourceCount === 0 && targetCount === 0) {
          await db.collection(rename.from).drop();
          // eslint-disable-next-line no-console
          console.log(
            `Dropped empty source collection ${rename.from}; target ${rename.to} is already empty.`,
          );
          continue;
        }

        // eslint-disable-next-line no-console
        console.warn(
          `Skip ${rename.from} -> ${rename.to}: both collections have data (source=${sourceCount}, target=${targetCount}). Resolve manually to avoid data loss.`,
        );
        continue;
      }

      if (!hasSource && hasTarget) {
        // eslint-disable-next-line no-console
        console.log(
          `Skip ${rename.from} -> ${rename.to}: already migrated.`,
        );
        continue;
      }

      if (!hasSource && !hasTarget) {
        // eslint-disable-next-line no-console
        console.log(
          `Skip ${rename.from} -> ${rename.to}: source collection not found.`,
        );
        continue;
      }

      await db.collection(rename.from).rename(rename.to);
      renamedCount += 1;

      // eslint-disable-next-line no-console
      console.log(`Renamed ${rename.from} -> ${rename.to}`);
    }

    // eslint-disable-next-line no-console
    console.log(`Collection rename finished. renamed=${renamedCount}`);
  } finally {
    await app.close();
  }
}

void bootstrap();
