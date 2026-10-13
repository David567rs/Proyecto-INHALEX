/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const cache = new Map();
function load(relativePath) {
  const filename = path.resolve(projectRoot, relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  cache.set(filename, loaded);
  loaded.require = (importPath) => {
    if (importPath.startsWith('@/')) return load(`src/${importPath.slice(2)}.ts`);
    if (importPath.startsWith('.')) return load(`${path.resolve(path.dirname(filename), importPath)}.ts`);
    throw new Error(`Unexpected import: ${importPath}`);
  };
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  loaded._compile(outputText, filename);
  return loaded.exports;
}

const { ApiError } = load('src/core/network/ApiError.ts');
const { OrderHistoryApiAdapter } = load('src/features/orderHistory/data/adapters/OrderHistoryApiAdapter.ts');
const { HttpOrderHistoryRepository } = load('src/features/orderHistory/data/repositories/HttpOrderHistoryRepository.ts');
const { mapOrderHistoryPage, mapOrderHistoryDetail } = load('src/features/orderHistory/data/mappers/orderHistoryMapper.ts');

const orderId = '69a7d21b350f57ff952f6e82';
const olderOrderId = '69a7d21b350f57ff952f6e81';
const productId = '69a7d21b350f57ff952f6e80';
const nextCursor = Buffer.from(JSON.stringify({ v: 1, date: '2026-10-13T18:00:00.000Z', id: orderId })).toString('base64url');
function entry(patch = {}) {
  return { id: orderId, reference: 'PED-20261013-DEMO01', status: 'pending_review', currency: 'MXN',
    totalItems: 2, subtotal: 160.5, createdAt: '2026-10-13T18:00:00.000Z', ...patch };
}
function item(patch = {}) {
  return { productId, productName: 'Aroma Demo', presentation: '10 ml', image: '/images/demo.jpg',
    quantity: 2, unitPrice: 80.25, subtotal: 160.5, currency: 'MXN', ...patch };
}
function address(patch = {}) {
  return { label: 'Casa', recipientName: 'Persona Demo', phone: '5555555555', street: 'Calle Demo', exteriorNumber: '12',
    neighborhood: 'Centro', municipality: 'Ciudad Demo', state: 'Estado Demo', postalCode: '12345', ...patch };
}
function detail(patch = {}) {
  return { ...entry(), items: [item()], shippingAddress: address(), ...patch };
}
function page(patch = {}) { return { orders: [entry()], nextCursor: null, ...patch }; }
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { resolve, promise };
}
function setup(request = async (endpoint) => endpoint.startsWith('/orders/me/') ? detail() : page()) {
  let token = 'fixture-first-token';
  let reads = 0;
  const calls = [];
  const session = { getAccessToken: async () => { reads += 1; return token; } };
  const adapter = new OrderHistoryApiAdapter({ request: async (endpoint, options) => {
    calls.push({ endpoint, options });
    return request(endpoint, options);
  } }, session);
  return { adapter, repository: new HttpOrderHistoryRepository(adapter, 'https://store.example.test'), session, calls,
    setToken(value) { token = value; }, get reads() { return reads; } };
}

test('customer list, cursor pagination and detail use GET with a fresh bearer token for every request', async () => {
  const fixture = setup();
  await fixture.repository.list();
  fixture.setToken('fixture-second-token');
  await fixture.repository.list(nextCursor);
  await fixture.repository.getById(orderId.toUpperCase());
  assert.equal(fixture.reads, 3);
  assert.deepEqual(fixture.calls, [
    { endpoint: '/orders/me', options: { method: 'GET', token: 'fixture-first-token' } },
    { endpoint: `/orders/me?cursor=${nextCursor}`, options: { method: 'GET', token: 'fixture-second-token' } },
    { endpoint: `/orders/me/${orderId}`, options: { method: 'GET', token: 'fixture-second-token' } },
  ]);
});

test('missing tokens and already inactive operations cannot send customer requests', async () => {
  for (const operation of ['list', 'getById']) {
    const fixture = setup();
    const run = (guard) => operation === 'list' ? fixture.repository.list(undefined, guard) : fixture.repository.getById(orderId, guard);
    for (const token of [null, '', ' ']) {
      fixture.setToken(token);
      await assert.rejects(run(), error => error instanceof ApiError && error.status === 401);
    }
    const previousReads = fixture.reads;
    await assert.rejects(run(() => false), error => error.status === 401);
    assert.equal(fixture.reads, previousReads);
    assert.equal(fixture.calls.length, 0);
  }
});

test('a session change while loading the token prevents both list and detail requests', async () => {
  for (const operation of ['list', 'getById']) {
    const fixture = setup();
    const pending = deferred();
    let current = true;
    fixture.session.getAccessToken = () => pending.promise;
    const promise = operation === 'list' ? fixture.repository.list(undefined, () => current) : fixture.repository.getById(orderId, () => current);
    current = false;
    pending.resolve('fixture-other-account-token');
    await assert.rejects(promise, error => error.status === 401);
    assert.equal(fixture.calls.length, 0);
  }
});

