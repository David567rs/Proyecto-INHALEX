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

const { CartApiAdapter } = load('src/features/cart/data/adapters/CartApiAdapter.ts');
const { HttpCartRepository } = load('src/features/cart/data/repositories/HttpCartRepository.ts');
const { createEmptyCart, getCartQuantityLimit } = load('src/features/cart/domain/entities/Cart.ts');
const { ApiError } = load('src/core/network/ApiError.ts');
const product = {
  _id: '69a7d21b350f57ff952f6e8f', name: 'Menta', slug: 'menta',
  description: 'Notas frescas.', price: 60, currency: 'MXN',
  image: '/products/menta.jpg', category: 'verde', presentation: '10ml',
  origin: 'Natural', inStock: true, stockAvailable: 8,
};
const empty = () => ({ items: [], totalItems: 0, subtotal: 0, currency: 'MXN' });
const item = (quantity = 2, overrides = {}) => ({ productId: product._id, product, quantity, subtotal: quantity * 60, ...overrides });
const snapshot = (items = [item()], overrides = {}) => ({
  items, totalItems: items.reduce((sum, value) => sum + value.quantity, 0),
  subtotal: items.reduce((sum, value) => sum + value.subtotal, 0), currency: 'MXN', ...overrides,
});

function setup(request = async () => empty()) {
  let token = 'fixture-first-token';
  let reads = 0;
  const calls = [];
  const session = { getAccessToken: async () => { reads += 1; return token; } };
  const adapter = new CartApiAdapter({
    request: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return request(endpoint, options);
    },
  }, session);
  const repository = new HttpCartRepository(adapter, 'https://assets.example.test');
  return { adapter, repository, calls, session, setToken(value) { token = value; }, get reads() { return reads; } };
}

test('all cart requests use fresh authentication and only the required body fields', async () => {
  const fixture = setup();
  const reference = 'menta/verde?from=#bolsa';
  await fixture.adapter.list();
  fixture.setToken('fixture-next-token');
  await fixture.adapter.add(reference, 3);
  await fixture.adapter.updateQuantity(reference, 4);
  await fixture.adapter.remove(reference);
  await fixture.adapter.clear();
  assert.equal(fixture.reads, 5);
  assert.deepEqual(fixture.calls, [
    { endpoint: '/cart', options: { method: 'GET', token: 'fixture-first-token' } },
    { endpoint: '/cart', options: { method: 'POST', body: { productId: reference, quantity: 3 }, token: 'fixture-next-token' } },
    { endpoint: '/cart/menta%2Fverde%3Ffrom%3D%23bolsa', options: { method: 'PATCH', body: { quantity: 4 }, token: 'fixture-next-token' } },
    { endpoint: '/cart/menta%2Fverde%3Ffrom%3D%23bolsa', options: { method: 'DELETE', token: 'fixture-next-token' } },
    { endpoint: '/cart', options: { method: 'DELETE', token: 'fixture-next-token' } },
  ]);
});

test('missing session or storage failure never produces an unauthenticated request', async () => {
  const fixture = setup();
  for (const token of [null, '', '  ']) {
    fixture.setToken(token);
    for (const operation of [() => fixture.repository.list(), () => fixture.repository.add(product._id, 1), () => fixture.repository.updateQuantity(product._id, 2), () => fixture.repository.remove(product._id), () => fixture.repository.clear()]) {
      await assert.rejects(operation(), error => error instanceof ApiError && error.status === 401);
    }
  }
  const failure = new Error('Storage unavailable');
  fixture.session.getAccessToken = async () => { throw failure; };
  await assert.rejects(fixture.repository.list(), error => error === failure);
  assert.equal(fixture.calls.length, 0);
});

