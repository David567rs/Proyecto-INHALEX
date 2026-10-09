const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');

// Run the production controller and error mapper; no React hooks or native APIs are mocked.
function loadController() {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, {
      exports,
      Error,
      Promise,
      setTimeout: (...args) => setTimeout(...args),
      clearTimeout: (...args) => clearTimeout(...args),
      require(importPath) {
        if (importPath.startsWith('@/')) {
          return load(path.join(projectRoot, 'src', `${importPath.slice(2)}.ts`));
        }
        if (importPath.startsWith('.')) {
          return load(`${path.resolve(path.dirname(filename), importPath)}.ts`);
        }
        throw new Error(`Unexpected runtime import: ${importPath}`);
      },
    }, { filename });
    return exports;
  }
  return load(path.join(projectRoot, 'src/features/catalog/presentation/viewModels/CatalogController.ts'));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function product(id, overrides = {}) {
  return {
    id,
    slug: id,
    name: id,
    description: `Descripción de ${id}`,
    price: 60,
    effectivePrice: 60,
    promoActive: false,
    currency: 'MXN',
    image: `/products/${id}.jpg`,
    imageUrl: null,
    category: 'linea-verde',
    aromas: [],
    benefits: [],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    allowBackorder: false,
    ...overrides,
  };
}

function page(products, total = products.length) {
  return { products, total, page: 1, totalPages: 1 };
}

const categories = [{ id: 'linea-verde', name: 'Línea verde', count: 2 }];
const flush = () => new Promise(resolve => setImmediate(resolve));

function createFixture(context) {
  const calls = { products: [], categories: [], details: [] };
  const repository = {
    listProducts(query) {
      const pending = deferred();
      calls.products.push({ query: { ...query }, ...pending });
      return pending.promise;
    },
    listCategories() {
      const pending = deferred();
      calls.categories.push(pending);
      return pending.promise;
    },
    findProduct(idOrSlug) {
      const pending = deferred();
      calls.details.push({ idOrSlug, ...pending });
      return pending.promise;
    },
  };
  const { CatalogController } = loadController();
  const controller = new CatalogController(repository);
  context.after(() => controller.stop());
  return { controller, calls };
}

async function ready(fixture, products = [product('menta')]) {
  const start = fixture.controller.start();
  await flush();
  fixture.calls.products[0].resolve(page(products));
  fixture.calls.categories[0].resolve(categories);
  await start;
}

test('initial load exposes loading, then real products and categories in one shared snapshot', async context => {
  const { controller, calls } = createFixture(context);
  assert.equal(controller.getSnapshot().status, 'loading');
  const start = controller.start();
  await flush();
  assert.equal(controller.getSnapshot().categoriesLoading, true);
  assert.deepEqual(calls.products[0].query, { search: '', categoryId: 'all', page: 1, limit: 100 });
  const products = Array.from({ length: 8 }, (_, index) => product(`aroma-${index}`));
  calls.products[0].resolve(page(products));
  calls.categories[0].resolve(categories);
  await start;
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.status, 'ready');
  assert.equal(snapshot.total, 8);
  assert.equal(snapshot.products.length, 8);
  assert.equal(snapshot.featuredProducts.length, 6);
  assert.equal(snapshot.products[0].id, 'aroma-0');
  assert.equal(snapshot.categories[0].id, 'all');
  assert.equal(snapshot.categories[1].id, 'linea-verde');
  assert.equal(snapshot.categoriesLoading, false);
  assert.equal(snapshot.errorMessage, null);
});

test('an empty API page produces an empty state without invented products', async context => {
  const fixture = createFixture(context);
  await ready(fixture, []);
  assert.equal(fixture.controller.getSnapshot().status, 'empty');
  assert.equal(fixture.controller.getSnapshot().products.length, 0);
  assert.equal(fixture.controller.getSnapshot().total, 0);
  assert.equal(fixture.controller.getSnapshot().errorMessage, null);
});

test('connection failures surface independently and retry recovers the same controller', async context => {
  const { controller, calls } = createFixture(context);
  const start = controller.start();
  await flush();
  calls.products[0].reject(new Error('Sin conexión de prueba'));
  calls.categories[0].reject(new Error('Líneas no disponibles'));
  await start;
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().errorMessage, 'Sin conexión de prueba');
  assert.equal(controller.getSnapshot().categoriesErrorMessage, 'Líneas no disponibles');
  const retry = controller.getSnapshot().retry();
  assert.equal(controller.getSnapshot().status, 'loading');
  await flush();
  calls.products[1].resolve(page([product('toronjil')]));
  calls.categories[1].resolve(categories);
  await retry;
  assert.equal(controller.getSnapshot().status, 'ready');
  assert.equal(controller.getSnapshot().products[0].id, 'toronjil');
  assert.equal(controller.getSnapshot().errorMessage, null);
  assert.equal(controller.getSnapshot().categoriesErrorMessage, null);
});

