import 'dotenv/config';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as bcrypt from 'bcrypt';
import {
  AnyBulkWriteOperation,
  Collection,
  Db,
  Document,
} from 'mongodb';
import {
  Connection,
  Model,
  Types,
  createConnection,
} from 'mongoose';
import { UserRole } from '../modules/users/enums/user-role.enum';
import { UserStatus } from '../modules/users/enums/user-status.enum';
import {
  User,
  UserSchema,
} from '../modules/users/schemas/user.schema';
import { OrderStatus } from '../modules/orders/enums/order-status.enum';
import {
  Order,
  OrderCustomerReceiptStatus,
  OrderItemFulfillment,
  OrderSchema,
} from '../modules/orders/schemas/order.schema';
import {
  ProductReview,
  ProductReviewSchema,
  ProductReviewStatus,
} from '../modules/reviews/schemas/product-review.schema';
import {
  CustomerReport,
  CustomerReportPriority,
  CustomerReportSchema,
  CustomerReportStatus,
  CustomerReportType,
} from '../modules/reports/schemas/customer-report.schema';
import {
  CustomerNotification,
  CustomerNotificationSchema,
  CustomerNotificationSeverity,
  CustomerNotificationType,
} from '../modules/notifications/schemas/customer-notification.schema';
import {
  SalesAggregate,
  SalesAggregateSchema,
  SalesPeriodType,
} from '../modules/sales/schemas/sales-aggregate.schema';

const DEMO_PASSWORD = 'InhalexDemo2026!';
const REGISTRY_COLLECTION = 'corridas_datos_sinteticos';
const EXPECTED_DATABASE = 'inhalex';
const EXPECTED_PORT = '27017';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const BATCH_SIZE = 400;

interface SeedMetadata {
  schema_version: number;
  generation_run_id: string;
  random_seed: number;
  start_date: string;
  end_date: string;
  currency: string;
  is_synthetic: boolean;
  purpose: string;
}

interface SeedCatalogProduct {
  product_id: string;
  slug: string;
  name: string;
}

interface SeedCartItem {
  product_id: string;
  quantity: number;
}

interface SeedCustomer {
  customer_key: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  reference_segment: string;
  joined_at: string;
  activity_end: string;
  favorite_product_ids: string[];
  cart_items: SeedCartItem[];
}

interface SeedOrderItem {
  product_id: string;
  quantity: number;
  base_unit_price: number;
  effective_unit_price: number;
  discount_pct: number;
  promotion_id: string;
}

interface SeedOrder {
  order_id: string;
  customer_key: string;
  created_at: string;
  completed_at: string | null;
  status: OrderStatus;
  channel: string;
  total: number;
  items: SeedOrderItem[];
}

interface SeedReview {
  review_id: string;
  customer_key: string;
  order_id: string;
  product_id: string;
  rating: number;
  sentiment: string;
  comment: string;
  created_at: string;
}

interface OperationalSeed {
  metadata: SeedMetadata;
  catalog: SeedCatalogProduct[];
  customers: SeedCustomer[];
  orders: SeedOrder[];
  reviews: SeedReview[];
}

interface LocalTarget {
  host: string;
  port: string;
  database: string;
  confirmation: string;
}

interface ProductRecord extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  image: string;
  category: string;
  presentation: string;
  origin: string;
  stockAvailable?: number;
  allowBackorder?: boolean;
  status: string;
}

interface BuiltSeed {
  users: Document[];
  orders: Document[];
  reviews: Document[];
  reports: Document[];
  notifications: Document[];
}

interface ReceiptData {
  status: OrderCustomerReceiptStatus;
  requestedAt?: Date;
  confirmedAt?: Date;
  issueReportedAt?: Date;
  issueNote?: string;
  reportId?: Types.ObjectId;
}

interface RegistryEntityIds {
  users: string[];
  orders: string[];
  reviews: string[];
  reports: string[];
  notifications: string[];
}

interface SyntheticRunRegistry extends Document {
  _id: string;
  entityIds?: RegistryEntityIds;
  pendingEntityIds?: RegistryEntityIds;
  salesAggregateKeys?: string[];
  pendingSalesAggregateKeys?: string[];
}

interface ProductRatingUpdate {
  productId: Types.ObjectId;
  rating: number;
  reviews: number;
}

interface SalesBucket {
  productId: string;
  productName: string;
  productSlug: string;
  category: string;
  periodType: SalesPeriodType;
  periodStart: Date;
  periodEnd: Date;
  totalUnits: number;
  totalRevenue: number;
  orderIds: Set<string>;
}

function mergeRegistryEntityIds(
  ...sources: Array<RegistryEntityIds | undefined>
): RegistryEntityIds {
  const merge = (key: keyof RegistryEntityIds) =>
    Array.from(
      new Set(sources.flatMap((source) => source?.[key] ?? [])),
    );
  return {
    users: merge('users'),
    orders: merge('orders'),
    reviews: merge('reviews'),
    reports: merge('reports'),
    notifications: merge('notifications'),
  };
}

const CITY_PROFILES: Record<
  string,
  { postalCode: string; neighborhoods: string[] }
> = {
  'Ciudad de México': {
    postalCode: '06000',
    neighborhoods: ['Centro', 'Narvarte', 'Portales', 'Santa María'],
  },
  Ecatepec: {
    postalCode: '55000',
    neighborhoods: ['San Cristóbal', 'Las Américas', 'Jardines de Morelos'],
  },
  Naucalpan: {
    postalCode: '53000',
    neighborhoods: ['El Conde', 'Echegaray', 'Lomas de San Agustín'],
  },
  Toluca: {
    postalCode: '50000',
    neighborhoods: ['Centro', 'Universidad', 'Morelos'],
  },
  Puebla: {
    postalCode: '72000',
    neighborhoods: ['Centro', 'La Paz', 'El Carmen'],
  },
  'Santiago de Querétaro': {
    postalCode: '76000',
    neighborhoods: ['Centro', 'Álamos', 'Carretas'],
  },
  Pachuca: {
    postalCode: '42000',
    neighborhoods: ['Centro', 'Periodistas', 'Real de Minas'],
  },
  Cuernavaca: {
    postalCode: '62000',
    neighborhoods: ['Centro', 'Vista Hermosa', 'Lomas de Cortés'],
  },
  Tlaxcala: {
    postalCode: '90000',
    neighborhoods: ['Centro', 'La Loma', 'San Gabriel'],
  },
  León: {
    postalCode: '37000',
    neighborhoods: ['Centro', 'Obregón', 'Jardines del Moral'],
  },
  Guadalajara: {
    postalCode: '44100',
    neighborhoods: ['Americana', 'Centro', 'Santa Tere'],
  },
};

const STREET_NAMES = [
  'Calle Jacarandas',
  'Avenida del Bosque',
  'Calle Bugambilias',
  'Privada de los Pinos',
  'Calle Naranjo',
  'Avenida Reforma',
  'Calle del Encino',
  'Andador Primavera',
];

