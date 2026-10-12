/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');

// Exercise production MVVM state and errors; transport completion is controlled by each test.
function loadProduction() {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, {
      exports, Error, Promise,
      require(importPath) {
        if (importPath.startsWith('@/')) return load(path.join(projectRoot, 'src', `${importPath.slice(2)}.ts`));
        if (importPath.startsWith('.')) return load(`${path.resolve(path.dirname(filename), importPath)}.ts`);
        throw new Error(`Unexpected runtime import: ${importPath}`);
      },
    }, { filename });
    return exports;
  }
  return {
    ...load(path.join(projectRoot, 'src/features/favorites/presentation/viewModels/FavoritesController.ts')),
    ...load(path.join(projectRoot, 'src/core/network/ApiError.ts')),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function product(id) {
  return {
    id, slug: id, name: id, description: `Aroma ${id}`, price: 60, effectivePrice: 60,
    promoActive: false, currency: 'MXN', image: `/products/${id}.jpg`, imageUrl: null,
    category: 'verde', benefits: [], aromas: [], presentation: '10ml', origin: 'Natural',
    inStock: true, allowBackorder: false,
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));
const ids = snapshot => Array.from(snapshot.products, item => item.id);

function fixture(context) {
  const calls = { list: [], add: [], remove: [] };
  const repository = Object.fromEntries(Object.keys(calls).map(method => [method, (productIdOrOptions, options) => {
    const operation = {
      productId: method === 'list' ? undefined : productIdOrOptions,
      options: method === 'list' ? productIdOrOptions : options,
      ...deferred(),
    };
    calls[method].push(operation);
    return operation.promise;
  }]));
  const { FavoritesController, ApiError } = loadProduction();
  const controller = new FavoritesController(repository);
  context.after(() => controller.stop());
  return { controller, calls, ApiError };
}

async function ready(setup, products = []) {
  const loading = setup.controller.start();
  await flush();
  setup.calls.list.at(-1).resolve(products);
  await loading;
}

test('start shares stable snapshots, loads API favorites and blocks unknown-membership taps', async context => {
  const { controller, calls } = fixture(context);
  const first = controller.getSnapshot();
  assert.equal(first, controller.getSnapshot());
  let updates = 0;
  const unsubscribe = controller.subscribe(() => { updates += 1; });
  const loading = controller.start();
  assert.equal(controller.start(), loading);
  await controller.getSnapshot().toggle(product('menta'));
  await controller.getSnapshot().remove(product('menta'));
  await flush();
  assert.equal(controller.getSnapshot().status, 'loading');
  assert.equal(calls.list.length, 1);
  assert.equal(calls.add.length, 0);
  assert.equal(calls.remove.length, 0);
  calls.list[0].resolve([product('menta')]);
  await loading;
  const loaded = controller.getSnapshot();
  assert.equal(loaded.status, 'ready');
  assert.deepEqual(ids(loaded), ['menta']);
  assert.equal(loaded.errorMessage, null);
  assert.equal(loaded.toggle, first.toggle);
  assert.ok(updates > 0);
  unsubscribe();
  const previousUpdates = updates;
  controller.getSnapshot().clearFeedback();
  assert.equal(updates, previousUpdates);
});

test('an empty server collection exposes an honest empty state', async context => {
  const setup = fixture(context);
  await ready(setup);
  assert.equal(setup.controller.getSnapshot().status, 'empty');
  assert.deepEqual(ids(setup.controller.getSnapshot()), []);
  assert.equal(setup.controller.getSnapshot().errorMessage, null);
});

test('initial failure keeps toggles disabled and retry recovers', async context => {
  const { controller, calls } = fixture(context);
  const loading = controller.start();
  await flush();
  calls.list[0].reject(new Error('Sin conexión'));
  await loading;
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().errorMessage, 'No pudimos cargar tus favoritos. Intenta de nuevo.');
  await controller.getSnapshot().toggle(product('menta'));
  assert.equal(calls.add.length, 0);
  const retry = controller.getSnapshot().retry();
  assert.equal(controller.getSnapshot().status, 'loading');
  await flush();
  calls.list[1].resolve([product('menta')]);
  await retry;
  assert.equal(controller.getSnapshot().status, 'ready');
  assert.equal(controller.getSnapshot().errorMessage, null);
});