test('a category failure leaves successfully loaded products usable', async context => {
  const { controller, calls } = createFixture(context);
  const start = controller.start();
  await flush();
  calls.products[0].resolve(page([product('menta')]));
  calls.categories[0].reject(new Error('Líneas no disponibles'));
  await start;
  assert.equal(controller.getSnapshot().status, 'ready');
  assert.equal(controller.getSnapshot().products[0].id, 'menta');
  assert.equal(controller.getSnapshot().categories[0].name, 'Todos');
  assert.equal(controller.getSnapshot().categoriesErrorMessage, 'Líneas no disponibles');
});

test('failed refresh retains the current products and clears the warning after successful refresh', async context => {
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  const refresh = controller.refresh();
  assert.equal(controller.getSnapshot().refreshing, true);
  assert.equal(controller.getSnapshot().status, 'ready');
  await flush();
  calls.products[1].reject(new Error('Se perdió la conexión'));
  calls.categories[1].resolve(categories);
  await refresh;
  assert.equal(controller.getSnapshot().status, 'ready');
  assert.equal(controller.getSnapshot().products[0].id, 'menta');
  assert.equal(controller.getSnapshot().total, 1);
  assert.equal(controller.getSnapshot().errorMessage, 'Se perdió la conexión');
  assert.equal(controller.getSnapshot().refreshing, false);
  const recovering = controller.refresh();
  await flush();
  calls.products[2].resolve(page([product('menta', { effectivePrice: 45 })]));
  calls.categories[2].resolve(categories);
  await recovering;
  assert.equal(controller.getSnapshot().products[0].effectivePrice, 45);
  assert.equal(controller.getSnapshot().errorMessage, null);
});

test('failed refresh after an empty result surfaces a connection error and retry can recover', async context => {
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture, []);
  assert.equal(controller.getSnapshot().status, 'empty');
  const refresh = controller.refresh();
  await flush();
  calls.products[1].reject(new Error('No se pudo conectar con INHALEX'));
  calls.categories[1].resolve(categories);
  await refresh;
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().products.length, 0);
  assert.equal(controller.getSnapshot().errorMessage, 'No se pudo conectar con INHALEX');
  assert.equal(controller.getSnapshot().refreshing, false);
  const retry = controller.retry();
  assert.equal(controller.getSnapshot().status, 'loading');
  await flush();
  calls.products[2].resolve(page([product('menta')]));
  calls.categories[2].resolve(categories);
  await retry;
  assert.equal(controller.getSnapshot().status, 'ready');
  assert.equal(controller.getSnapshot().products[0].id, 'menta');
  assert.equal(controller.getSnapshot().errorMessage, null);
});

test('refreshing remains active until products and categories both settle', async context => {
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  const refresh = controller.refresh();
  await flush();
  calls.products[1].resolve(page([product('menta', { effectivePrice: 50 })]));
  await flush();
  assert.equal(controller.getSnapshot().products[0].effectivePrice, 50);
  assert.equal(controller.getSnapshot().refreshing, true);
  calls.categories[1].resolve(categories);
  await refresh;
  assert.equal(controller.getSnapshot().refreshing, false);
});

test('overlapping refreshes keep the newest refresh active and ignore older results', async context => {
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  const first = controller.refresh();
  await flush();
  const second = controller.refresh();
  await flush();
  calls.products[1].resolve(page([product('respuesta-antigua')]));
  calls.categories[1].reject(new Error('Error de la recarga anterior'));
  await first;
  assert.equal(controller.getSnapshot().products[0].id, 'menta');
  assert.equal(controller.getSnapshot().categoriesErrorMessage, null);
  assert.equal(controller.getSnapshot().refreshing, true);
  calls.products[2].resolve(page([product('respuesta-nueva')]));
  await flush();
  assert.equal(controller.getSnapshot().refreshing, true);
  calls.categories[2].resolve(categories);
  await second;
  assert.equal(controller.getSnapshot().products[0].id, 'respuesta-nueva');
  assert.equal(controller.getSnapshot().refreshing, false);
});