test('a late history or order detail response cannot escape a session change during HTTP', async () => {
  for (const operation of ['list', 'getById']) {
    const pending = deferred();
    const fixture = setup(() => pending.promise);
    let current = true;
    const promise = operation === 'list' ? fixture.repository.list(undefined, () => current) : fixture.repository.getById(orderId, () => current);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(fixture.calls.length, 1);
    current = false;
    pending.resolve(operation === 'list' ? page() : detail());
    await assert.rejects(promise, error => error.status === 401);
  }
});

test('token storage failure propagates without contacting the API', async () => {
  const fixture = setup();
  const failure = new Error('Storage unavailable');
  fixture.session.getAccessToken = async () => { throw failure; };
  await assert.rejects(fixture.repository.list(), error => error === failure);
  await assert.rejects(fixture.repository.getById(orderId), error => error === failure);
  assert.equal(fixture.calls.length, 0);
});

test('invalid IDs and cursors fail locally before reading credentials or making HTTP requests', async () => {
  const fixture = setup();
  for (const cursor of ['', 'a'.repeat(257), '/orders', 'cursor with spaces', 'abc=', 'x&ownerId=other', null, 1, {}]) {
    await assert.rejects(fixture.repository.list(cursor), /historial/);
  }
  for (const id of ['', 'not-a-mongo-id', `${orderId}/receipt`, ` ${orderId}`, null, 1, {}]) {
    await assert.rejects(fixture.repository.getById(id), error => error instanceof ApiError && error.status === 404);
  }
  assert.equal(fixture.reads, 0);
  assert.equal(fixture.calls.length, 0);
});

test('list mapping permits a truthful empty page and whitelists the public customer summary', () => {
  assert.deepEqual(mapOrderHistoryPage({ orders: [], nextCursor: null }), { orders: [], nextCursor: null });
  const result = mapOrderHistoryPage(page({ orders: [entry({ currency: 'mxn', reference: '  PED-DEMO  ', customerUserId: 'private',
    idempotencyKey: 'private', statusNotes: ['private'], shippingAddress: address() })], debug: 'private' }));
  assert.deepEqual(result, page({ orders: [entry({ reference: 'PED-DEMO' })] }));
});

test('all four real customer statuses are allowed while draft and invented shipping states are rejected', () => {
  for (const status of ['pending_review', 'confirmed', 'cancelled', 'completed']) {
    assert.equal(mapOrderHistoryPage(page({ orders: [entry({ status })] })).orders[0].status, status);
  }
  for (const status of ['draft', 'shipped', 'delivered', 'unknown', undefined]) {
    assert.throws(() => mapOrderHistoryPage(page({ orders: [entry({ status })] })), /información de tus pedidos/);
  }
});

test('one malformed row rejects the whole page, including invalid calendar dates and totals', () => {
  for (const patch of [{ id: '' }, { reference: '' }, { totalItems: 0 }, { totalItems: 1.2 }, { totalItems: Number.MAX_SAFE_INTEGER + 1 },
    { subtotal: -1 }, { subtotal: Infinity }, { subtotal: NaN }, { subtotal: '160.5' }, { currency: 'pesos' },
    { createdAt: 'yesterday' }, { createdAt: '2026-02-30T18:00:00.000Z' }, { createdAt: '2026-10-13' },
    { createdAt: '2026-10-13T18:00:00.000' }, { createdAt: undefined }]) {
    assert.throws(() => mapOrderHistoryPage(page({ orders: [entry(), entry({ ...patch, id: patch.id ?? olderOrderId })] })), /información de tus pedidos/);
  }
  for (const value of [null, undefined, [], {}, { orders: '[]', nextCursor: null }, page({ orders: [null] })]) {
    assert.throws(() => mapOrderHistoryPage(value), /información de tus pedidos/);
  }
});

test('pages preserve newest-first ordering with an ID tie-breaker and reject duplicates or oversized pages', () => {
  const ordered = [entry(), entry({ id: olderOrderId }), entry({ id: productId, createdAt: '2026-10-12T18:00:00.000Z' })];
  assert.deepEqual(mapOrderHistoryPage(page({ orders: ordered })).orders, ordered);
  for (const orders of [[entry(), entry()], [...ordered].reverse(), [entry({ id: olderOrderId }), entry()],
    Array.from({ length: 21 }, (_, index) => entry({ id: (99 - index).toString(16).padStart(24, '0') }))]) {
    assert.throws(() => mapOrderHistoryPage(page({ orders })), /información de tus pedidos/);
  }
});