test('refresh failures preserve both populated and empty last-known collections', async context => {
  for (const products of [[product('menta')], []]) {
    const setup = fixture(context);
    await ready(setup, products);
    const refresh = setup.controller.getSnapshot().refresh();
    assert.equal(setup.controller.getSnapshot().refreshing, true);
    await flush();
    setup.calls.list[1].reject(new Error('Conexión interrumpida'));
    await refresh;
    const state = setup.controller.getSnapshot();
    assert.deepEqual(ids(state), products.map(item => item.id));
    assert.equal(state.status, products.length ? 'ready' : 'empty');
    assert.equal(state.refreshing, false);
    assert.equal(state.errorMessage, 'No pudimos cargar tus favoritos. Intenta de nuevo.');
  }
});

test('add waits for confirmation, guards repeated taps and appends in server order exactly once', async context => {
  const setup = fixture(context);
  await ready(setup, [product('eucalipto')]);
  const { controller, calls } = setup;
  const adding = controller.getSnapshot().toggle(product('menta'));
  await controller.getSnapshot().toggle(product('menta'));
  assert.deepEqual(Array.from(controller.getSnapshot().pendingIds), ['menta']);
  assert.deepEqual(ids(controller.getSnapshot()), ['eucalipto']);
  assert.equal(controller.getSnapshot().feedback, null);
  await flush();
  assert.equal(calls.add.length, 1);
  assert.equal(calls.add[0].productId, 'menta');
  calls.add[0].resolve();
  await adding;
  assert.deepEqual(ids(controller.getSnapshot()), ['eucalipto', 'menta']);
  assert.equal(controller.getSnapshot().feedback.message, 'Guardado en favoritos');
  assert.equal(controller.getSnapshot().pendingIds.length, 0);
  controller.getSnapshot().clearFeedback();
  assert.equal(controller.getSnapshot().feedback, null);
});

test('a failed removal preserves its saved heart and can be retried to an empty list', async context => {
  const setup = fixture(context);
  await ready(setup, [product('menta')]);
  const { controller, calls } = setup;
  const failed = controller.getSnapshot().remove(product('menta'));
  await flush();
  calls.remove[0].reject(new Error('TypeError: privateBackendImplementation.delete is not a function'));
  await failed;
  assert.deepEqual(ids(controller.getSnapshot()), ['menta']);
  assert.equal(controller.getSnapshot().actionError.productId, 'menta');
  assert.equal(controller.getSnapshot().actionError.message, 'No pudimos quitar este aroma. Intenta de nuevo.');
  assert.equal(controller.getSnapshot().feedback, null);
  assert.equal(controller.getSnapshot().pendingIds.length, 0);
  const retry = controller.getSnapshot().toggle(product('menta'));
  assert.equal(controller.getSnapshot().actionError, null);
  await flush();
  assert.equal(calls.remove.length, 2);
  calls.remove[1].resolve();
  await retry;
  assert.deepEqual(ids(controller.getSnapshot()), []);
  assert.equal(controller.getSnapshot().status, 'empty');
  assert.equal(controller.getSnapshot().feedback.message, 'Eliminado de favoritos');
});

test('a rejected add never creates a favorite and gives a concise session-expired error', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls, ApiError } = setup;
  const adding = controller.getSnapshot().toggle(product('menta'));
  await flush();
  calls.add[0].reject(new ApiError('Unauthorized', 401));
  await adding;
  assert.deepEqual(ids(controller.getSnapshot()), []);
  assert.equal(controller.getSnapshot().status, 'empty');
  assert.equal(controller.getSnapshot().feedback, null);
  assert.equal(controller.getSnapshot().actionError.message, 'Tu sesión venció. Inicia sesión de nuevo.');
  controller.getSnapshot().clearActionError();
  assert.equal(controller.getSnapshot().actionError, null);
});

test('an initial 401 is shown as session expiry instead of a server payload', async context => {
  const { controller, calls, ApiError } = fixture(context);
  const loading = controller.start();
  await flush();
  calls.list[0].reject(new ApiError('Unauthorized', 401));
  await loading;
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().errorMessage, 'Tu sesión venció. Inicia sesión de nuevo.');
});

test('backend and JavaScript failures use controlled copy instead of exposing technical details', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls, ApiError } = setup;
  const refresh = controller.getSnapshot().refresh();
  await flush();
  calls.list[1].reject(new ApiError('MongoServerError: secret database endpoint', 500));
  await refresh;
  assert.equal(controller.getSnapshot().errorMessage, 'No pudimos cargar tus favoritos. Intenta de nuevo.');
  const adding = controller.getSnapshot().toggle(product('menta'));
  await flush();
  calls.add[0].reject(new Error('Cannot read properties of undefined (reading token)'));
  await adding;
  assert.equal(controller.getSnapshot().actionError.message, 'No pudimos guardar este aroma. Intenta de nuevo.');
  assert.deepEqual(ids(controller.getSnapshot()), []);
});

