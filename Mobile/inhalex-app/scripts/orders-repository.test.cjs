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
    if (importPath === '@/core/config/environment') return { environment: { apiUrl: 'https://api.example.test/api', requestTimeoutMs: 1000 } };
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

const { HttpClient } = load('src/core/network/HttpClient.ts');
const { ApiError } = load('src/core/network/ApiError.ts');
const { OrderApiAdapter } = load('src/features/orders/data/adapters/OrderApiAdapter.ts');
const { HttpOrderRepository } = load('src/features/orders/data/repositories/HttpOrderRepository.ts');
const { mapOrderPreview, mapConfirmedOrder } = load('src/features/orders/data/mappers/orderMapper.ts');
const { normalizeOrderItems, normalizeConfirmOrderInput, validateOrderContact, OrderInputError } = load('src/features/orders/domain/entities/Order.ts');

const productId = '69a7d21b350f57ff952f6e8f';
const otherProductId = '69a7d21b350f57ff952f6e80';
const addressId = '69a7d21b350f57ff952f6e81';
const orderId = '69a7d21b350f57ff952f6e82';
const signature = 'a'.repeat(64);
const key = 'fixture-order-confirmation-0001';
const items = [{ productId, quantity: 2 }];
function contact(overrides = {}) {
  return { customerName: 'Persona Demo', customerEmail: 'demo@example.test', customerPhone: '5555555555', ...overrides };
}
function input(overrides = {}) {
  return { items, ...contact(), shippingAddressId: addressId, previewSignature: signature, ...overrides };
}
function item(overrides = {}) {
  return {
    productId, productName: 'Aroma Demo', productSlug: 'aroma-demo', image: '/images/demo.jpg',
    category: 'aromas', presentation: '10 ml', origin: 'México', unitPrice: 80.25, currency: 'MXN',
    requestedQuantity: 2, quantity: 2, subtotal: 160.5, fulfillment: 'available', stockAvailable: 10,
    reservedQuantity: 2, backorderQuantity: 0, inventoryTracked: true, allowBackorder: false, ...overrides,
  };
}
function preview(overrides = {}) {
  return { items: [item()], issues: [], subtotal: 160.5, totalItems: 2, currency: 'MXN',
    canCreateDraft: true, canConfirmOrder: true, needsManualReview: false, signature, ...overrides };
}
function confirmed(overrides = {}) {
  return { ...preview(), orderId, reference: 'PED-20261013-DEMO01', status: 'pending_review', createdAt: '2026-10-13T17:00:00.000Z', ...overrides };
}
function setup(request = async (endpoint) => endpoint === '/orders/confirm' ? confirmed() : preview()) {
  let token = 'fixture-first-token';
  let reads = 0;
  const calls = [];
  const session = { getAccessToken: async () => { reads += 1; return token; } };
  const adapter = new OrderApiAdapter({ request: async (endpoint, options) => {
    calls.push({ endpoint, options });
    return request(endpoint, options);
  } }, session);
  return { adapter, repository: new HttpOrderRepository(adapter, 'https://store.example.test'), session, calls,
    setToken(value) { token = value; }, get reads() { return reads; } };
}

test('contact validation trims text, normalizes email and returns field errors', () => {
  const draft = contact({ customerName: '  Persona Demo  ', customerEmail: ' Demo@Example.Test ', customerPhone: ' 5555555555 ' });
  assert.deepEqual(validateOrderContact(draft), { value: contact(), errors: {}, isValid: true });
  assert.equal(draft.customerName, '  Persona Demo  ');
  for (const bad of [null, {}, contact({ customerName: 'x' }), contact({ customerEmail: 'not-email' }), contact({ customerPhone: '+525555555555' })]) {
    assert.equal(validateOrderContact(bad).isValid, false);
  }
  assert.deepEqual(Object.keys(validateOrderContact(null).errors).sort(), ['customerEmail', 'customerName', 'customerPhone']);
  for (const phone of ['5'.repeat(10), '5'.repeat(15)]) assert.equal(validateOrderContact(contact({ customerPhone: phone })).isValid, true);
  for (const phone of ['5'.repeat(9), '5'.repeat(16), '555 5555555', 5555555555]) assert.ok(validateOrderContact(contact({ customerPhone: phone })).errors.customerPhone);
  assert.ok(validateOrderContact(contact({ customerName: 'x'.repeat(121) })).errors.customerName);
  assert.ok(validateOrderContact(contact({ customerEmail: `${'x'.repeat(120)}@example.test` })).errors.customerEmail);
});

test('order items enforce the API size, Mongo IDs, uniqueness and quantity boundaries', () => {
  assert.deepEqual(normalizeOrderItems([{ productId: productId.toUpperCase(), quantity: 25, unitPrice: 0 }]), [{ productId, quantity: 25 }]);
  assert.equal(normalizeOrderItems(Array.from({ length: 20 }, (_, index) => ({ productId: index.toString(16).padStart(24, '0'), quantity: 1 }))).length, 20);
  for (const invalid of [null, [], Array.from({ length: 21 }, () => items[0]), [null], [{}], [{ productId: 'demo', quantity: 1 }],
    [items[0], { productId: productId.toUpperCase(), quantity: 1 }], ...[0, -1, 26, 1.5, NaN, Infinity, '2'].map(quantity => [{ productId, quantity }])]) {
    assert.throws(() => normalizeOrderItems(invalid), OrderInputError);
  }
});