test('expired lifecycle is checked before and after the asynchronous token read', async () => {
  const stale = setup();
  await assert.rejects(stale.repository.list({ isCurrent: () => false }), error => error.status === 401);
  assert.equal(stale.reads, 0);
  for (const action of ['list', 'add', 'updateQuantity', 'remove', 'clear']) {
    const fixture = setup();
    let releaseToken;
    let active = true;
    fixture.session.getAccessToken = () => new Promise(resolve => { releaseToken = resolve; });
    const guard = { isCurrent: () => active };
    const promise = ['list', 'clear'].includes(action) ? fixture.repository[action](guard)
      : action === 'remove' ? fixture.repository.remove(product._id, guard)
      : fixture.repository[action](product._id, 2, guard);
    active = false;
    releaseToken('fixture-replacement-account-token');
    await assert.rejects(promise, error => error.status === 401);
    assert.equal(fixture.calls.length, 0);
  }
});

test('cart mapping retains server prices, API order, images and quantities', async () => {
  const expiredPromo = { ...product, promoActive: true, promoPrice: 40, promoEndsAt: '2000-01-01T00:00:00Z' };
  const first = item(2, { product: expiredPromo, subtotal: 80 });
  const second = item(1, { productId: 'second', product: { ...product, _id: 'second', name: 'Eucalipto' } });
  const cart = await setup(async () => snapshot([first, second])).repository.list();
  assert.deepEqual(cart.items.map(value => value.productId), [product._id, 'second']);
  assert.equal(cart.items[0].product.effectivePrice, 60);
  assert.equal(cart.items[0].unitPrice, 40);
  assert.equal(cart.items[0].subtotal, 80);
  assert.equal(cart.items[0].product.imageUrl, 'https://assets.example.test/products/menta.jpg');
  assert.equal(cart.totalItems, 3);
  assert.equal(cart.subtotal, 140);
  assert.equal(cart.currency, 'MXN');
});

test('valid empty snapshots stay empty and local empty carts never share mutable arrays', async () => {
  assert.deepEqual(await setup().repository.list(), empty());
  const first = createEmptyCart();
  const second = createEmptyCart();
  first.items.push(item());
  assert.deepEqual(second, empty());
});

test('malformed envelopes and invalid monetary totals fail instead of becoming empty carts', async () => {
  for (const malformed of [undefined, null, [], {}, { ...empty(), items: {} }, { ...empty(), totalItems: '0' }, { ...empty(), totalItems: -1 }, { ...empty(), totalItems: 0.5 }, { ...empty(), subtotal: -1 }, { ...empty(), subtotal: NaN }, { ...empty(), subtotal: Infinity }, { ...empty(), subtotal: '0' }, { ...empty(), subtotal: Number.MAX_VALUE }, { ...empty(), currency: '' }, { ...empty(), currency: 'MXN extra' }]) {
    await assert.rejects(setup(async () => malformed).repository.list(), /confirmar la información/);
  }
});

test('identities, duplicate rows, product payloads and quantities must be valid', async () => {
  const malformedItems = [null, {}, item(0), item(26), item(1.5), item(NaN), item(2, { quantity: '2' }),
    item(2, { productId: '' }), item(2, { productId: ' ' }), item(2, { productId: 'wrong' }),
    item(2, { product: null }), item(2, { product: { ...product, name: '' } }),
    item(2, { product: { ...product, price: -1 } }), item(2, { subtotal: -1 }), item(2, { subtotal: Infinity })];
  for (const malformed of malformedItems) {
    await assert.rejects(setup(async () => ({ items: [malformed], totalItems: 2, subtotal: 120, currency: 'MXN' })).repository.list());
  }
  await assert.rejects(setup(async () => snapshot([item(), item()])).repository.list(), /confirmar la información/);
});

test('inconsistent totals and mixed currencies fail without overriding server data', async () => {
  for (const malformed of [snapshot([item()], { totalItems: 1 }), snapshot([item()], { subtotal: 119.99 }), snapshot([item()], { currency: 'USD' }), snapshot([item(2, { product: { ...product, currency: 'invalid' } })]), snapshot([item(2, { product: { ...product, currency: undefined } })])]) {
    await assert.rejects(setup(async () => malformed).repository.list(), /confirmar la información/);
  }
  const centItems = [item(1, { subtotal: 0.1 }), item(1, { productId: 'other', subtotal: 0.2, product: { ...product, _id: 'other' } })];
  const cart = await setup(async () => snapshot(centItems, { subtotal: 0.3 })).repository.list();
  assert.equal(cart.subtotal, 0.3);
  assert.equal(cart.items[1].unitPrice, 0.2);
});

