/*
 * INHALEX — ETL 02: extracción producto-mes para predicción de demanda.
 *
 * Se ejecuta con mongosh y es de SOLO LECTURA. Construye una observación por
 * producto y mes objetivo usando únicamente información disponible antes de
 * iniciar ese mes. Por ello evita fuga temporal de la variable objetivo.
 *
 * Ejemplo de uso:
 *   mongosh "$env:MONGODB_URI" --file 02_extraccion_demanda_mensual_mongodb.js \
 *     | Out-File -Encoding utf8 dataset_demanda_mongodb.jsonl
 *
 * La salida JSONL contiene las columnas de dataset_prediccion_demanda.csv.
 */

const ORDER_COLLECTION = 'pedidos';
const PRODUCT_COLLECTION = 'productos';
const REVIEW_COLLECTION = 'reseñas_producto';
const EFFECTIVE_ORDER_STATUSES = ['confirmed', 'completed'];
const PUBLISHED_REVIEW_STATUS = 'published';

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function firstDayOfMonth(month) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1, 1));
}

function lastInstantBeforeMonth(month) {
  return new Date(firstDayOfMonth(month).getTime() - 1);
}

function numeric(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

// 1. Pedidos efectivos desanidados: una fila por producto dentro del pedido.
const orderItems = db
  .getCollection(ORDER_COLLECTION)
  .aggregate(
    [
      {
        $match: {
          status: { $in: EFFECTIVE_ORDER_STATUSES },
          createdAt: { $type: 'date' },
          'items.0': { $exists: true },
        },
      },
      { $unwind: '$items' },
      {
        $project: {
          orderedAt: '$createdAt',
          orderReference: '$reference',
          productId: '$items.productId',
          productName: '$items.productName',
          productSlug: '$items.productSlug',
          category: '$items.category',
          quantity: { $ifNull: ['$items.quantity', '$items.requestedQuantity'] },
          unitPrice: '$items.unitPrice',
        },
      },
      {
        $match: {
          productId: { $type: 'string', $ne: '' },
          quantity: { $gt: 0 },
        },
      },
      { $sort: { orderedAt: 1 } },
    ],
    { allowDiskUse: true },
  )
  .toArray();

if (orderItems.length === 0) {
  throw new Error(
    'No hay ítems de pedidos confirmed/completed. Verifica la conexión y los estados configurados.',
  );
}

// 2. Catálogo actual. Sólo se usa como respaldo para el precio o nombre si
//    faltara un dato en el snapshot histórico del pedido.
const productsById = new Map();
db.getCollection(PRODUCT_COLLECTION)
  .find({}, { _id: 1, name: 1, slug: 1, category: 1, price: 1, status: 1 })
  .forEach((product) => productsById.set(String(product._id), product));

// 3. Reseñas publicadas. Se incorporan únicamente las existentes al corte.
const reviews = db
  .getCollection(REVIEW_COLLECTION)
  .find(
    { status: PUBLISHED_REVIEW_STATUS, createdAt: { $type: 'date' } },
    { _id: 0, productId: 1, rating: 1, createdAt: 1 },
  )
  .sort({ createdAt: 1 })
  .toArray();

// 4. Agregación por producto-mes de unidades, pedidos y venta ponderada.
const monthly = new Map();
const productInfo = new Map();
const months = new Set();

orderItems.forEach((item) => {
  const month = monthKey(item.orderedAt);
  const key = `${item.productId}__${month}`;
  const bucket = monthly.get(key) || {
    units: 0,
    orders: new Set(),
    revenue: 0,
  };
  const quantity = numeric(item.quantity);
  bucket.units += quantity;
  bucket.orders.add(item.orderReference || `${item.productId}-${item.orderedAt.toISOString()}`);
  bucket.revenue += quantity * numeric(item.unitPrice);
  monthly.set(key, bucket);
  months.add(month);

  if (!productInfo.has(item.productId)) {
    const catalog = productsById.get(item.productId) || {};
    productInfo.set(item.productId, {
      product_id: item.productId,
      producto: item.productName || catalog.name || item.productSlug || item.productId,
      categoria: item.category || catalog.category || 'sin_categoria',
      price: numeric(item.unitPrice, numeric(catalog.price)),
    });
  }
});

const orderedMonths = Array.from(months).sort();
if (orderedMonths.length < 4) {
  throw new Error(
    `Se requieren al menos cuatro meses con pedidos efectivos; sólo se encontraron ${orderedMonths.length}.`,
  );
}

function monthlyValue(productId, month) {
  return monthly.get(`${productId}__${month}`) || { units: 0, orders: new Set(), revenue: 0 };
}

function reviewStatsUntil(productId, cutoff) {
  const valid = reviews.filter(
    (review) => review.productId === productId && review.createdAt <= cutoff,
  );
  const total = valid.reduce((sum, review) => sum + numeric(review.rating), 0);
  return {
    rating: valid.length ? Math.round((total / valid.length) * 100) / 100 : 0,
    count: valid.length,
  };
}

// 5. Para cada mes objetivo se calculan rezagos M-1, M-2 y M-3. La variable
//    Y son las unidades efectivamente solicitadas en el mes objetivo.
const output = [];
for (let index = 3; index < orderedMonths.length; index += 1) {
  const targetMonth = orderedMonths[index];
  const lag1Month = orderedMonths[index - 1];
  const lag2Month = orderedMonths[index - 2];
  const lag3Month = orderedMonths[index - 3];
  const cutoff = lastInstantBeforeMonth(targetMonth);

  productInfo.forEach((product, productId) => {
    const lag1 = monthlyValue(productId, lag1Month);
    const lag2 = monthlyValue(productId, lag2Month);
    const lag3 = monthlyValue(productId, lag3Month);
    const target = monthlyValue(productId, targetMonth);
    const reviewsAtCutoff = reviewStatsUntil(productId, cutoff);
    const [year, monthNumber] = targetMonth.split('-').map(Number);
    const fallbackPrice = product.price;
    const lag1Price = lag1.units > 0 ? lag1.revenue / lag1.units : fallbackPrice;

    output.push({
      fecha_corte: cutoff.toISOString().slice(0, 10),
      mes_objetivo: targetMonth,
      product_id: product.product_id,
      producto: product.producto,
      categoria: product.categoria,
      demanda_lag_1m: lag1.units,
      demanda_lag_2m: lag2.units,
      demanda_lag_3m: lag3.units,
      promedio_demanda_3m: Math.round(((lag1.units + lag2.units + lag3.units) / 3) * 100) / 100,
      pedidos_lag_1m: lag1.orders.size,
      precio_promedio_lag_1m: Math.round(lag1Price * 100) / 100,
      rating_promedio_al_corte: reviewsAtCutoff.rating,
      cantidad_resenas_al_corte: reviewsAtCutoff.count,
      numero_mes: monthNumber,
      Y_unidades_solicitadas_mes: target.units,
      generation_run_id: 'mongodb-operational-extraction',
      is_synthetic: false,
      _metadata: { year, source_statuses: EFFECTIVE_ORDER_STATUSES },
    });
  });
}

output
  .sort((a, b) => a.mes_objetivo.localeCompare(b.mes_objetivo) || a.product_id.localeCompare(b.product_id))
  .forEach((row) => print(JSON.stringify(row)));

print(
  JSON.stringify({
    _etl_summary: {
      process: '02_extraccion_demanda_mensual_mongodb',
      source_collections: [ORDER_COLLECTION, PRODUCT_COLLECTION, REVIEW_COLLECTION],
      accepted_order_statuses: EFFECTIVE_ORDER_STATUSES,
      months_detected: orderedMonths,
      product_month_rows_exported: output.length,
      note: 'Salida JSONL; excluir esta última línea antes de convertir a CSV.',
    },
  }),
);
