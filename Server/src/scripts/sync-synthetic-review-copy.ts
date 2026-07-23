import 'dotenv/config';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoClient, ObjectId } from 'mongodb';

const EXPECTED_DATABASE = 'inhalex';
const EXPECTED_PORT = '27017';
const EXPECTED_RUN_ID = 'inhalex-synthetic-v1';
const REGISTRY_COLLECTION = 'corridas_datos_sinteticos';
const REVIEW_COLLECTION = 'reseñas_producto';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

interface SeedReview {
  review_id: string;
  customer_key: string;
  order_id: string;
  product_id: string;
  rating: number;
  comment: string;
}

interface OperationalSeed {
  metadata: {
    generation_run_id: string;
    is_synthetic: boolean;
    purpose: string;
  };
  catalog: Array<{
    product_id: string;
    name: string;
    slug: string;
  }>;
  reviews: SeedReview[];
}

interface LocalTarget {
  host: string;
  port: string;
  database: string;
  confirmation: string;
}

interface SyntheticRegistry {
  _id: string;
  status?: string;
  entityIds?: {
    reviews?: string[];
  };
}

function parseArgs(): { apply: boolean; sourcePath?: string } {
  const args = process.argv.slice(2);
  const sourceIndex = args.indexOf('--source');
  return {
    apply: args.includes('--apply'),
    sourcePath: sourceIndex >= 0 ? args[sourceIndex + 1] : undefined,
  };
}