test('confirmation requires a selected address and preview; body never includes prices or unknown fields', () => {
  assert.deepEqual(normalizeConfirmOrderInput(input({ notes: '  Entrega por la tarde  ', total: 0, customerName: ' Persona Demo ' })), input({ notes: 'Entrega por la tarde' }));
  for (const invalid of [input({ shippingAddressId: '' }), input({ shippingAddressId: 'invented' }), input({ previewSignature: '' }),
    input({ notes: 'x'.repeat(601) }), input({ notes: null })]) assert.throws(() => normalizeConfirmOrderInput(invalid), OrderInputError);
  assert.deepEqual(normalizeConfirmOrderInput(input({ notes: '  ' })), input());
});

test('adapter sends only preview/confirm payloads with fresh sessions and the same supplied idempotency key', async () => {
  const fixture = setup();
  await fixture.adapter.preview([{ ...items[0], price: 0 }]);
  fixture.setToken('fixture-second-token');
  await fixture.adapter.confirm(input({ subtotal: 0, ownerId: 'forbidden', status: 'completed' }), key);
  await fixture.adapter.confirm(input(), key);
  assert.equal(fixture.reads, 3);
  assert.deepEqual(fixture.calls, [
    { endpoint: '/orders/draft/preview', options: { method: 'POST', body: { items }, token: 'fixture-first-token' } },
    { endpoint: '/orders/confirm', options: { method: 'POST', idempotencyKey: key, body: input(), token: 'fixture-second-token' } },
    { endpoint: '/orders/confirm', options: { method: 'POST', idempotencyKey: key, body: input(), token: 'fixture-second-token' } },
  ]);
});

test('missing tokens and changed sessions cannot send either operation', async () => {
  for (const operation of ['preview', 'confirm']) {
    const fixture = setup();
    const run = (guard) => operation === 'preview' ? fixture.repository.preview(items, guard) : fixture.repository.confirm(input(), key, guard);
    for (const token of [null, '', ' ']) {
      fixture.setToken(token);
      await assert.rejects(run(), error => error instanceof ApiError && error.status === 401);
    }
    await assert.rejects(run(() => false), error => error.status === 401);
    let active = true;
    let release;
    fixture.session.getAccessToken = () => new Promise(resolve => { release = resolve; });
    const promise = run(() => active);
    active = false;
    release('fixture-different-account-token');
    await assert.rejects(promise, error => error.status === 401);
    assert.equal(fixture.calls.length, 0);
  }
});

test('storage failures propagate without requests', async () => {
  const fixture = setup();
  const failure = new Error('Storage unavailable');
  fixture.session.getAccessToken = async () => { throw failure; };
  await assert.rejects(fixture.repository.preview(items), error => error === failure);
  await assert.rejects(fixture.repository.confirm(input(), key), error => error === failure);
  assert.equal(fixture.calls.length, 0);
});

test('mapper preserves authoritative prices, safe image URLs and known fields only', () => {
  const result = mapOrderPreview(preview({ unknown: 'ignored', items: [item({ unitPrice: 0.1, subtotal: 0.2, message: ' Entrega sujeta a revisión ' })], subtotal: 0.2 }), 'https://store.example.test');
  assert.equal(result.items[0].imageUrl, 'https://store.example.test/images/demo.jpg');
  assert.equal(result.items[0].message, 'Entrega sujeta a revisión');
  assert.equal(result.subtotal, 0.2);
  assert.equal(result.unknown, undefined);
  assert.equal(mapOrderPreview(preview({ items: [item({ image: 'javascript:alert(1)' })] })).items[0].imageUrl, null);
});

test('preview allows stock adjustments, manual review, backorder and empty unavailable bag', async () => {
  const issue = { code: 'quantity_adjusted', severity: 'warning', productId, productName: 'Aroma Demo', title: 'Cantidad ajustada', description: 'Queda una unidad.' };
  const adjusted = preview({ items: [item({ quantity: 1, subtotal: 80.25, reservedQuantity: 1, fulfillment: 'adjusted' })], issues: [issue], totalItems: 1, subtotal: 80.25 });
  assert.equal((await setup(async () => adjusted).repository.preview(items)).items[0].quantity, 1);
  for (const fulfillment of ['manual', 'backorder']) {
    assert.equal(mapOrderPreview(preview({ needsManualReview: true, items: [item({ fulfillment, stockAvailable: null, reservedQuantity: 0, backorderQuantity: fulfillment === 'backorder' ? 2 : 0 })] })).needsManualReview, true);
  }
  const empty = preview({ items: [], issues: [{ ...issue, code: 'out_of_stock', severity: 'error' }], totalItems: 0, subtotal: 0, canCreateDraft: false, canConfirmOrder: false });
  assert.equal((await setup(async () => empty).repository.preview(items)).canConfirmOrder, false);
});