test('valid writes return the complete acknowledged cart snapshot', async () => {
  const fixture = setup(async (endpoint, options) => options.method === 'DELETE' ? empty() : snapshot([item(options.body.quantity)]));
  const added = await fixture.repository.add(product._id, 2);
  assert.equal(added.items[0].quantity, 2);
  const updated = await fixture.repository.updateQuantity(product._id, 3);
  assert.equal(updated.subtotal, 180);
  assert.deepEqual(await fixture.repository.remove(product._id), empty());
  assert.deepEqual(await fixture.repository.clear(), empty());
});

test('a mismatched mutation acknowledgment is an error so the controller can revalidate', async () => {
  await assert.rejects(setup().repository.add(product._id, 1), /confirmar el cambio/);
  await assert.rejects(setup().repository.updateQuantity(product._id, 1), /confirmar el cambio/);
  await assert.rejects(setup(async () => snapshot()).repository.updateQuantity(product._id, 3), /confirmar el cambio/);
  await assert.rejects(setup(async () => snapshot([item(1)])).repository.add(product._id, 2), /confirmar el cambio/);
  await assert.rejects(setup(async () => snapshot()).repository.remove(product._id), /confirmar el cambio/);
  await assert.rejects(setup(async () => null).repository.remove(product._id), /confirmar la información/);
  await assert.rejects(setup(async () => snapshot()).repository.clear(), /confirmar el cambio/);
  await assert.rejects(setup(async () => null).repository.clear(), /confirmar la información/);
});

test('outbound invalid IDs and quantities are rejected before token storage or HTTP access', async () => {
  const fixture = setup();
  for (const reference of [null, undefined, '', ' ', ' padded ']) {
    await assert.rejects(fixture.repository.add(reference, 1), /identificar el producto/);
    await assert.rejects(fixture.repository.updateQuantity(reference, 1), /identificar el producto/);
    await assert.rejects(fixture.repository.remove(reference), /identificar el producto/);
  }
  for (const quantity of [null, undefined, 0, -1, 26, 1.5, NaN, Infinity, '2']) {
    await assert.rejects(fixture.repository.add(product._id, quantity), /cantidad/);
    await assert.rejects(fixture.repository.updateQuantity(product._id, quantity), /cantidad/);
  }
  assert.equal(fixture.reads, 0);
  assert.equal(fixture.calls.length, 0);
});

test('HTTP authentication, connection and missing-product errors propagate unchanged', async () => {
  for (const failure of [new ApiError('Unauthorized', 401), new ApiError('Not found', 404), new ApiError('Connection interrupted')]) {
    const fixture = setup(async () => { throw failure; });
    for (const operation of [() => fixture.repository.list(), () => fixture.repository.add(product._id, 1), () => fixture.repository.updateQuantity(product._id, 2), () => fixture.repository.remove(product._id), () => fixture.repository.clear()]) {
      await assert.rejects(operation(), error => error === failure);
    }
  }
});

test('quantity limits honor backorders, availability, stock and the API maximum', () => {
  const base = { inStock: true, allowBackorder: false };
  assert.equal(getCartQuantityLimit(base), 25);
  assert.equal(getCartQuantityLimit({ ...base, stockAvailable: 3.9 }), 3);
  assert.equal(getCartQuantityLimit({ ...base, stockAvailable: 90 }), 25);
  assert.equal(getCartQuantityLimit({ ...base, stockAvailable: -3 }), 0);
  assert.equal(getCartQuantityLimit({ ...base, stockAvailable: 0 }), 0);
  assert.equal(getCartQuantityLimit({ ...base, inStock: false, stockAvailable: 9 }), 0);
  assert.equal(getCartQuantityLimit({ ...base, inStock: false, stockAvailable: 0, allowBackorder: true }), 25);
});