function resolveSeedPath(explicitPath?: string): string {
  if (explicitPath) return resolve(explicitPath);
  const candidates = [
    resolve(process.cwd(), '..', 'ml', 'exports', 'operational-seed.json'),
    resolve(process.cwd(), 'ml', 'exports', 'operational-seed.json'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(
      'No existe ml/exports/operational-seed.json. Ejecuta primero python ml\\src\\export_operational_seed.py.',
    );
  }
  return match;
}

function loadSeed(path: string): OperationalSeed {
  const seed = JSON.parse(readFileSync(path, 'utf8')) as OperationalSeed;
  if (
    !seed.metadata?.is_synthetic ||
    seed.metadata.purpose !== 'local_operational_demo' ||
    seed.metadata.generation_run_id !== EXPECTED_RUN_ID
  ) {
    throw new Error('El artefacto no tiene la procedencia sintética esperada.');
  }
  if (!Array.isArray(seed.reviews) || seed.reviews.length === 0) {
    throw new Error('El artefacto no contiene reseñas para sincronizar.');
  }
  return seed;
}

function parseLocalTarget(uri: string): LocalTarget {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI no es una URI válida.');
  }
  if (parsed.protocol !== 'mongodb:') {
    throw new Error('La sincronización rechaza Atlas y conexiones no locales.');
  }
  const host = parsed.hostname.toLowerCase();
  const port = parsed.port || EXPECTED_PORT;
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Host rechazado por la guarda local: ${host}`);
  }
  if (port !== EXPECTED_PORT) {
    throw new Error(`Puerto rechazado por la guarda local: ${port}`);
  }
  if (database !== EXPECTED_DATABASE) {
    throw new Error(
      `Base rechazada por la guarda local: ${database || '(vacía)'}`,
    );
  }
  return {
    host,
    port,
    database,
    confirmation: `${database}@${host}:${port}`,
  };
}

function deterministicReviewId(runId: string, review: SeedReview): ObjectId {
  const key = `${review.customer_key}:${review.product_id}`;
  const hex = createHash('sha256')
    .update(`${runId}:review:${key}`)
    .digest('hex')
    .slice(0, 24);
  return new ObjectId(hex);
}

function protectedHash(documents: Record<string, unknown>[]): string {
  const protectedDocuments = documents
    .map((document) => {
      const { comment: _comment, ...protectedDocument } = document;
      return protectedDocument;
    })
    .sort((left, right) => String(left._id).localeCompare(String(right._id)));
  return createHash('sha256')
    .update(JSON.stringify(protectedDocuments))
    .digest('hex');
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('La sincronización no puede ejecutarse en producción.');
  }

  const { apply, sourcePath } = parseArgs();
  const path = resolveSeedPath(sourcePath);
  const seed = loadSeed(path);
  const mongoUri =
    process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/inhalex';
  const target = parseLocalTarget(mongoUri);

  if (
    apply &&
    process.env.SYNTHETIC_REVIEW_COPY_CONFIRM !== target.confirmation
  ) {
    throw new Error(
      `Para aplicar define SYNTHETIC_REVIEW_COPY_CONFIRM=${target.confirmation}`,
    );
  }

  const catalogById = new Map(
    seed.catalog.map((product) => [product.product_id, product]),
  );
  const expected = seed.reviews.map((review) => ({
    review,
    _id: deterministicReviewId(seed.metadata.generation_run_id, review),
  }));
  const expectedIds = new Set(expected.map((item) => item._id.toHexString()));
  if (expectedIds.size !== expected.length) {
    throw new Error(
      'El artefacto genera identificadores de reseña duplicados.',
    );
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  try {
    const db = client.db(target.database);
    const registry = await db
      .collection<SyntheticRegistry>(REGISTRY_COLLECTION)
      .findOne({ _id: EXPECTED_RUN_ID });
    const registeredIds = new Set(registry?.entityIds?.reviews ?? []);
    if (
      !registry ||
      registry.status !== 'complete' ||
      registeredIds.size !== expectedIds.size ||
      expected.some((item) => !registeredIds.has(item._id.toHexString()))
    ) {
      throw new Error(
        'La corrida sintética registrada no coincide con las reseñas del artefacto. No se modificó MongoDB.',
      );
    }

    const collection =
      db.collection<Record<string, unknown>>(REVIEW_COLLECTION);
    const ids = expected.map((item) => item._id);
    const before = await collection.find({ _id: { $in: ids } }).toArray();
    if (before.length !== expected.length) {
      throw new Error(
        `Se esperaban ${expected.length} reseñas sintéticas y se encontraron ${before.length}. No se modificó MongoDB.`,
      );
    }

    const beforeById = new Map(before.map((item) => [String(item._id), item]));
    for (const item of expected) {
      const current = beforeById.get(item._id.toHexString());
      const catalogProduct = catalogById.get(item.review.product_id);
      if (
        !current ||
        !catalogProduct ||
        current.orderReference !== item.review.order_id ||
        current.productSlug !== catalogProduct.slug ||
        current.rating !== item.review.rating
      ) {
        throw new Error(
          `La reseña ${item.review.review_id} no coincide con sus datos protegidos. No se modificó MongoDB.`,
        );
      }
    }

    const operations = expected
      .filter(
        (item) =>
          beforeById.get(item._id.toHexString())?.comment !==
          item.review.comment,
      )
      .map((item) => ({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: { comment: item.review.comment } },
        },
      }));
    const beforeHash = protectedHash(before);
    let modified = 0;

    if (apply && operations.length > 0) {
      const result = await collection.bulkWrite(operations, { ordered: true });
      modified = result.modifiedCount;
    }

    const after = apply
      ? await collection.find({ _id: { $in: ids } }).toArray()
      : before;
    const afterHash = protectedHash(after);
    if (beforeHash !== afterHash) {
      throw new Error(
        'Falló la verificación: cambió al menos un campo distinto de comment.',
      );
    }

    if (apply) {
      const afterById = new Map(after.map((item) => [String(item._id), item]));
      const mismatches = expected.filter(
        (item) =>
          afterById.get(item._id.toHexString())?.comment !==
          item.review.comment,
      );
      if (mismatches.length > 0) {
        throw new Error(
          `Falló la verificación de ${mismatches.length} comentarios actualizados.`,
        );
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          mode: apply ? 'apply' : 'dry-run',
          target: target.confirmation,
          source: path,
          expectedReviews: expected.length,
          matchedReviews: before.length,
          commentsToUpdate: operations.length,
          modifiedComments: modified,
          protectedFieldsPreserved: beforeHash === afterHash,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

void main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(
    error instanceof Error
      ? error.message
      : 'Falló la sincronización de reseñas sintéticas.',
  );
  process.exitCode = 1;
});