test('search waits 280ms from the last edit and sends only the final trimmed query', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  controller.setSearchQuery('men');
  context.mock.timers.tick(200);
  controller.setSearchQuery('  menta  ');
  context.mock.timers.tick(279);
  await flush();
  assert.equal(calls.products.length, 1);
  assert.equal(controller.getSnapshot().searchQuery, '  menta  ');
  context.mock.timers.tick(1);
  await flush();
  assert.equal(calls.products.length, 2);
  assert.equal(calls.products[1].query.search, 'menta');
  assert.equal(controller.getSnapshot().status, 'loading');
  calls.products[1].resolve(page([product('menta')]));
  await flush();
  assert.equal(controller.getSnapshot().status, 'ready');
});

test('typing invalidates an older response before the debounced query starts', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, calls } = createFixture(context);
  const start = controller.start();
  await flush();
  controller.setSearchQuery('menta');
  calls.products[0].resolve(page([product('producto-de-consulta-anterior')]));
  calls.categories[0].resolve(categories);
  await start;
  assert.equal(controller.getSnapshot().products.length, 0);
  assert.equal(controller.getSnapshot().status, 'loading');
  context.mock.timers.tick(280);
  await flush();
  calls.products[1].resolve(page([product('menta')]));
  await flush();
  assert.equal(controller.getSnapshot().products[0].id, 'menta');
});

test('category changes discard out-of-order results and never show the wrong filtered products', async context => {
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  controller.selectCategory('linea-insomnio');
  await flush();
  controller.selectCategory('linea-verde');
  await flush();
  calls.products[2].resolve(page([product('menta')]));
  await flush();
  calls.products[1].resolve(page([product('toronjil', { category: 'linea-insomnio' })]));
  await flush();
  assert.equal(controller.getSnapshot().selectedCategoryId, 'linea-verde');
  assert.equal(controller.getSnapshot().products[0].id, 'menta');
  controller.selectCategory('linea-resfriado');
  await flush();
  calls.products[3].reject(new Error('Filtro no disponible'));
  await flush();
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().products.length, 0);
});

test('resetFilters cancels debounce and clears search and category atomically', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  controller.selectCategory('linea-insomnio');
  await flush();
  calls.products[1].resolve(page([product('toronjil')]));
  await flush();
  controller.setSearchQuery('toronjil');
  const emitted = [];
  const unsubscribe = controller.subscribe(() => {
    const snapshot = controller.getSnapshot();
    emitted.push([snapshot.searchQuery, snapshot.selectedCategoryId]);
  });
  controller.resetFilters();
  assert.ok(emitted.length > 0);
  assert.ok(emitted.every(([query, category]) => query === '' && category === 'all'));
  await flush();
  assert.equal(calls.products[2].query.search, '');
  assert.equal(calls.products[2].query.categoryId, 'all');
  context.mock.timers.tick(280);
  await flush();
  assert.equal(calls.products.length, 3);
  calls.products[2].resolve(page([product('menta')]));
  await flush();
  assert.equal(controller.getSnapshot().status, 'ready');
  unsubscribe();
});

test('refresh during debounce requests the current text once and cancels its pending timer', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  controller.setSearchQuery('  toronjil ');
  const refresh = controller.refresh();
  await flush();
  assert.equal(calls.products[1].query.search, 'toronjil');
  context.mock.timers.tick(280);
  await flush();
  assert.equal(calls.products.length, 2);
  calls.products[1].resolve(page([product('toronjil')]));
  calls.categories[1].resolve(categories);
  await refresh;
  assert.equal(controller.getSnapshot().products[0].id, 'toronjil');
});

test('returning to an earlier filter cannot treat discarded products as a valid empty cache', async context => {
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  controller.selectCategory('linea-insomnio');
  await flush();
  controller.resetFilters();
  await flush();
  const refresh = controller.refresh();
  await flush();
  calls.products[3].reject(new Error('No se pudo recuperar la colección'));
  calls.categories[1].resolve(categories);
  await refresh;
  assert.equal(controller.getSnapshot().products.length, 0);
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().errorMessage, 'No se pudo recuperar la colección');
  calls.products[1].resolve(page([product('toronjil')]));
  calls.products[2].resolve(page([product('menta')]));
  await flush();
  assert.equal(controller.getSnapshot().status, 'error');
});

