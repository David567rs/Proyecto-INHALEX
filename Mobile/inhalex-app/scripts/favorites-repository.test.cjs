const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

// Load the real TypeScript adapter, repository and mapper without native storage.
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

const { FavoritesApiAdapter } = load('src/features/favorites/data/adapters/FavoritesApiAdapter.ts');
const { HttpFavoritesRepository } = load('src/features/favorites/data/repositories/HttpFavoritesRepository.ts');
const { ApiError } = load('src/core/network/ApiError.ts');
const product = {
  _id: '69a7d21b350f57ff952f6e8f',
  name: 'Menta',
  slug: 'menta',
  description: 'Notas frescas y herbales.',
  price: 60,
  currency: 'MXN',
  image: '/products/menta.jpg',
  category: 'verde',
  presentation: '10ml',
  origin: 'Natural',
  inStock: true,
};

function setup(request = async () => []) {
  let token = 'fixture-first-token';
  let reads = 0;
  const calls = [];
  const session = { getAccessToken: async () => { reads += 1; return token; } };
  const adapter = new FavoritesApiAdapter({
    request: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return request(endpoint, options);
    },
  }, session);
  const repository = new HttpFavoritesRepository(adapter, 'https://assets.example.test');
  return { adapter, repository, calls, session, setToken(value) { token = value; }, get reads() { return reads; } };
}

test('authenticated list/add/remove use the current token and encode the product reference', async () => {
  const fixture = setup(async () => ({}));
  const reference = 'menta/verde?from=#favoritos';
  await fixture.adapter.list();
  fixture.setToken('fixture-replacement-token');
  await fixture.adapter.add(reference);
  await fixture.adapter.remove(reference);
  assert.equal(fixture.reads, 3);
  assert.deepEqual(fixture.calls, [
    { endpoint: '/favorites', options: { method: 'GET', token: 'fixture-first-token' } },
    { endpoint: '/favorites/menta%2Fverde%3Ffrom%3D%23favoritos', options: { method: 'PUT', token: 'fixture-replacement-token' } },
    { endpoint: '/favorites/menta%2Fverde%3Ffrom%3D%23favoritos', options: { method: 'DELETE', token: 'fixture-replacement-token' } },
  ]);
});

test('missing or cleared sessions reject as unauthorized without sending HTTP requests', async () => {
  const fixture = setup();
  for (const token of [null, '', '  ']) {
    fixture.setToken(token);
    for (const operation of [() => fixture.repository.list(), () => fixture.repository.add(product._id), () => fixture.repository.remove(product._id)]) {
      await assert.rejects(operation(), error => error instanceof ApiError && error.status === 401 && /sesión/.test(error.message));
    }
  }
  assert.equal(fixture.calls.length, 0);
  fixture.setToken('fixture-restored-token');
  assert.deepEqual(await fixture.repository.list(), []);
  fixture.setToken(null);
  await assert.rejects(fixture.repository.list(), error => error.status === 401);
  assert.equal(fixture.calls.length, 1);
});

test('favorite products share catalog mapping, preserve API order and deduplicate identities', async () => {
  const second = { ...product, _id: 'second-product', name: 'Eucalipto' };
  const fixture = setup(async () => [product, second, { ...product, name: 'Duplicado' }]);
  const products = await fixture.repository.list();
  assert.deepEqual(products.map(item => item.id), [product._id, 'second-product']);
  assert.equal(products[0].name, 'Menta');
  assert.equal(products[0].effectivePrice, 60);
  assert.equal(products[0].imageUrl, 'https://assets.example.test/products/menta.jpg');
  assert.deepEqual(products[0].aromas, []);
  assert.equal(products[0].inStock, true);
});

test('a valid empty list stays empty while malformed payloads fail visibly', async () => {
  assert.deepEqual(await setup(async () => []).repository.list(), []);
  for (const response of [null, undefined, {}, { items: [product] }, 'offline']) {
    await assert.rejects(setup(async () => response).repository.list(), /leer tus favoritos/);
  }
  for (const malformed of [null, {}, { ...product, _id: '' }, { ...product, price: NaN }, { ...product, price: -1 }]) {
    await assert.rejects(setup(async () => [malformed]).repository.list(), /datos incompletos/);
  }
});

test('writes resolve only when the API acknowledges the same product', async () => {
  const fixture = setup(async () => ({ productId: product._id }));
  assert.equal(await fixture.repository.add(product._id), undefined);
  assert.equal(await fixture.repository.remove(product._id), undefined);
  for (const response of [null, undefined, {}, { productId: '' }, { productId: 'another-product' }]) {
    const invalid = setup(async () => response).repository;
    await assert.rejects(invalid.add(product._id), /confirmar el cambio/);
    await assert.rejects(invalid.remove(product._id), /confirmar el cambio/);
  }
});

test('empty product identities never reach the network', async () => {
  const fixture = setup();
  for (const id of ['', '  ', null, undefined]) {
    await assert.rejects(fixture.repository.add(id), /identificar el producto/);
    await assert.rejects(fixture.repository.remove(id), /identificar el producto/);
  }
  assert.equal(fixture.calls.length, 0);
});

test('HTTP authorization, missing-product and connection failures remain errors for the ViewModel', async () => {
  for (const error of [new ApiError('Sesión rechazada', 401), new ApiError('Producto no disponible', 404), new ApiError('Sin conexión')]) {
    const fixture = setup(async () => { throw error; });
    await assert.rejects(fixture.repository.list(), actual => actual === error);
    await assert.rejects(fixture.repository.add(product._id), actual => actual === error);
    await assert.rejects(fixture.repository.remove(product._id), actual => actual === error);
  }
});

test('session storage failures propagate without making an unauthenticated request', async () => {
  const fixture = setup();
  const failure = new Error('Almacenamiento temporalmente no disponible');
  fixture.session.getAccessToken = async () => { throw failure; };
  await assert.rejects(fixture.repository.list(), actual => actual === failure);
  assert.equal(fixture.calls.length, 0);
});

test('a stopped session cannot send an operation after its token read resolves', async () => {
  for (const action of ['list', 'add', 'remove']) {
    const fixture = setup();
    let releaseToken;
    let reading = false;
    let active = true;
    const guard = { isCurrent: () => active };
    fixture.session.getAccessToken = () => {
      reading = true;
      return new Promise(resolve => { releaseToken = resolve; });
    };
    const pending = action === 'list'
      ? fixture.repository.list(guard)
      : fixture.repository[action](product._id, guard);
    assert.equal(reading, true);
    active = false;
    releaseToken('fixture-next-account-token');
    await assert.rejects(pending, error => error instanceof ApiError && error.status === 401);
    assert.equal(fixture.calls.length, 0);
  }
});

test('an already-stale operation is rejected before reading session storage', async () => {
  const fixture = setup();
  await assert.rejects(fixture.repository.add(product._id, { isCurrent: () => false }), error => error.status === 401);
  assert.equal(fixture.reads, 0);
  assert.equal(fixture.calls.length, 0);
});
