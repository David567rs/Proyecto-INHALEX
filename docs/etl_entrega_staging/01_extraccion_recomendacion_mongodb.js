/*
 * INHALEX — ETL 01: extracción transaccional para reglas de asociación.
 *
 * Este archivo se ejecuta con mongosh y SOLAMENTE lee MongoDB. No contiene
 * credenciales y no inserta, actualiza ni elimina documentos.
 *
 * Ejemplo de uso (desde una terminal con MONGODB_URI configurada):
 *   mongosh "$env:MONGODB_URI" --file 01_extraccion_recomendacion_mongodb.js \
 *     | Out-File -Encoding utf8 dataset_apriori_transacciones.jsonl
 *
 * El resultado tiene una observación por pedido:
 *   { tid, ordered_at, items, basket_size }
 *
 * "items" conserva los slugs separados por | para ser compatible con el
 * dataset de desarrollo dataset_apriori_transacciones.csv (tid,items).
 */

const ORDER_COLLECTION = 'pedidos';
const EFFECTIVE_ORDER_STATUSES = ['confirmed', 'completed'];

const pipeline = [
  {
    $match: {
      status: { $in: EFFECTIVE_ORDER_STATUSES },
      createdAt: { $type: 'date' },
      'items.0': { $exists: true },
    },
  },
  {
    $project: {
      tid: { $ifNull: ['$reference', { $toString: '$_id' }] },
      ordered_at: '$createdAt',
      items: 1,
    },
  },
  { $unwind: '$items' },
  {
    $match: {
      'items.productSlug': { $type: 'string', $ne: '' },
    },
  },
  {
    $group: {
      _id: '$tid',
      ordered_at: { $first: '$ordered_at' },
      products: { $addToSet: '$items.productSlug' },
    },
  },
  { $sort: { ordered_at: 1, _id: 1 } },
];

const rows = db
  .getCollection(ORDER_COLLECTION)
  .aggregate(pipeline, { allowDiskUse: true })
  .toArray();

rows.forEach((row) => {
  const products = row.products.filter(Boolean).sort();

  print(
    JSON.stringify({
      tid: row._id,
      ordered_at: row.ordered_at.toISOString(),
      items: products.join('|'),
      basket_size: products.length,
    }),
  );
});

print(
  JSON.stringify({
    _etl_summary: {
      process: '01_extraccion_recomendacion_mongodb',
      source_collection: ORDER_COLLECTION,
      accepted_statuses: EFFECTIVE_ORDER_STATUSES,
      baskets_exported: rows.length,
      note: 'Salida JSONL; excluir esta última línea antes de convertir a CSV.',
    },
  }),
);