test('a failed product detail preserves its card data and retry loads fresh server detail', async context => {
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  const card = product('menta');
  const opening = controller.openProduct(card);
  assert.equal(controller.getSnapshot().selectedProduct.id, 'menta');
  assert.equal(controller.getSnapshot().detailLoading, true);
  await flush();
  assert.equal(calls.details[0].idOrSlug, 'menta');
  calls.details[0].reject(new Error('No se pudo actualizar este aroma'));
  await opening;
  assert.equal(controller.getSnapshot().selectedProduct.id, 'menta');
  assert.equal(controller.getSnapshot().detailError, 'No se pudo actualizar este aroma');
  assert.equal(controller.getSnapshot().detailLoading, false);
  const retry = controller.retryDetail();
  assert.equal(controller.getSnapshot().detailLoading, true);
  assert.equal(controller.getSnapshot().detailError, null);
  await flush();
  calls.details[1].resolve(product('menta', { longDescription: 'Detalle nuevo de la API', effectivePrice: 45 }));
  await retry;
  assert.equal(controller.getSnapshot().selectedProduct.longDescription, 'Detalle nuevo de la API');
  assert.equal(controller.getSnapshot().selectedProduct.effectivePrice, 45);
  assert.equal(controller.getSnapshot().detailLoading, false);
});

test('closing detail prevents a late response from reopening the sheet', async context => {
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  const opening = controller.openProduct(product('menta'));
  await flush();
  controller.closeProduct();
  calls.details[0].resolve(product('menta', { longDescription: 'Respuesta tardía' }));
  await opening;
  assert.equal(controller.getSnapshot().selectedProduct, null);
  assert.equal(controller.getSnapshot().detailLoading, false);
  assert.equal(controller.getSnapshot().detailError, null);
  await controller.retryDetail();
  assert.equal(calls.details.length, 1);
});

test('switching detail ignores a late success or failure for the previously selected product', async context => {
  const fixture = createFixture(context);
  const { controller, calls } = fixture;
  await ready(fixture);
  const first = controller.openProduct(product('menta'));
  await flush();
  const second = controller.openProduct(product('toronjil'));
  await flush();
  calls.details[1].resolve(product('toronjil', { longDescription: 'Detalle actual' }));
  await second;
  calls.details[0].reject(new Error('Fallo tardío de menta'));
  await first;
  assert.equal(controller.getSnapshot().selectedProduct.id, 'toronjil');
  assert.equal(controller.getSnapshot().selectedProduct.longDescription, 'Detalle actual');
  assert.equal(controller.getSnapshot().detailError, null);
  assert.equal(controller.getSnapshot().detailLoading, false);
});

test('stop and restart discard earlier products, categories, detail and debounce work', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller, calls } = createFixture(context);
  const firstStart = controller.start();
  await flush();
  const opening = controller.openProduct(product('menta'));
  await flush();
  controller.setSearchQuery('toronjil');
  controller.stop();
  const secondStart = controller.start();
  await flush();
  assert.equal(calls.products[1].query.search, 'toronjil');
  calls.products[0].resolve(page([product('anterior')]));
  calls.categories[0].resolve([{ id: 'vieja', name: 'Categoría anterior', count: 10 }]);
  calls.details[0].resolve(product('menta', { longDescription: 'Detalle anterior' }));
  await Promise.all([firstStart, opening]);
  assert.equal(controller.getSnapshot().products.length, 0);
  assert.notEqual(controller.getSnapshot().categories[1]?.id, 'vieja');
  assert.notEqual(controller.getSnapshot().selectedProduct?.longDescription, 'Detalle anterior');
  calls.products[1].resolve(page([product('toronjil')]));
  calls.categories[1].resolve(categories);
  await secondStart;
  context.mock.timers.tick(280);
  await flush();
  assert.equal(calls.products.length, 2);
  assert.equal(controller.getSnapshot().products[0].id, 'toronjil');
});

test('start is idempotent while active and subscriptions observe stable snapshots until state changes', async context => {
  const { controller, calls } = createFixture(context);
  assert.equal(controller.getSnapshot(), controller.getSnapshot());
  const notifications = [];
  const unsubscribe = controller.subscribe(() => notifications.push(controller.getSnapshot()));
  const first = controller.start();
  const second = controller.start();
  await flush();
  assert.equal(calls.products.length, 1);
  assert.equal(calls.categories.length, 1);
  calls.products[0].resolve(page([product('menta')]));
  calls.categories[0].resolve(categories);
  await Promise.all([first, second]);
  assert.ok(notifications.length > 0);
  const current = controller.getSnapshot();
  assert.equal(current, controller.getSnapshot());
  const count = notifications.length;
  unsubscribe();
  controller.closeProduct();
  assert.equal(notifications.length, count);
});