const ISSUE_NOTES = [
  'El paquete llegó con el sello exterior maltratado y solicito revisión.',
  'El atomizador presentó una fuga pequeña durante la entrega.',
  'Faltó una unidad respecto a lo indicado en el pedido.',
  'La entrega llegó después de la fecha acordada y necesito seguimiento.',
  'Uno de los frascos llegó golpeado, aunque el resto está en buen estado.',
];

function parseArgs(): { apply: boolean; sourcePath?: string } {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const sourceIndex = args.indexOf('--source');
  const sourcePath = sourceIndex >= 0 ? args[sourceIndex + 1] : undefined;
  return { apply, sourcePath };
}

function resolveSeedPath(explicitPath?: string): string {
  if (explicitPath) {
    return resolve(explicitPath);
  }

  const candidates = [
    resolve(process.cwd(), '..', 'ml', 'exports', 'operational-seed.json'),
    resolve(process.cwd(), 'ml', 'exports', 'operational-seed.json'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(
      'No existe ml/exports/operational-seed.json. Ejecuta python ml\\src\\export_operational_seed.py.',
    );
  }
  return match;
}

function loadSeed(path: string): OperationalSeed {
  const seed = JSON.parse(readFileSync(path, 'utf8')) as OperationalSeed;
  if (
    !seed.metadata?.is_synthetic ||
    seed.metadata.purpose !== 'local_operational_demo' ||
    seed.metadata.generation_run_id !== 'inhalex-synthetic-v1'
  ) {
    throw new Error('El artefacto operacional no tiene la procedencia esperada.');
  }
  if (
    seed.customers.length !== 300 ||
    seed.orders.length !== 1800 ||
    seed.catalog.length !== 16
  ) {
    throw new Error('El artefacto operacional no cumple los conteos contratados.');
  }
  const invalidChronology = seed.orders.find((order) => {
    const createdAt = new Date(order.created_at);
    const completedAt = order.completed_at
      ? new Date(order.completed_at)
      : undefined;
    if (Number.isNaN(createdAt.getTime())) return true;
    if (order.status === OrderStatus.COMPLETED) {
      return !completedAt || completedAt.getTime() <= createdAt.getTime();
    }
    return Boolean(completedAt);
  });
  if (invalidChronology) {
    throw new Error(
      `Cronología inválida en el pedido ${invalidChronology.order_id}.`,
    );
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
    throw new Error('El seeder rechaza mongodb+srv y cualquier conexión no local.');
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

function deterministicObjectId(runId: string, kind: string, key: string) {
  const hex = createHash('sha256')
    .update(`${runId}:${kind}:${key}`)
    .digest('hex')
    .slice(0, 24);
  return new Types.ObjectId(hex);
}

function seedIndex(value: string): number {
  const match = value.match(/(\d+)$/);
  if (!match) {
    throw new Error(`Clave sintética sin consecutivo: ${value}`);
  }
  return Number(match[1]);
}

function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000);
}

function addHours(value: Date, hours: number): Date {
  return addMinutes(value, hours * 60);
}

function addDays(value: Date, days: number): Date {
  return addHours(value, days * 24);
}

function minDate(left: Date, right: Date): Date {
  return left.getTime() <= right.getTime() ? left : right;
}

function endOfSeedPeriod(seed: OperationalSeed): Date {
  return new Date(`${seed.metadata.end_date}T23:59:59-06:00`);
}

function sourceHash(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function createAddress(
  runId: string,
  customer: SeedCustomer,
  index: number,
  position = 0,
): Document {
  const profile = CITY_PROFILES[customer.city] ?? {
    postalCode: '42000',
    neighborhoods: ['Centro'],
  };
  const addressId = deterministicObjectId(
    runId,
    'address',
    `${customer.customer_key}:${position}`,
  );
  return {
    _id: addressId,
    label: position === 0 ? 'Casa' : 'Trabajo',
    recipientName: customer.display_name,
    phone: customer.phone,
    street: STREET_NAMES[(index + position * 3) % STREET_NAMES.length],
    exteriorNumber: String(20 + ((index * 17 + position * 31) % 480)),
    ...(index % 7 === 0
      ? { interiorNumber: String.fromCharCode(65 + (index % 4)) }
      : {}),
    neighborhood:
      profile.neighborhoods[(index + position) % profile.neighborhoods.length],
    municipality: customer.city,
    state: customer.state,
    postalCode: profile.postalCode,
    references:
      position === 0
        ? 'Fachada clara, tocar el timbre junto al portón.'
        : 'Entregar en recepción durante horario laboral.',
    isDefault: position === 0,
  };
}

function buildAddresses(
  runId: string,
  customer: SeedCustomer,
  index: number,
): Document[] {
  if (index % 25 === 0) {
    return [];
  }
  const addresses = [createAddress(runId, customer, index, 0)];
  if (index % 10 === 0) {
    addresses.push(createAddress(runId, customer, index, 1));
  }
  return addresses;
}

function resolveReceipt(
  runId: string,
  order: SeedOrder,
  periodEnd: Date,
): ReceiptData {
  if (order.status !== OrderStatus.COMPLETED || !order.completed_at) {
    return { status: OrderCustomerReceiptStatus.NOT_REQUIRED };
  }
  const index = seedIndex(order.order_id);
  const bucket = index % 100;
  const completedAt = new Date(order.completed_at);
  const requestedAt = completedAt;
  if (bucket < 80) {
    return {
      status: OrderCustomerReceiptStatus.CONFIRMED,
      requestedAt,
      confirmedAt: minDate(addHours(completedAt, 3 + (index % 69)), periodEnd),
    };
  }
  if (bucket < 95) {
    return {
      status: OrderCustomerReceiptStatus.PENDING,
      requestedAt,
    };
  }
  if (bucket < 99) {
    return {
      status: OrderCustomerReceiptStatus.ISSUE_REPORTED,
      requestedAt,
      issueReportedAt: minDate(
        addHours(completedAt, 2 + (index % 43)),
        periodEnd,
      ),
      issueNote: ISSUE_NOTES[index % ISSUE_NOTES.length],
      reportId: deterministicObjectId(runId, 'delivery-report', order.order_id),
    };
  }
  return { status: OrderCustomerReceiptStatus.NOT_REQUIRED };
}

function buildStatusNotes(order: SeedOrder, confirmedAt?: Date): Document[] {
  const createdAt = new Date(order.created_at);
  const notes: Document[] = [
    {
      status: OrderStatus.PENDING_REVIEW,
      note: 'Pedido sintético recibido desde la tienda web.',
      actorEmail: 'sistema.demo@inhalex.invalid',
      createdAt,
    },
  ];
  if (order.status === OrderStatus.PENDING_REVIEW) {
    return notes;
  }
  if (order.status === OrderStatus.CANCELLED) {
    notes.push({
      status: OrderStatus.CANCELLED,
      note: 'Pedido cancelado durante la validación comercial.',
      actorEmail: 'sistema.demo@inhalex.invalid',
      createdAt: addHours(createdAt, 1 + (seedIndex(order.order_id) % 36)),
    });
    return notes;
  }
  notes.push({
    status: OrderStatus.CONFIRMED,
    note: 'Pedido confirmado para preparación y entrega.',
    actorEmail: 'sistema.demo@inhalex.invalid',
    createdAt: confirmedAt ?? addHours(createdAt, 6),
  });
  if (order.status === OrderStatus.COMPLETED && order.completed_at) {
    notes.push({
      status: OrderStatus.COMPLETED,
      note: 'Entrega marcada como completada en el escenario sintético.',
      actorEmail: 'sistema.demo@inhalex.invalid',
      createdAt: new Date(order.completed_at),
    });
  }
  return notes;
}

function latestDate(values: Array<Date | undefined>): Date {
  return values
    .filter((value): value is Date => Boolean(value))
    .reduce((latest, value) =>
      value.getTime() > latest.getTime() ? value : latest,
    );
}

function validateDocuments(
  model: Model<any>,
  documents: Document[],
  label: string,
): void {
  for (const [index, document] of documents.entries()) {
    const error = new model(document).validateSync();
    if (error) {
      throw new Error(
        `${label}[${index}] no cumple el schema: ${error.message}`,
      );
    }
  }
}

async function loadProducts(
  db: Db,
  seed: OperationalSeed,
): Promise<Map<string, ProductRecord>> {
  const slugs = seed.catalog.map((product) => product.slug);
  const products = (await db
    .collection<ProductRecord>('productos')
    .find({ slug: { $in: slugs } })
    .toArray()) as ProductRecord[];
  if (products.length !== seed.catalog.length) {
    const found = new Set(products.map((product) => product.slug));
    const missing = slugs.filter((slug) => !found.has(slug));
    throw new Error(`Faltan productos locales: ${missing.join(', ')}`);
  }
  const inactive = products.filter((product) => product.status !== 'active');
  if (inactive.length) {
    throw new Error(
      `Hay productos no activos: ${inactive.map((item) => item.slug).join(', ')}`,
    );
  }
  const bySyntheticId = new Map<string, ProductRecord>();
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  for (const catalogProduct of seed.catalog) {
    const product = bySlug.get(catalogProduct.slug);
    if (!product) {
      throw new Error(`No se resolvió ${catalogProduct.product_id}`);
    }
    bySyntheticId.set(catalogProduct.product_id, product);
  }
  return bySyntheticId;
}

async function buildDocuments(
  connection: Connection,
  seed: OperationalSeed,
  products: Map<string, ProductRecord>,
): Promise<BuiltSeed> {
  const runId = seed.metadata.generation_run_id;
  const periodEnd = endOfSeedPeriod(seed);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const customerByKey = new Map(seed.customers.map((item) => [item.customer_key, item]));
  const latestReviewByCustomer = new Map<string, Date>();
  for (const review of seed.reviews) {
    const createdAt = new Date(review.created_at);
    const current = latestReviewByCustomer.get(review.customer_key);
    if (!current || createdAt.getTime() > current.getTime()) {
      latestReviewByCustomer.set(review.customer_key, createdAt);
    }
  }
  const addressesByCustomer = new Map<string, Document[]>();
  const users: Document[] = seed.customers.map((customer) => {
    const index = seedIndex(customer.customer_key);
    const addresses = buildAddresses(runId, customer, index);
    addressesByCustomer.set(customer.customer_key, addresses);
    const createdAt = new Date(`${customer.joined_at}T12:00:00-06:00`);
    const activityEnd = new Date(`${customer.activity_end}T20:00:00-06:00`);
    const lastSeenAt = latestDate([
      activityEnd,
      latestReviewByCustomer.get(customer.customer_key),
    ]);
    const favoriteProductIds = customer.favorite_product_ids.map((productId) => {
      const product = products.get(productId);
      if (!product) throw new Error(`Favorito desconocido: ${productId}`);
      return product._id;
    });
    const cartItems = customer.cart_items.map((cartItem) => {
      const product = products.get(cartItem.product_id);
      if (!product) throw new Error(`Producto de bolsa desconocido: ${cartItem.product_id}`);
      return { productId: product._id, quantity: cartItem.quantity };
    });
    const alexaLinked = index % 5 === 0;
    return {
      _id: deterministicObjectId(runId, 'user', customer.customer_key),
      name: customer.display_name,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email.toLowerCase(),
      phone: customer.phone,
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      lastLoginAt: index % 4 === 0 ? activityEnd : undefined,
      lastSeenAt,
      favoriteProductIds,
      shippingAddresses: addresses,
      cartItems,
      ...(alexaLinked
        ? {
            alexaUserIdHash: createHash('sha256')
              .update(`alexa:${runId}:${customer.customer_key}`)
              .digest('hex'),
            alexaLinkedAt: minDate(addDays(createdAt, 30 + (index % 90)), activityEnd),
          }
        : {}),
      createdAt,
      updatedAt: lastSeenAt,
    };
  });
  const userByCustomerKey = new Map(
    seed.customers.map((customer, index) => [customer.customer_key, users[index]]),
  );

  const reports: Document[] = [];
  const orderBySyntheticId = new Map<string, Document>();
  const orders: Document[] = seed.orders.map((order) => {
    const index = seedIndex(order.order_id);
    const customer = customerByKey.get(order.customer_key);
    const user = userByCustomerKey.get(order.customer_key);
    if (!customer || !user) throw new Error(`Cliente desconocido: ${order.customer_key}`);
    const createdAt = new Date(order.created_at);
    const completedAt = order.completed_at ? new Date(order.completed_at) : undefined;
    const confirmedAt = [OrderStatus.CONFIRMED, OrderStatus.COMPLETED].includes(order.status)
      ? minDate(addHours(createdAt, 6 + (index % 31)), completedAt ?? periodEnd)
      : undefined;
    const cancelledAt = order.status === OrderStatus.CANCELLED
      ? minDate(addHours(createdAt, 1 + (index % 36)), periodEnd)
      : undefined;
    const receipt = resolveReceipt(runId, order, periodEnd);
    const addresses = addressesByCustomer.get(order.customer_key) ?? [];
    const defaultAddress = addresses[0];
    const items = order.items.map((seedItem) => {
      const product = products.get(seedItem.product_id);
      if (!product) throw new Error(`Producto desconocido: ${seedItem.product_id}`);
      const quantity = seedItem.quantity;
      return {
        productId: product._id.toHexString(),
        productName: product.name,
        productSlug: product.slug,
        image: product.image,
        category: product.category,
        presentation: product.presentation,
        origin: product.origin,
        unitPrice: seedItem.effective_unit_price,
        currency: seed.metadata.currency,
        requestedQuantity: quantity,
        quantity,
        subtotal: Math.round(quantity * seedItem.effective_unit_price * 100) / 100,
        fulfillment: OrderItemFulfillment.AVAILABLE,
        stockAvailable: product.stockAvailable ?? null,
        reservedQuantity: [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(
          order.status,
        )
          ? quantity
          : 0,
        backorderQuantity: 0,
        inventoryTracked: typeof product.stockAvailable === 'number',
        allowBackorder: Boolean(product.allowBackorder),
      };
    });
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
    const orderId = deterministicObjectId(runId, 'order', order.order_id);
    const statusNotes = buildStatusNotes(order, confirmedAt);
    const document: Document = {
      _id: orderId,
      reference: order.order_id,
      idempotencyKey: `synthetic-${runId.replace(/[^a-z0-9]/gi, '-')}-${String(index).padStart(6, '0')}`,
      status: order.status,
      currency: seed.metadata.currency,
      totalItems,
      subtotal,
      items,
      issues: [],
      customer: {
        name: customer.display_name,
        email: customer.email.toLowerCase(),
        phone: customer.phone,
        notes: 'Pedido ficticio para demostración y análisis académico.',
      },
      customerUserId: (user._id as Types.ObjectId).toHexString(),
      customerUserEmail: customer.email.toLowerCase(),
      ...(defaultAddress
        ? {
            shippingAddress: {
              sourceAddressId: (defaultAddress._id as Types.ObjectId).toHexString(),
              label: defaultAddress.label,
              recipientName: defaultAddress.recipientName,
              phone: defaultAddress.phone,
              street: defaultAddress.street,
              exteriorNumber: defaultAddress.exteriorNumber,
              ...(defaultAddress.interiorNumber
                ? { interiorNumber: defaultAddress.interiorNumber }
                : {}),
              neighborhood: defaultAddress.neighborhood,
              municipality: defaultAddress.municipality,
              state: defaultAddress.state,
              postalCode: defaultAddress.postalCode,
              references: defaultAddress.references,
            },
          }
        : {}),
      needsManualReview: false,
      channel: order.channel,
      lastValidatedAt: addMinutes(createdAt, 5),
      ...(confirmedAt ? { confirmedAt } : {}),
      ...(cancelledAt ? { cancelledAt } : {}),
      ...(completedAt ? { completedAt } : {}),
      customerReceiptStatus: receipt.status,
      ...(receipt.requestedAt
        ? { customerReceiptRequestedAt: receipt.requestedAt }
        : {}),
      ...(receipt.confirmedAt
        ? { customerReceiptConfirmedAt: receipt.confirmedAt }
        : {}),
      ...(receipt.issueReportedAt
        ? { customerReceiptIssueReportedAt: receipt.issueReportedAt }
        : {}),
      ...(receipt.issueNote
        ? { customerReceiptIssueNote: receipt.issueNote }
        : {}),
      ...(receipt.reportId
        ? { customerReceiptReportId: receipt.reportId.toHexString() }
        : {}),
      statusNotes,
      createdAt,
      updatedAt: latestDate([
        createdAt,
        confirmedAt,
        cancelledAt,
        completedAt,
        receipt.confirmedAt,
        receipt.issueReportedAt,
      ]),
    };
    if (receipt.reportId && receipt.issueReportedAt && receipt.issueNote) {
      const reportStatus = [
        CustomerReportStatus.NEW,
        CustomerReportStatus.IN_REVIEW,
        CustomerReportStatus.RESOLVED,
        CustomerReportStatus.CLOSED,
      ][index % 4];
      const resolvedAt = [CustomerReportStatus.RESOLVED, CustomerReportStatus.CLOSED].includes(reportStatus)
        ? minDate(addDays(receipt.issueReportedAt, 2 + (index % 4)), periodEnd)
        : undefined;
      reports.push({
        _id: receipt.reportId,
        userId: (user._id as Types.ObjectId).toHexString(),
        userEmail: customer.email.toLowerCase(),
        userName: customer.display_name,
        type: CustomerReportType.DELIVERY,
        title: `Problema de recepción en ${order.order_id}`,
        message: receipt.issueNote,
        orderReference: order.order_id,
        status: reportStatus,
        priority: CustomerReportPriority.HIGH,
        ...(resolvedAt
          ? {
              adminNote: 'Incidencia sintética revisada para la demostración.',
              handledById: 'synthetic-admin',
              handledByEmail: 'admin.demo@inhalex.invalid',
              resolvedAt,
            }
          : {}),
        createdAt: receipt.issueReportedAt,
        updatedAt: resolvedAt ?? receipt.issueReportedAt,
      });
    }
    orderBySyntheticId.set(order.order_id, document);
    return document;
  });

  const reviews: Document[] = seed.reviews.map((review) => {
    const customer = customerByKey.get(review.customer_key);
    const user = userByCustomerKey.get(review.customer_key);
    const order = orderBySyntheticId.get(review.order_id);
    const product = products.get(review.product_id);
    if (!customer || !user || !order || !product) {
      throw new Error(`No se pudo enlazar la reseña ${review.review_id}`);
    }
    const createdAt = new Date(review.created_at);
    return {
      _id: deterministicObjectId(
        runId,
        'review',
        `${review.customer_key}:${review.product_id}`,
      ),
      userId: (user._id as Types.ObjectId).toHexString(),
      userEmail: customer.email.toLowerCase(),
      userName: customer.display_name,
      orderId: (order._id as Types.ObjectId).toHexString(),
      orderReference: order.reference,
      productId: product._id.toHexString(),
      productName: product.name,
      productSlug: product.slug,
      productImage: product.image,
      rating: review.rating,
      comment: review.comment,
      status: ProductReviewStatus.PUBLISHED,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const notifications: Document[] = [];
  const ordersByCustomer = new Map<string, Document[]>();
  for (const order of orders) {
    const customerKey = seed.orders.find(
      (seedOrder) => seedOrder.order_id === order.reference,
    )?.customer_key;
    if (!customerKey) continue;
    const current = ordersByCustomer.get(customerKey) ?? [];
    current.push(order);
    ordersByCustomer.set(customerKey, current);
  }
  const maybeReadAt = (createdAt: Date, key: string): Date | null => {
    const bucket = Number.parseInt(
      createHash('sha256').update(key).digest('hex').slice(0, 4),
      16,
    ) % 100;
    const candidate = addDays(createdAt, 2);
    return bucket < 62 && candidate <= periodEnd ? candidate : null;
  };
  const addNotification = (
    key: string,
    customer: SeedCustomer,
    user: Document,
    title: string,
    message: string,
    type: CustomerNotificationType,
    severity: CustomerNotificationSeverity,
    createdAt: Date,
    metadata: Record<string, unknown> = {},
  ) => {
    notifications.push({
      _id: deterministicObjectId(runId, 'notification', key),
      userId: (user._id as Types.ObjectId).toHexString(),
      userEmail: customer.email.toLowerCase(),
      title,
      message,
      type,
      severity,
      metadata: { generationRunId: runId, ...metadata },
      readAt: maybeReadAt(createdAt, key),
      createdAt,
      updatedAt: maybeReadAt(createdAt, key) ?? createdAt,
    });
  };
  for (const customer of seed.customers) {
    const user = userByCustomerKey.get(customer.customer_key)!;
    const joinedAt = new Date(`${customer.joined_at}T12:00:00-06:00`);
    addNotification(
      `welcome:${customer.customer_key}`,
      customer,
      user,
      'Bienvenido a INHALEX',
      'Tu cuenta ficticia está lista para explorar el catálogo de aromaterapia.',
      CustomerNotificationType.SYSTEM,
      CustomerNotificationSeverity.INFO,
      joinedAt,
    );
    const customerOrders = (ordersByCustomer.get(customer.customer_key) ?? []).sort(
      (left, right) =>
        (right.createdAt as Date).getTime() - (left.createdAt as Date).getTime(),
    );
    const latestOrder = customerOrders[0];
    if (latestOrder) {
      const status = latestOrder.status as OrderStatus;
      const completed = status === OrderStatus.COMPLETED;
      addNotification(
        `latest-order:${latestOrder.reference}`,
        customer,
        user,
        completed ? 'Pedido entregado' : 'Actualización de tu pedido',
        completed
          ? `Tu pedido ${latestOrder.reference} fue marcado como entregado.`
          : `Tu pedido ${latestOrder.reference} está en estado ${status}.`,
        CustomerNotificationType.ORDER,
        completed
          ? CustomerNotificationSeverity.SUCCESS
          : CustomerNotificationSeverity.INFO,
        (latestOrder.completedAt as Date | undefined) ??
          (latestOrder.updatedAt as Date),
        {
          orderId: (latestOrder._id as Types.ObjectId).toHexString(),
          reference: latestOrder.reference,
          status,
        },
      );
    }
    if (seedIndex(customer.customer_key) % 4 === 0) {
      addNotification(
        `promotion:${customer.customer_key}`,
        customer,
        user,
        'Aromas para tu rutina',
        'Descubre recomendaciones basadas en tus líneas y productos favoritos.',
        CustomerNotificationType.PROMOTION,
        CustomerNotificationSeverity.INFO,
        minDate(addDays(joinedAt, 45), periodEnd),
      );
    }
  }
  for (const review of reviews) {
    const customer = seed.customers.find(
      (item) => item.email.toLowerCase() === review.userEmail,
    )!;
    const user = userByCustomerKey.get(customer.customer_key)!;
    addNotification(
      `review:${(review._id as Types.ObjectId).toHexString()}`,
      customer,
      user,
      'Gracias por tu reseña',
      `${review.productName} ya tiene tu calificación publicada.`,
      CustomerNotificationType.REVIEW,
      CustomerNotificationSeverity.SUCCESS,
      review.createdAt as Date,
      {
        productId: review.productId,
        reviewId: (review._id as Types.ObjectId).toHexString(),
      },
    );
  }
  for (const report of reports) {
    const customer = seed.customers.find(
      (item) => item.email.toLowerCase() === report.userEmail,
    )!;
    const user = userByCustomerKey.get(customer.customer_key)!;
    addNotification(
      `report:${(report._id as Types.ObjectId).toHexString()}`,
      customer,
      user,
      'Reporte de entrega recibido',
      `Registramos el problema relacionado con ${report.orderReference}.`,
      CustomerNotificationType.REPORT,
      CustomerNotificationSeverity.WARNING,
      report.createdAt as Date,
      { reportId: (report._id as Types.ObjectId).toHexString() },
    );
  }

  const UserModel = connection.model(User.name, UserSchema);
  const OrderModel = connection.model(Order.name, OrderSchema);
  const ReviewModel = connection.model(ProductReview.name, ProductReviewSchema);
  const ReportModel = connection.model(CustomerReport.name, CustomerReportSchema);
  const NotificationModel = connection.model(
    CustomerNotification.name,
    CustomerNotificationSchema,
  );
  validateDocuments(UserModel, users, 'usuarios');
  validateDocuments(OrderModel, orders, 'pedidos');
  validateDocuments(ReviewModel, reviews, 'reseñas');
  validateDocuments(ReportModel, reports, 'reportes');
  validateDocuments(NotificationModel, notifications, 'notificaciones');
  return { users, orders, reviews, reports, notifications };
}

async function replaceDocuments(
  collection: Collection,
  documents: Document[],
): Promise<void> {
  for (let offset = 0; offset < documents.length; offset += BATCH_SIZE) {
    const operations: AnyBulkWriteOperation<Document>[] = documents
      .slice(offset, offset + BATCH_SIZE)
      .map((document) => ({
        replaceOne: {
          filter: { _id: document._id },
          replacement: document,
          upsert: true,
        },
      }));
    if (operations.length) {
      await collection.bulkWrite(operations, { ordered: true });
    }
  }
}

function entityIds(built: BuiltSeed): RegistryEntityIds {
  const ids = (documents: Document[]) =>
    documents.map((document) => String(document._id));
  return {
    users: ids(built.users),
    orders: ids(built.orders),
    reviews: ids(built.reviews),
    reports: ids(built.reports),
    notifications: ids(built.notifications),
  };
}

async function assertNoCollisions(
  db: Db,
  built: BuiltSeed,
  previous?: RegistryEntityIds,
): Promise<void> {
  const entityChecks: Array<{
    key: keyof RegistryEntityIds;
    collection: string;
    documents: Document[];
  }> = [
    { key: 'users', collection: 'usuarios', documents: built.users },
    { key: 'orders', collection: 'pedidos', documents: built.orders },
    { key: 'reviews', collection: 'reseñas_producto', documents: built.reviews },
    { key: 'reports', collection: 'reportes_cliente', documents: built.reports },
    {
      key: 'notifications',
      collection: 'notificaciones_cliente',
      documents: built.notifications,
    },
  ];
  for (const check of entityChecks) {
    const plannedIds = check.documents.map((item) => String(item._id));
    if (new Set(plannedIds).size !== plannedIds.length) {
      throw new Error(`Hay _id sintéticos duplicados en ${check.collection}.`);
    }
    const allowedIds = new Set(previous?.[check.key] ?? []);
    const existing = await db
      .collection(check.collection)
      .find(
        { _id: { $in: plannedIds.map((id) => new Types.ObjectId(id)) } },
        { projection: { _id: 1 } },
      )
      .toArray();
    const conflicts = existing.filter(
      (document) => !allowedIds.has(String(document._id)),
    );
    if (conflicts.length) {
      throw new Error(
        `Colisión de _id en ${check.collection}: ${conflicts.length}`,
      );
    }
  }

  const uniqueChecks: Array<{ collection: string; filter: Document }> = [
    {
      collection: 'usuarios',
      filter: { email: { $in: built.users.map((item) => item.email) } },
    },
    {
      collection: 'pedidos',
      filter: {
        $or: [
          { reference: { $in: built.orders.map((item) => item.reference) } },
          {
            idempotencyKey: {
              $in: built.orders.map((item) => item.idempotencyKey),
            },
          },
        ],
      },
    },
    {
      collection: 'reseñas_producto',
      filter: {
        $or: built.reviews.map((item) => ({
          userId: item.userId,
          productId: item.productId,
        })),
      },
    },
  ];
  const allowedByCollection = new Map<string, Set<string>>([
    ['usuarios', new Set(previous?.users ?? [])],
    ['pedidos', new Set(previous?.orders ?? [])],
    ['reseñas_producto', new Set(previous?.reviews ?? [])],
  ]);
  for (const check of uniqueChecks) {
    const existing = await db
      .collection(check.collection)
      .find(check.filter, { projection: { _id: 1 } })
      .toArray();
    const allowedIds = allowedByCollection.get(check.collection) ?? new Set();
    const conflicts = existing.filter(
      (document) => !allowedIds.has(String(document._id)),
    );
    if (conflicts.length) {
      throw new Error(
        `Colisión de índice único en ${check.collection}: ${conflicts.length}`,
      );
    }
  }
}

function getPeriodStart(date: Date, type: SalesPeriodType): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  if (type === SalesPeriodType.WEEKLY) {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  } else if (type === SalesPeriodType.MONTHLY) {
    start.setDate(1);
  }
  return start;
}

function getPeriodEnd(start: Date, type: SalesPeriodType): Date {
  if (type === SalesPeriodType.DAILY) {
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  if (type === SalesPeriodType.WEEKLY) {
    const end = addDays(start, 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  return new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function makeSalesAggregateKey(
  productId: string,
  periodType: SalesPeriodType,
  periodStart: Date,
): string {
  return `${productId}|${periodType}|${periodStart.toISOString()}`;
}

function salesAggregateFilterFromKey(key: string): Document {
  const parts = key.split('|');
  const periodTypes = new Set(Object.values(SalesPeriodType));
  if (parts.length !== 3 || !periodTypes.has(parts[1] as SalesPeriodType)) {
    throw new Error(`Clave de venta agregada inválida: ${key}`);
  }
  const periodStart = new Date(parts[2]);
  if (Number.isNaN(periodStart.getTime())) {
    throw new Error(`Fecha inválida en clave de venta agregada: ${key}`);
  }
  return {
    productId: parts[0],
    periodType: parts[1],
    periodStart,
  };
}

async function buildSalesAggregates(
  db: Db,
  connection: Connection,
  plannedOrders: Document[],
  ownedOrderIds: string[],
): Promise<{ documents: Document[]; keys: string[] }> {
  const storedCompletedOrders = await db
    .collection('pedidos')
    .find({ status: OrderStatus.COMPLETED })
    .toArray();
  const replacedIds = new Set([
    ...ownedOrderIds,
    ...plannedOrders.map((order) => String(order._id)),
  ]);
  const completedOrders = [
    ...storedCompletedOrders.filter(
      (order) => !replacedIds.has(String(order._id)),
    ),
    ...plannedOrders.filter((order) => order.status === OrderStatus.COMPLETED),
  ];
  const buckets = new Map<string, SalesBucket>();
  const periodTypes = [
    SalesPeriodType.DAILY,
    SalesPeriodType.WEEKLY,
    SalesPeriodType.MONTHLY,
  ];
  for (const order of completedOrders) {
    const salesDate = new Date(order.completedAt ?? order.createdAt);
    for (const item of order.items ?? []) {
      const fulfilledUnits = Math.max(
        0,
        Number(item.quantity ?? 0) - Number(item.backorderQuantity ?? 0),
      );
      const revenue = round(fulfilledUnits * Number(item.unitPrice ?? 0));
      for (const periodType of periodTypes) {
        const periodStart = getPeriodStart(salesDate, periodType);
        const key = makeSalesAggregateKey(
          String(item.productId),
          periodType,
          periodStart,
        );
        const bucket = buckets.get(key) ?? {
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          category: item.category,
          periodType,
          periodStart,
          periodEnd: getPeriodEnd(periodStart, periodType),
          totalUnits: 0,
          totalRevenue: 0,
          orderIds: new Set<string>(),
        };
        bucket.totalUnits += fulfilledUnits;
        bucket.totalRevenue = round(bucket.totalRevenue + revenue);
        bucket.orderIds.add(String(order._id));
        buckets.set(key, bucket);
      }
    }
  }
  const documents: Document[] = Array.from(buckets.values()).map((bucket) => {
    const totalOrders = bucket.orderIds.size;
    return {
      productId: bucket.productId,
      productName: bucket.productName,
      productSlug: bucket.productSlug,
      category: bucket.category,
      periodType: bucket.periodType,
      periodStart: bucket.periodStart,
      periodEnd: bucket.periodEnd,
      totalUnits: bucket.totalUnits,
      totalRevenue: bucket.totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders ? round(bucket.totalRevenue / totalOrders) : 0,
      averageUnitsPerOrder: totalOrders
        ? round(bucket.totalUnits / totalOrders, 1)
        : 0,
      growthRate: 0,
      orderIds: Array.from(bucket.orderIds).sort(),
      lastCalculatedAt: new Date(),
      isActive: true,
      updatedAt: new Date(),
    };
  });
  const grouped = new Map<string, Document[]>();
  for (const document of documents) {
    const key = `${document.productId}|${document.periodType}`;
    const current = grouped.get(key) ?? [];
    current.push(document);
    grouped.set(key, current);
  }
  for (const group of grouped.values()) {
    group.sort(
      (left, right) =>
        (left.periodStart as Date).getTime() -
        (right.periodStart as Date).getTime(),
    );
    for (let index = 1; index < group.length; index += 1) {
      const previous = Number(group[index - 1].totalUnits);
      const current = Number(group[index].totalUnits);
      group[index].growthRate = previous > 0
        ? round(((current - previous) / previous) * 100, 1)
        : 0;
    }
  }
  const SalesModel = connection.model(SalesAggregate.name, SalesAggregateSchema);
  validateDocuments(SalesModel, documents, 'ventas_agregadas');
  return { documents, keys: Array.from(buckets.keys()).sort() };
}

async function upsertSalesAggregates(
  collection: Collection,
  documents: Document[],
): Promise<void> {
  for (let offset = 0; offset < documents.length; offset += BATCH_SIZE) {
    const operations: AnyBulkWriteOperation<Document>[] = documents
      .slice(offset, offset + BATCH_SIZE)
      .map((document) => ({
        updateOne: {
          filter: {
            productId: document.productId,
            periodType: document.periodType,
            periodStart: document.periodStart,
          },
          update: {
            $set: document,
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      }));
    await collection.bulkWrite(operations, { ordered: true });
  }
}

async function buildProductRatingUpdates(
  db: Db,
  plannedReviews: Document[],
  ownedReviewIds: string[],
): Promise<ProductRatingUpdate[]> {
  const storedReviews = await db
    .collection('reseñas_producto')
    .find({ status: ProductReviewStatus.PUBLISHED })
    .toArray();
  const replacedIds = new Set([
    ...ownedReviewIds,
    ...plannedReviews.map((review) => String(review._id)),
  ]);
  const reviews = [
    ...storedReviews.filter((review) => !replacedIds.has(String(review._id))),
    ...plannedReviews,
  ];
  const products = await db
    .collection('productos')
    .find({}, { projection: { _id: 1 } })
    .toArray();
  const productIds = new Set(products.map((product) => String(product._id)));
  const summaries = new Map<string, { sum: number; count: number }>();
  for (const review of reviews) {
    const productId = String(review.productId);
    if (!Types.ObjectId.isValid(productId) || !productIds.has(productId)) {
      throw new Error(`Reseña publicada con producto inválido: ${productId}.`);
    }
    const summary = summaries.get(productId) ?? { sum: 0, count: 0 };
    summary.sum += Number(review.rating);
    summary.count += 1;
    summaries.set(productId, summary);
  }
  return products.map((product) => {
    const productId = String(product._id);
    const summary = summaries.get(productId) ?? { sum: 0, count: 0 };
    return {
      productId: new Types.ObjectId(productId),
      rating: summary.count ? round(summary.sum / summary.count, 1) : 0,
      reviews: summary.count,
    };
  });
}

async function applyProductRatingUpdates(
  db: Db,
  updates: ProductRatingUpdate[],
): Promise<number> {
  if (!updates.length) return 0;
  const result = await db.collection('productos').bulkWrite(
    updates.map((summary) => ({
      updateOne: {
        filter: { _id: summary.productId },
        update: {
          $set: {
            rating: summary.rating,
            reviews: summary.reviews,
            updatedAt: new Date(),
          },
        },
      },
    })),
    { ordered: true },
  );
  return result.modifiedCount;
}

async function deleteStaleEntities(
  db: Db,
  previous: RegistryEntityIds | undefined,
  current: RegistryEntityIds,
): Promise<Record<string, number>> {
  const mapping: Array<[keyof RegistryEntityIds, string]> = [
    ['notifications', 'notificaciones_cliente'],
    ['reviews', 'reseñas_producto'],
    ['reports', 'reportes_cliente'],
    ['orders', 'pedidos'],
    ['users', 'usuarios'],
  ];
  const deleted: Record<string, number> = {};
  for (const [key, collectionName] of mapping) {
    const currentSet = new Set(current[key]);
    const stale = (previous?.[key] ?? []).filter((id) => !currentSet.has(id));
    if (!stale.length) {
      deleted[collectionName] = 0;
      continue;
    }
    const result = await db.collection(collectionName).deleteMany({
      _id: { $in: stale.map((id) => new Types.ObjectId(id)) },
    });
    deleted[collectionName] = result.deletedCount;
  }
  return deleted;
}

async function deleteStaleSalesAggregates(
  db: Db,
  previousKeys: string[] | undefined,
  currentKeys: string[],
): Promise<number> {
  const current = new Set(currentKeys);
  const staleKeys = (previousKeys ?? []).filter((key) => !current.has(key));
  let deleted = 0;
  for (let offset = 0; offset < staleKeys.length; offset += BATCH_SIZE) {
    const operations: AnyBulkWriteOperation<Document>[] = staleKeys
      .slice(offset, offset + BATCH_SIZE)
      .map((key) => ({
        deleteOne: { filter: salesAggregateFilterFromKey(key) },
      }));
    if (operations.length) {
      const result = await db
        .collection('ventas_agregadas')
        .bulkWrite(operations, { ordered: true });
      deleted += result.deletedCount;
    }
  }
  return deleted;
}

async function countExisting(
  db: Db,
  ids: RegistryEntityIds,
): Promise<Record<string, number>> {
  const entries: Array<[keyof RegistryEntityIds, string]> = [
    ['users', 'usuarios'],
    ['orders', 'pedidos'],
    ['reviews', 'reseñas_producto'],
    ['reports', 'reportes_cliente'],
    ['notifications', 'notificaciones_cliente'],
  ];
  const result: Record<string, number> = {};
  for (const [key, collectionName] of entries) {
    result[collectionName] = await db.collection(collectionName).countDocuments({
      _id: { $in: ids[key].map((id) => new Types.ObjectId(id)) },
    });
  }
  return result;
}

async function verifyApplied(
  db: Db,
  ids: RegistryEntityIds,
  expectedAggregates: Document[],
): Promise<Record<string, unknown>> {
  const counts = await countExisting(db, ids);
  const expected = {
    usuarios: ids.users.length,
    pedidos: ids.orders.length,
    'reseñas_producto': ids.reviews.length,
    reportes_cliente: ids.reports.length,
    notificaciones_cliente: ids.notifications.length,
  };
  for (const [collection, count] of Object.entries(expected)) {
    if (counts[collection] !== count) {
      throw new Error(
        `Verificación fallida en ${collection}: ${counts[collection]} != ${count}`,
      );
    }
  }
  const statusCounts = await db
    .collection('pedidos')
    .aggregate<{ _id: string; count: number }>([
      { $match: { _id: { $in: ids.orders.map((id) => new Types.ObjectId(id)) } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  const orphanReviews = await db
    .collection('reseñas_producto')
    .aggregate([
      { $match: { _id: { $in: ids.reviews.map((id) => new Types.ObjectId(id)) } } },
      {
        $lookup: {
          from: 'pedidos',
          let: { orderId: { $toObjectId: '$orderId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$orderId'] } } },
            { $match: { status: OrderStatus.COMPLETED } },
          ],
          as: 'order',
        },
      },
      { $match: { order: { $size: 0 } } },
      { $count: 'count' },
    ])
    .toArray();
  if (orphanReviews[0]?.count) {
    throw new Error(`Hay ${orphanReviews[0].count} reseñas sin pedido completado.`);
  }
  const actualAggregates: Document[] = [];
  for (let offset = 0; offset < expectedAggregates.length; offset += BATCH_SIZE) {
    const filters = expectedAggregates
      .slice(offset, offset + BATCH_SIZE)
      .map((document) => ({
        productId: document.productId,
        periodType: document.periodType,
        periodStart: document.periodStart,
      }));
    actualAggregates.push(
      ...(await db
        .collection('ventas_agregadas')
        .find({ $or: filters })
        .toArray()),
    );
  }
  if (actualAggregates.length !== expectedAggregates.length) {
    throw new Error(
      `Verificación de ventas fallida: ${actualAggregates.length} != ${expectedAggregates.length}.`,
    );
  }
  const expectedByKey = new Map(
    expectedAggregates.map((document) => [
      makeSalesAggregateKey(
        String(document.productId),
        document.periodType as SalesPeriodType,
        document.periodStart as Date,
      ),
      document,
    ]),
  );
  for (const actual of actualAggregates) {
    const key = makeSalesAggregateKey(
      String(actual.productId),
      actual.periodType as SalesPeriodType,
      actual.periodStart as Date,
    );
    const expectedDocument = expectedByKey.get(key);
    if (
      !expectedDocument ||
      Number(actual.totalUnits) !== Number(expectedDocument.totalUnits) ||
      Number(actual.totalRevenue) !== Number(expectedDocument.totalRevenue) ||
      Number(actual.totalOrders) !== Number(expectedDocument.totalOrders) ||
      JSON.stringify(actual.orderIds ?? []) !==
        JSON.stringify(expectedDocument.orderIds ?? [])
    ) {
      throw new Error(`Agregado de ventas inconsistente: ${key}.`);
    }
  }
  return {
    counts,
    orderStatuses: Object.fromEntries(
      statusCounts.map((item) => [item._id, item.count]),
    ),
    orphanReviews: 0,
    salesAggregates: expectedAggregates.length,
  };
}

async function main(): Promise<void> {
  const { apply, sourcePath } = parseArgs();
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI no está definida.');
  if ((process.env.NODE_ENV ?? 'development') === 'production') {
    throw new Error('El seeder sintético está bloqueado en producción.');
  }
  const target = parseLocalTarget(uri);
  if (apply && process.env.SYNTHETIC_SEED_CONFIRM !== target.confirmation) {
    throw new Error(
      `Para aplicar define SYNTHETIC_SEED_CONFIRM=${target.confirmation}`,
    );
  }
  const path = resolveSeedPath(sourcePath);
  const seed = loadSeed(path);
  const hash = sourceHash(path);
  const connection = await createConnection(uri, {
    serverSelectionTimeoutMS: 8_000,
    autoIndex: false,
  }).asPromise();
  const db = connection.db;
  if (!db) throw new Error('MongoDB no inicializó la base.');
  if (
    !LOCAL_HOSTS.has(connection.host.toLowerCase()) ||
    connection.name !== target.database
  ) {
    throw new Error('La conexión efectiva no coincide con la guarda local.');
  }
  try {
    const products = await loadProducts(db, seed);
    const built = await buildDocuments(connection, seed, products);
    const ids = entityIds(built);
    const registry = db.collection<SyntheticRunRegistry>(REGISTRY_COLLECTION);
    const previous = await registry.findOne({ _id: seed.metadata.generation_run_id });
    const ownedEntityIds = mergeRegistryEntityIds(
      previous?.entityIds,
      previous?.pendingEntityIds,
    );
    const ownedSalesAggregateKeys = Array.from(
      new Set([
        ...(previous?.salesAggregateKeys ?? []),
        ...(previous?.pendingSalesAggregateKeys ?? []),
      ]),
    );
    await assertNoCollisions(db, built, ownedEntityIds);
    const sales = await buildSalesAggregates(
      db,
      connection,
      built.orders,
      ownedEntityIds.orders,
    );
    const productRatingUpdates = await buildProductRatingUpdates(
      db,
      built.reviews,
      ownedEntityIds.reviews,
    );
    const existing = await countExisting(db, ids);
    const dryRunSummary = {
      mode: apply ? 'apply' : 'dry-run',
      target: {
        host: target.host,
        port: target.port,
        database: target.database,
      },
      source: {
        path,
        sha256: hash,
        generationRunId: seed.metadata.generation_run_id,
      },
      planned: {
        users: built.users.length,
        orders: built.orders.length,
        reviews: built.reviews.length,
        reports: built.reports.length,
        notifications: built.notifications.length,
        salesAggregates: sales.documents.length,
        productRatings: productRatingUpdates.length,
      },
      alreadyPresent: existing,
      demoAccount: {
        email: built.users[0].email,
        password: DEMO_PASSWORD,
      },
    };
    if (!apply) {
      console.log(JSON.stringify(dryRunSummary, null, 2));
      return;
    }
    const startedAt = new Date();
    await registry.replaceOne(
      { _id: seed.metadata.generation_run_id },
      {
        _id: seed.metadata.generation_run_id,
        schemaVersion: seed.metadata.schema_version,
        status: 'applying',
        sourceSha256: hash,
        target: `${target.host}:${target.port}/${target.database}`,
        startedAt,
        entityIds: ownedEntityIds,
        pendingEntityIds: ids,
        salesAggregateKeys: ownedSalesAggregateKeys,
        pendingSalesAggregateKeys: sales.keys,
      },
      { upsert: true },
    );
    try {
      await replaceDocuments(db.collection('usuarios'), built.users);
      await replaceDocuments(db.collection('pedidos'), built.orders);
      await replaceDocuments(db.collection('reportes_cliente'), built.reports);
      await replaceDocuments(db.collection('reseñas_producto'), built.reviews);
      await replaceDocuments(
        db.collection('notificaciones_cliente'),
        built.notifications,
      );
      const staleDeleted = await deleteStaleEntities(
        db,
        ownedEntityIds,
        ids,
      );
      const ratingsUpdated = await applyProductRatingUpdates(
        db,
        productRatingUpdates,
      );
      await upsertSalesAggregates(
        db.collection('ventas_agregadas'),
        sales.documents,
      );
      const staleSalesDeleted = await deleteStaleSalesAggregates(
        db,
        ownedSalesAggregateKeys,
        sales.keys,
      );
      const verification = await verifyApplied(db, ids, sales.documents);
      const completedAt = new Date();
      await registry.replaceOne(
        { _id: seed.metadata.generation_run_id },
        {
          _id: seed.metadata.generation_run_id,
          schemaVersion: seed.metadata.schema_version,
          status: 'complete',
          sourceSha256: hash,
          target: `${target.host}:${target.port}/${target.database}`,
          startedAt,
          completedAt,
          entityIds: ids,
          salesAggregateKeys: sales.keys,
          counts: dryRunSummary.planned,
          staleDeleted: {
            ...staleDeleted,
            ventas_agregadas: staleSalesDeleted,
          },
          ratingsUpdated,
          verification,
        },
        { upsert: true },
      );
      console.log(
        JSON.stringify(
          {
            ...dryRunSummary,
            status: 'complete',
            staleDeleted: {
              ...staleDeleted,
              ventas_agregadas: staleSalesDeleted,
            },
            ratingsUpdated,
            verification,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      await registry.updateOne(
        { _id: seed.metadata.generation_run_id },
        {
          $set: {
            status: 'failed',
            failedAt: new Date(),
            error: error instanceof Error ? error.message : String(error),
          },
        },
      );
      throw error;
    }
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