test('whole-response validation rejects malformed or inconsistent totals and quantities', () => {
  for (const value of [null, undefined, '[]', {}, { items: [] }, preview({ subtotal: 160 }), preview({ totalItems: 3 }),
    preview({ items: [] }), preview({ signature: 'bad' }), preview({ issues: [null] }), preview({ issues: [{ severity: 'warn' }] }),
    preview({ currency: 'pesos' }), preview({ canConfirmOrder: 'true' }), preview({ needsManualReview: undefined }),
    preview({ items: [item(), item()], subtotal: 321, totalItems: 4 })]) {
    assert.throws(() => mapOrderPreview(value), /información del pedido/);
  }
  for (const patch of [{ productId: '' }, { productName: '' }, { quantity: 0 }, { quantity: 3 }, { unitPrice: NaN },
    { subtotal: Infinity }, { currency: 'USD' }, { reservedQuantity: 3 }, { requestedQuantity: 26 }, { stockAvailable: -1 },
    { fulfillment: 'shipped' }, { allowBackorder: 1 }, { inventoryTracked: undefined }, { message: {} }]) {
    assert.throws(() => mapOrderPreview(preview({ items: [item(patch)] })), /información del pedido/);
  }
});

test('response items must belong to the reviewed request and retain requested quantities', async () => {
  for (const response of [preview({ items: [item({ productId: otherProductId })] }), preview({ items: [item({ requestedQuantity: 3 })] })]) {
    await assert.rejects(setup(async () => response).repository.preview(items), /productos solicitados/);
    await assert.rejects(setup(async () => confirmed(response)).repository.confirm(input(), key), /productos solicitados/);
  }
});

test('a confirmation requires a persisted order ID, reference, real status and the reviewed signature', async () => {
  for (const patch of [{ orderId: '' }, { reference: '' }, { status: 'draft' }, { status: 'shipped' }, { createdAt: 'yesterday' }]) {
    assert.throws(() => mapConfirmedOrder(confirmed(patch)), /información del pedido/);
  }
  await assert.rejects(setup(async () => confirmed({ signature: 'b'.repeat(64) })).repository.confirm(input(), key), /resumen confirmado/);
  for (const status of ['pending_review', 'confirmed', 'completed', 'cancelled']) {
    const result = await setup(async () => confirmed({ status })).repository.confirm(input(), key);
    assert.equal(result.status, status);
    assert.equal(result.orderId, orderId);
  }
});

test('invalid outbound items, contact, address and keys fail before token/HTTP access', async () => {
  const fixture = setup();
  for (const invalid of [[], [{ productId, quantity: 26 }]]) await assert.rejects(fixture.repository.preview(invalid), OrderInputError);
  for (const invalid of [input({ customerPhone: '' }), input({ shippingAddressId: '' }), input({ previewSignature: 'bad' })]) {
    await assert.rejects(fixture.repository.confirm(invalid, key), OrderInputError);
  }
  for (const invalid of ['', 'short', ' '.repeat(16), 'a'.repeat(101), 'invalid/key_with_slashes', null]) {
    await assert.rejects(fixture.repository.confirm(input(), invalid), OrderInputError);
  }
  assert.equal(fixture.calls.length, 0);
  assert.equal(fixture.reads, 0);
});

test('400, unauthorized, changed inventory, server and network errors retain their original status', async () => {
  for (const failure of [new ApiError('La dirección ya no existe', 400), new ApiError('Unauthorized', 401),
    new ApiError('Inventory changed', 409), new ApiError('Internal failure', 500), new ApiError('Timeout')]) {
    const fixture = setup(async () => { throw failure; });
    await assert.rejects(fixture.repository.preview(items), error => error === failure);
    await assert.rejects(fixture.repository.confirm(input(), key), error => error === failure);
  }
});

test('an uncertain confirmation can replay exactly the same request and read the existing order', async () => {
  let sent = 0;
  const fixture = setup(async () => {
    if (++sent === 1) throw new ApiError('Response lost after saving');
    return confirmed();
  });
  await assert.rejects(fixture.repository.confirm(input(), key));
  const replay = await fixture.repository.confirm(input(), key);
  assert.equal(replay.orderId, orderId);
  assert.deepEqual(fixture.calls[0], fixture.calls[1]);
});

test('HTTP transport includes Idempotency-Key beside the bearer and JSON headers only when requested', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return { status: 200, ok: true, headers: { get: () => 'application/json' }, json: async () => confirmed() };
  };
  try {
    const client = new HttpClient('https://api.example.test/api');
    await client.request('/orders/confirm', { method: 'POST', body: input(), token: 'fixture-token', idempotencyKey: key });
    await client.request('/products');
    assert.equal(requests[0].url, 'https://api.example.test/api/orders/confirm');
    assert.deepEqual(requests[0].options.headers, { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer fixture-token', 'Idempotency-Key': key });
    assert.deepEqual(JSON.parse(requests[0].options.body), input());
    assert.deepEqual(requests[1].options.headers, { Accept: 'application/json' });
  } finally {
    global.fetch = originalFetch;
  }
});