test('repository operation guards expire across stop and restart for all request types', async context => {
  const { controller, calls } = fixture(context);
  const initial = controller.start();
  await flush();
  const initialGuard = calls.list[0].options.isCurrent;
  assert.equal(initialGuard(), true);
  calls.list[0].resolve([]);
  await initial;
  const adding = controller.getSnapshot().toggle(product('menta'));
  await flush();
  const addGuard = calls.add[0].options.isCurrent;
  assert.equal(addGuard(), true);
  controller.stop();
  const restarted = controller.start();
  assert.equal(initialGuard(), false);
  assert.equal(addGuard(), false);
  calls.add[0].resolve();
  await adding;
  await flush();
  assert.equal(calls.list[1].options.isCurrent(), true);
  calls.list[1].resolve([product('menta')]);
  await restarted;
  const removing = controller.getSnapshot().remove(product('menta'));
  await flush();
  const removeGuard = calls.remove[0].options.isCurrent;
  assert.equal(removeGuard(), true);
  controller.stop();
  assert.equal(removeGuard(), false);
  calls.remove[0].resolve();
  await removing;
});

test('a slow refresh finishes before the reserved write, so it cannot revert a confirmed add', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls } = setup;
  const refresh = controller.getSnapshot().refresh();
  await flush();
  const adding = controller.getSnapshot().toggle(product('menta'));
  await flush();
  assert.equal(calls.list.length, 2);
  assert.equal(calls.add.length, 0);
  assert.deepEqual(Array.from(controller.getSnapshot().pendingIds), ['menta']);
  calls.list[1].resolve([]);
  await refresh;
  await flush();
  assert.equal(calls.add.length, 1);
  calls.add[0].resolve();
  await adding;
  assert.deepEqual(ids(controller.getSnapshot()), ['menta']);
  assert.equal(controller.getSnapshot().refreshing, false);
});

test('refresh during a write is deferred until the server has confirmed the mutation', async context => {
  const setup = fixture(context);
  await ready(setup, [product('menta')]);
  const { controller, calls } = setup;
  const removing = controller.getSnapshot().remove(product('menta'));
  await flush();
  const refresh = controller.getSnapshot().refresh();
  await flush();
  assert.equal(calls.list.length, 1);
  assert.equal(controller.getSnapshot().refreshing, true);
  calls.remove[0].resolve();
  await removing;
  await flush();
  assert.deepEqual(ids(controller.getSnapshot()), []);
  assert.equal(calls.list.length, 2);
  calls.list[1].resolve([]);
  await refresh;
  assert.equal(controller.getSnapshot().status, 'empty');
  assert.equal(controller.getSnapshot().refreshing, false);
});

test('a refresh discovering an already-saved queued addition preserves server order without duplicates', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls } = setup;
  const refresh = controller.getSnapshot().refresh();
  await flush();
  const adding = controller.getSnapshot().toggle(product('menta'));
  calls.list[1].resolve([product('menta'), product('eucalipto')]);
  await refresh;
  await flush();
  calls.add[0].resolve();
  await adding;
  assert.deepEqual(ids(controller.getSnapshot()), ['menta', 'eucalipto']);
  assert.equal(controller.getSnapshot().pendingIds.length, 0);
});

test('different product writes are serialized and duplicate queued taps are ignored', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls } = setup;
  const first = controller.getSnapshot().toggle(product('menta'));
  const second = controller.getSnapshot().toggle(product('eucalipto'));
  await controller.getSnapshot().toggle(product('eucalipto'));
  await flush();
  assert.equal(calls.add.length, 1);
  assert.equal(controller.getSnapshot().pendingIds.length, 2);
  calls.add[0].resolve();
  await first;
  await flush();
  assert.equal(calls.add.length, 2);
  calls.add[1].resolve();
  await second;
  assert.deepEqual(ids(controller.getSnapshot()), ['menta', 'eucalipto']);
  assert.equal(controller.getSnapshot().pendingIds.length, 0);
});

test('latest queued refresh owns the indicator and older results cannot overwrite it', async context => {
  const setup = fixture(context);
  await ready(setup, [product('menta')]);
  const { controller, calls } = setup;
  const first = controller.getSnapshot().refresh();
  await flush();
  const second = controller.getSnapshot().refresh();
  calls.list[1].resolve([product('respuesta-antigua')]);
  await first;
  await flush();
  assert.deepEqual(ids(controller.getSnapshot()), ['menta']);
  assert.equal(controller.getSnapshot().refreshing, true);
  calls.list[2].resolve([product('eucalipto')]);
  await second;
  assert.deepEqual(ids(controller.getSnapshot()), ['eucalipto']);
  assert.equal(controller.getSnapshot().refreshing, false);
});