test('pagination requires a bounded opaque cursor and rejects empty or non-advancing continuation pages', async () => {
  assert.equal(mapOrderHistoryPage(page({ nextCursor })).nextCursor, nextCursor);
  for (const cursor of ['', 'a'.repeat(257), 'abc=', '../unsafe', undefined, {}, 1]) {
    assert.throws(() => mapOrderHistoryPage(page({ nextCursor: cursor })), /información de tus pedidos/);
  }
  assert.throws(() => mapOrderHistoryPage(page({ orders: [], nextCursor })), /información de tus pedidos/);
  await assert.rejects(setup(async () => page({ nextCursor })).repository.list(nextCursor), /avanzar en el historial/);
});

test('detail contains the immutable shipping snapshot and safe image URLs, excluding internal properties', () => {
  const result = mapOrderHistoryDetail(detail({ idempotencyKey: 'secret', customer: { email: 'private' },
    statusNotes: ['private'], items: [item({ reservedQuantity: 2, stockAvailable: 10 })],
    shippingAddress: address({ sourceAddressId: 'private', interiorNumber: '  2B  ', references: '  Puerta verde  ' }) }), 'https://store.example.test');
  assert.equal(result.items[0].imageUrl, 'https://store.example.test/images/demo.jpg');
  assert.equal(result.items[0].reservedQuantity, undefined);
  assert.equal(result.idempotencyKey, undefined);
  assert.equal(result.customer, undefined);
  assert.equal(result.statusNotes, undefined);
  assert.deepEqual(result.shippingAddress, address({ interiorNumber: '2B', references: 'Puerta verde' }));
  assert.equal(mapOrderHistoryDetail(detail({ shippingAddress: null })).shippingAddress, null);
  for (const image of ['javascript:alert(1)', 'http://insecure.example.test/image.png', '//external.test/image.jpg', 'https://user:password@example.test/image.jpg']) {
    assert.equal(mapOrderHistoryDetail(detail({ items: [item({ image })] })).items[0].imageUrl, null);
  }
});

test('historical quantities and number of items are not constrained by current checkout limits', () => {
  const largeQuantity = detail({ items: [item({ quantity: 30, subtotal: 2407.5 })], totalItems: 30, subtotal: 2407.5 });
  assert.equal(mapOrderHistoryDetail(largeQuantity).items[0].quantity, 30);
  const items = Array.from({ length: 21 }, (_, index) => item({ productId: index.toString(16).padStart(24, '0'), quantity: 1, unitPrice: 0.1, subtotal: 0.1 }));
  const result = mapOrderHistoryDetail(detail({ items, totalItems: 21, subtotal: 2.1 }));
  assert.equal(result.items.length, 21);
});

test('detail rejects mismatched totals, duplicate products, inconsistent currency and malformed snapshots', () => {
  for (const patch of [{ totalItems: 3 }, { subtotal: 160.4 }, { items: [] }, { items: [item(), item()], totalItems: 4, subtotal: 321 },
    { items: [null] }, { shippingAddress: undefined }, { shippingAddress: {} }, { shippingAddress: address({ recipientName: '' }) },
    { shippingAddress: address({ references: {} }) }]) {
    assert.throws(() => mapOrderHistoryDetail(detail(patch)), /información de tus pedidos/);
  }
  for (const patch of [{ productId: 'invalid' }, { productName: '' }, { presentation: {} }, { image: null },
    { quantity: -1 }, { quantity: 0 }, { quantity: 1.5 }, { quantity: '2' }, { unitPrice: Infinity }, { unitPrice: -1 },
    { subtotal: NaN }, { subtotal: 160 }, { currency: 'USD' }]) {
    assert.throws(() => mapOrderHistoryDetail(detail({ items: [item(patch)] })), /información de tus pedidos/);
  }
});

test('detail response ID must match the selected order even when the rest of the response is valid', async () => {
  await assert.rejects(setup(async () => detail({ id: olderOrderId })).repository.getById(orderId), /pedido seleccionado/);
});

test('an unavailable or foreign order retains 404 classification with a customer-facing message', async () => {
  const serverError = new ApiError('Not Found', 404);
  await assert.rejects(setup(async () => { throw serverError; }).repository.getById(orderId), error =>
    error instanceof ApiError && error.status === 404 && error.message === 'No encontramos este pedido en tu cuenta.' && error.cause === serverError);
});

test('connection, unauthorized and server failures retain their original status for controller recovery', async () => {
  for (const failure of [new ApiError('Bad cursor', 400), new ApiError('Unauthorized', 401), new ApiError('Forbidden', 403),
    new ApiError('Internal failure', 500), new ApiError('Timeout')]) {
    const fixture = setup(async () => { throw failure; });
    await assert.rejects(fixture.repository.list(), error => error === failure);
    await assert.rejects(fixture.repository.getById(orderId), error => error === failure);
  }
});