test('stop ignores late reads and a restart must revalidate before changing membership', async context => {
  const { controller, calls } = fixture(context);
  const oldStart = controller.start();
  await flush();
  controller.stop();
  const newStart = controller.start();
  await controller.getSnapshot().toggle(product('menta'));
  calls.list[0].resolve([product('obsoleto')]);
  await oldStart;
  await flush();
  assert.deepEqual(ids(controller.getSnapshot()), []);
  assert.equal(controller.getSnapshot().status, 'loading');
  assert.equal(calls.add.length, 0);
  calls.list[1].resolve([product('actual')]);
  await newStart;
  assert.deepEqual(ids(controller.getSnapshot()), ['actual']);
});

test('restart waits for a previously sent write and skips unsent old-session writes', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls } = setup;
  const oldWrite = controller.getSnapshot().toggle(product('menta'));
  const unsentWrite = controller.getSnapshot().toggle(product('eucalipto'));
  await flush();
  controller.stop();
  const restarted = controller.start();
  await flush();
  assert.equal(calls.list.length, 1);
  assert.equal(controller.getSnapshot().pendingIds.length, 0);
  calls.add[0].resolve();
  await Promise.all([oldWrite, unsentWrite]);
  await flush();
  assert.equal(calls.add.length, 1);
  assert.deepEqual(ids(controller.getSnapshot()), []);
  assert.equal(controller.getSnapshot().feedback, null);
  assert.equal(calls.list.length, 2);
  calls.list[1].resolve([product('menta')]);
  await restarted;
  assert.deepEqual(ids(controller.getSnapshot()), ['menta']);
});

test('late failures after stop produce no errors, feedback or listener updates', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls } = setup;
  const operation = controller.getSnapshot().toggle(product('menta'));
  await flush();
  controller.stop();
  const stopped = controller.getSnapshot();
  let notifications = 0;
  const unsubscribe = controller.subscribe(() => { notifications += 1; });
  calls.add[0].reject(new Error('Respuesta de la sesión anterior'));
  await operation;
  assert.equal(controller.getSnapshot(), stopped);
  assert.equal(notifications, 0);
  await controller.getSnapshot().refresh();
  await controller.getSnapshot().toggle(product('eucalipto'));
  assert.equal(calls.list.length, 1);
  assert.equal(calls.add.length, 1);
  unsubscribe();
});

test('same-session remount retains cards but blocks writes until a failed revalidation is retried', async context => {
  const setup = fixture(context);
  await ready(setup, [product('menta')]);
  const { controller, calls } = setup;
  controller.stop();
  const restarted = controller.start();
  assert.deepEqual(ids(controller.getSnapshot()), ['menta']);
  assert.equal(controller.getSnapshot().status, 'loading');
  await flush();
  calls.list[1].reject(new Error('No hay conexión'));
  await restarted;
  assert.deepEqual(ids(controller.getSnapshot()), ['menta']);
  assert.equal(controller.getSnapshot().status, 'error');
  await controller.getSnapshot().toggle(product('menta'));
  assert.equal(calls.remove.length, 0);
  const retry = controller.getSnapshot().retry();
  await flush();
  calls.list[2].resolve([]);
  await retry;
  assert.equal(controller.getSnapshot().status, 'empty');
  assert.equal(controller.getSnapshot().errorMessage, null);
});

test('a new account controller remains independent of the stopped account response', async context => {
  const oldAccount = fixture(context);
  await ready(oldAccount);
  const oldWrite = oldAccount.controller.getSnapshot().toggle(product('privado'));
  await flush();
  oldAccount.controller.stop();
  const newAccount = fixture(context);
  await ready(newAccount, [product('otro-usuario')]);
  oldAccount.calls.add[0].resolve();
  await oldWrite;
  assert.deepEqual(ids(newAccount.controller.getSnapshot()), ['otro-usuario']);
  assert.equal(newAccount.controller.getSnapshot().feedback, null);
});

test('remove of an absent product sends no unnecessary DELETE', async context => {
  const setup = fixture(context);
  await ready(setup, [product('menta')]);
  await setup.controller.getSnapshot().remove(product('eucalipto'));
  assert.equal(setup.calls.remove.length, 0);
  assert.deepEqual(ids(setup.controller.getSnapshot()), ['menta']);
});
