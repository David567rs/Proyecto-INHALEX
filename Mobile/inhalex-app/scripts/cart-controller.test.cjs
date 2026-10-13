/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');

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
    ...load(path.join(projectRoot, 'src/features/cart/presentation/viewModels/CartController.ts')),
    ...load(path.join(projectRoot, 'src/core/network/ApiError.ts')),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function product(id, overrides = {}) {
  return {
    id, slug: id, name: id, description: `Aroma ${id}`, price: 60, effectivePrice: 60,
    promoActive: false, currency: 'MXN', image: `/products/${id}.jpg`, imageUrl: null,
    category: 'verde', benefits: [], aromas: [], presentation: '10ml', origin: 'Natural',
    inStock: true, stockAvailable: 25, allowBackorder: false, ...overrides,
  };
}

function cart(...items) {
  const entries = items.map(([itemProduct, quantity, unitPrice = 60]) => ({
    productId: itemProduct.id, product: itemProduct, quantity, unitPrice, subtotal: unitPrice * quantity,
  }));
  return {
    items: entries, totalItems: entries.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: entries.reduce((sum, item) => sum + item.subtotal, 0), currency: 'MXN',
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));
const pending = controller => Array.from(controller.getSnapshot().pendingIds);

function fixture(context) {
  const calls = { list: [], add: [], updateQuantity: [], remove: [], clear: [] };
  const order = [];
  const repository = Object.fromEntries(Object.keys(calls).map(method => [method, (...args) => {
    const operation = {
      productId: method === 'list' ? undefined : args[0],
      quantity: ['add', 'updateQuantity'].includes(method) ? args[1] : undefined,
      options: args.at(-1), ...deferred(),
    };
    calls[method].push(operation);
    order.push(method);
    return operation.promise;
  }]));
  const { CartController, ApiError } = loadProduction();
  const controller = new CartController(repository);
  context.after(() => controller.stop());
  return { controller, calls, order, ApiError };
}

async function ready(setup, value = cart()) {
  const loading = setup.controller.start();
  await flush();
  setup.calls.list.at(-1).resolve(value);
  await loading;
}

test('initial loading locks writes and publishes stable external-store snapshots and actions', async context => {
  const { controller, calls } = fixture(context);
  const initial = controller.getSnapshot();
  assert.equal(initial, controller.getSnapshot());
  let updates = 0;
  const unsubscribe = controller.subscribe(() => { updates += 1; });
  const loading = controller.start();
  assert.equal(controller.start(), loading);
  await controller.getSnapshot().add(product('menta'));
  await controller.getSnapshot().setQuantity('menta', 2);
  await flush();
  assert.equal(calls.add.length, 0);
  assert.equal(calls.updateQuantity.length, 0);
  assert.equal(controller.getSnapshot().status, 'loading');
  assert.equal(controller.getSnapshot().canMutate, false);
  const value = cart([product('menta'), 2]);
  calls.list[0].resolve(value);
  await loading;
  assert.equal(controller.getSnapshot().cart, value);
  assert.equal(controller.getSnapshot().status, 'ready');
  assert.equal(controller.getSnapshot().canMutate, true);
  assert.equal(controller.getSnapshot().add, initial.add);
  assert.equal(controller.getSnapshot().refresh, initial.refresh);
  assert.ok(updates > 0);
  unsubscribe();
  const previousUpdates = updates;
  controller.getSnapshot().clearFeedback();
  assert.equal(updates, previousUpdates);
});

test('an empty API response is an explicit ready-to-use empty cart', async context => {
  const setup = fixture(context);
  await ready(setup);
  const state = setup.controller.getSnapshot();
  assert.equal(state.status, 'empty');
  assert.equal(state.canMutate, true);
  assert.equal(state.cart.subtotal, 0);
  assert.equal(state.cart.totalItems, 0);
});

test('initial list failure never masquerades as empty and retry unlocks only after success', async context => {
  const { controller, calls } = fixture(context);
  const loading = controller.start();
  await flush();
  calls.list[0].reject(new Error('Private database information'));
  await loading;
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().canMutate, false);
  assert.equal(controller.getSnapshot().errorMessage, 'No pudimos actualizar tu bolsa. Intenta de nuevo.');
  const retry = controller.getSnapshot().retry();
  await flush();
  assert.equal(controller.getSnapshot().status, 'loading');
  assert.equal(controller.getSnapshot().canMutate, false);
  calls.list[1].resolve(cart());
  await retry;
  assert.equal(controller.getSnapshot().canMutate, true);
  assert.equal(controller.getSnapshot().errorMessage, null);
});

test('refresh failures preserve products, authoritative totals and known empty states', async context => {
  for (const value of [cart([product('menta'), 2, 45]), cart()]) {
    const setup = fixture(context);
    await ready(setup, value);
    const refreshing = setup.controller.getSnapshot().refresh();
    assert.equal(setup.controller.getSnapshot().refreshing, true);
    await flush();
    setup.calls.list[1].reject(new Error('Offline'));
    await refreshing;
    assert.equal(setup.controller.getSnapshot().cart, value);
    assert.equal(setup.controller.getSnapshot().status, value.items.length ? 'ready' : 'empty');
    assert.equal(setup.controller.getSnapshot().refreshing, false);
    assert.equal(setup.controller.getSnapshot().canMutate, true);
  }
});

test('adding waits for server confirmation and uses server totals and prices without local arithmetic', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls } = setup;
  const adding = controller.getSnapshot().add(product('menta'), 2);
  await controller.getSnapshot().add(product('menta'), 2);
  assert.deepEqual(pending(controller), ['menta']);
  assert.equal(controller.getSnapshot().cart.totalItems, 0);
  assert.equal(controller.getSnapshot().feedback, null);
  await flush();
  assert.equal(calls.add.length, 1);
  assert.equal(calls.add[0].quantity, 2);
  const confirmed = cart([product('menta'), 2, 49.5], [product('external'), 1, 20]);
  calls.add[0].resolve(confirmed);
  await adding;
  assert.equal(controller.getSnapshot().cart, confirmed);
  assert.equal(controller.getSnapshot().cart.subtotal, 119);
  assert.equal(controller.getSnapshot().feedback.message, 'Agregado a tu bolsa');
  assert.deepEqual(pending(controller), []);
  controller.getSnapshot().clearFeedback();
  assert.equal(controller.getSnapshot().feedback, null);
});

test('setting an absolute quantity replaces the snapshot and removal can empty the bag', async context => {
  const setup = fixture(context);
  await ready(setup, cart([product('menta'), 2]));
  const { controller, calls } = setup;
  const updating = controller.getSnapshot().setQuantity('menta', 3);
  await flush();
  assert.equal(calls.updateQuantity[0].productId, 'menta');
  assert.equal(calls.updateQuantity[0].quantity, 3);
  assert.equal(controller.getSnapshot().cart.totalItems, 2);
  calls.updateQuantity[0].resolve(cart([product('menta'), 3, 55]));
  await updating;
  assert.equal(controller.getSnapshot().cart.totalItems, 3);
  assert.equal(controller.getSnapshot().cart.subtotal, 165);
  assert.equal(controller.getSnapshot().feedback.message, 'Cantidad actualizada');
  const removing = controller.getSnapshot().remove('menta');
  await flush();
  calls.remove[0].resolve(cart());
  await removing;
  assert.equal(controller.getSnapshot().status, 'empty');
  assert.equal(controller.getSnapshot().cart.subtotal, 0);
  assert.equal(controller.getSnapshot().feedback.message, 'Eliminado de tu bolsa');
});

test('invalid quantities never reach the API or lock a healthy cart', async context => {
  const setup = fixture(context);
  await ready(setup, cart([product('menta'), 2]));
  const { controller, calls } = setup;
  for (const quantity of [0, -1, 1.5, 26, NaN, Infinity, '2']) {
    await controller.getSnapshot().add(product('menta'), quantity);
    assert.equal(controller.getSnapshot().actionError.message, 'Elige una cantidad entera entre 1 y 25.');
    await controller.getSnapshot().setQuantity('menta', quantity);
    assert.equal(controller.getSnapshot().canMutate, true);
  }
  assert.equal(calls.add.length, 0);
  assert.equal(calls.updateQuantity.length, 0);
  assert.equal(controller.getSnapshot().cart.totalItems, 2);
  assert.deepEqual(pending(controller), []);
});

test('limits validate cumulative additions, current inventory and the 25-unit cap', async context => {
  const setup = fixture(context);
  await ready(setup, cart([product('menta', { stockAvailable: 3 }), 2]));
  const { controller, calls } = setup;
  await controller.getSnapshot().add(product('menta', { stockAvailable: 25 }), 2);
  assert.match(controller.getSnapshot().actionError.message, /Solo hay 3 unidades/);
  await controller.getSnapshot().setQuantity('menta', 4);
  assert.equal(calls.updateQuantity.length, 0);
  const refreshing = controller.getSnapshot().refresh();
  await flush();
  calls.list[1].resolve(cart([product('menta'), 25]));
  await refreshing;
  await controller.getSnapshot().add(product('menta'));
  assert.equal(calls.add.length, 0);
  assert.match(controller.getSnapshot().actionError.message, /hasta 25 unidades/);
});

test('fresh product details can block additions allowed by stale saved inventory', async context => {
  const setup = fixture(context);
  const before = cart([product('menta', { stockAvailable: 5 }), 2]);
  await ready(setup, before);
  const { controller, calls } = setup;
  await controller.getSnapshot().add(product('menta', { inStock: false, stockAvailable: 0 }));
  assert.equal(controller.getSnapshot().actionError.message, 'Este aroma no está disponible por ahora.');
  assert.equal(calls.add.length, 0);
  await controller.getSnapshot().add(product('menta', { stockAvailable: 2 }));
  assert.equal(controller.getSnapshot().actionError.message, 'Solo hay 2 unidades disponibles de este aroma.');
  assert.equal(calls.add.length, 0);
  assert.equal(controller.getSnapshot().cart, before);
  assert.equal(controller.getSnapshot().canMutate, true);
  assert.deepEqual(pending(controller), []);
});

test('unavailable inventory blocks additions while backorder allows a valid addition', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls } = setup;
  await controller.getSnapshot().add(product('menta', { inStock: false, stockAvailable: 0 }));
  assert.equal(calls.add.length, 0);
  assert.equal(controller.getSnapshot().actionError.message, 'Este aroma no está disponible por ahora.');
  const backorder = product('menta', { inStock: false, stockAvailable: 0, allowBackorder: true });
  const adding = controller.getSnapshot().add(backorder, 25);
  await flush();
  assert.equal(calls.add[0].quantity, 25);
  calls.add[0].resolve(cart([backorder, 25]));
  await adding;
  assert.equal(controller.getSnapshot().cart.totalItems, 25);
});

test('users can reduce an unavailable or overstock saved quantity and still remove it', async context => {
  const setup = fixture(context);
  const unavailable = product('menta', { inStock: false, stockAvailable: 0 });
  await ready(setup, cart([unavailable, 5]));
  const { controller, calls } = setup;
  await controller.getSnapshot().setQuantity('menta', 6);
  assert.equal(calls.updateQuantity.length, 0);
  const reducing = controller.getSnapshot().setQuantity('menta', 4);
  await flush();
  calls.updateQuantity[0].resolve(cart([unavailable, 4]));
  await reducing;
  const removing = controller.getSnapshot().remove('menta');
  await flush();
  calls.remove[0].resolve(cart());
  await removing;
  assert.equal(controller.getSnapshot().status, 'empty');
});

test('same quantity and absent-item mutations do not send unnecessary requests', async context => {
  const setup = fixture(context);
  await ready(setup, cart([product('menta'), 2]));
  const { controller, calls } = setup;
  await controller.getSnapshot().setQuantity('menta', 2);
  await controller.getSnapshot().setQuantity('missing', 2);
  await controller.getSnapshot().remove('missing');
  assert.equal(calls.updateQuantity.length, 0);
  assert.equal(calls.remove.length, 0);
  assert.deepEqual(pending(controller), []);
});

test('different-product writes serialize and duplicated queued taps reserve only one change', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls } = setup;
  const first = controller.getSnapshot().add(product('menta'));
  const second = controller.getSnapshot().add(product('eucalipto'));
  await controller.getSnapshot().add(product('eucalipto'));
  await flush();
  assert.equal(calls.add.length, 1);
  assert.deepEqual(pending(controller), ['menta', 'eucalipto']);
  calls.add[0].resolve(cart([product('menta'), 1]));
  await first;
  await flush();
  assert.equal(calls.add.length, 2);
  calls.add[1].resolve(cart([product('menta'), 1], [product('eucalipto'), 1]));
  await second;
  assert.equal(controller.getSnapshot().cart.totalItems, 2);
  assert.deepEqual(pending(controller), []);
});

test('a pending refresh provides updated inventory before sending a queued addition', async context => {
  const setup = fixture(context);
  await ready(setup, cart([product('menta', { stockAvailable: 25 }), 1]));
  const { controller, calls } = setup;
  const refresh = controller.getSnapshot().refresh();
  await flush();
  const add = controller.getSnapshot().add(product('menta'), 2);
  const latestRefresh = controller.getSnapshot().refresh();
  calls.list[1].resolve(cart([product('menta', { stockAvailable: 1 }), 1]));
  await refresh;
  await add;
  await flush();
  assert.equal(calls.add.length, 0);
  assert.match(controller.getSnapshot().actionError.message, /Solo hay 1 unidad/);
  calls.list[2].resolve(cart([product('menta', { stockAvailable: 1 }), 1]));
  await latestRefresh;
  assert.equal(controller.getSnapshot().refreshing, false);
});

test('a full response from the preceding write revalidates a queued quantity increase', async context => {
  const setup = fixture(context);
  await ready(setup, cart([product('menta'), 1]));
  const { controller, calls } = setup;
  const add = controller.getSnapshot().add(product('eucalipto'));
  const increase = controller.getSnapshot().setQuantity('menta', 2);
  await flush();
  calls.add[0].resolve(cart([product('menta', { stockAvailable: 1 }), 1], [product('eucalipto'), 1]));
  await Promise.all([add, increase]);
  assert.equal(calls.updateQuantity.length, 0);
  assert.match(controller.getSnapshot().actionError.message, /Solo hay 1 unidad/);
});

test('refresh requested during a write runs afterward and cannot overwrite its result out of order', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls, order } = setup;
  const add = controller.getSnapshot().add(product('menta'));
  await flush();
  const refresh = controller.getSnapshot().refresh();
  await flush();
  assert.equal(calls.list.length, 1);
  calls.add[0].resolve(cart([product('menta'), 1]));
  await add;
  await flush();
  assert.deepEqual(order, ['list', 'add', 'list']);
  calls.list[1].resolve(cart([product('menta'), 1, 55]));
  await refresh;
  assert.equal(controller.getSnapshot().cart.subtotal, 55);
});

test('an ambiguous add failure preserves the cart and locks all writes until GET reconciliation', async context => {
  const setup = fixture(context);
  const before = cart([product('menta'), 1]);
  await ready(setup, before);
  const { controller, calls } = setup;
  const add = controller.getSnapshot().add(product('menta'));
  const queued = controller.getSnapshot().add(product('eucalipto'));
  await flush();
  calls.add[0].reject(new Error('timeout after server accepted increment'));
  await Promise.all([add, queued]);
  assert.equal(controller.getSnapshot().cart, before);
  assert.equal(controller.getSnapshot().canMutate, false);
  assert.equal(controller.getSnapshot().feedback, null);
  assert.equal(controller.getSnapshot().actionError.message, 'No pudimos confirmar el cambio. Actualiza la bolsa antes de intentar de nuevo.');
  assert.equal(calls.add.length, 1);
  assert.deepEqual(pending(controller), []);
  await controller.getSnapshot().add(product('menta'));
  await controller.getSnapshot().remove('menta');
  await controller.getSnapshot().setQuantity('menta', 2);
  assert.equal(calls.add.length, 1);
  assert.equal(calls.remove.length, 0);
  assert.equal(calls.updateQuantity.length, 0);
  const retry = controller.getSnapshot().retry();
  await flush();
  calls.list[1].resolve(cart([product('menta'), 2]));
  await retry;
  assert.equal(controller.getSnapshot().cart.totalItems, 2);
  assert.equal(controller.getSnapshot().canMutate, true);
  assert.equal(controller.getSnapshot().actionError, null);
  assert.equal(calls.add.length, 1);
});

test('failed reconciliation remains locked even after dismissing an action error', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls } = setup;
  const add = controller.getSnapshot().add(product('menta'));
  await flush();
  calls.add[0].reject(new Error('offline'));
  await add;
  controller.getSnapshot().clearActionError();
  assert.equal(controller.getSnapshot().actionError, null);
  assert.equal(controller.getSnapshot().canMutate, false);
  const retry = controller.getSnapshot().retry();
  await flush();
  calls.list[1].reject(new Error('still offline'));
  await retry;
  assert.equal(controller.getSnapshot().canMutate, false);
  await controller.getSnapshot().add(product('menta'));
  assert.equal(calls.add.length, 1);
});

test('quantity and remove failures also preserve last-confirmed totals and require reconciliation', async context => {
  for (const method of ['setQuantity', 'remove']) {
    const setup = fixture(context);
    const before = cart([product('menta'), 3, 47.5]);
    await ready(setup, before);
    const { controller, calls } = setup;
    const changing = controller.getSnapshot()[method]('menta', 2);
    await flush();
    calls[method === 'setQuantity' ? 'updateQuantity' : 'remove'][0].reject(new Error('invalid response'));
    await changing;
    assert.equal(controller.getSnapshot().cart, before);
    assert.equal(controller.getSnapshot().canMutate, false);
    assert.equal(controller.getSnapshot().feedback, null);
  }
});

test('401 responses have controlled session copy and disable further writes', async context => {
  const setup = fixture(context);
  await ready(setup, cart([product('menta'), 1]));
  const { controller, calls, ApiError } = setup;
  const refresh = controller.getSnapshot().refresh();
  await flush();
  calls.list[1].reject(new ApiError('Private auth metadata', 401));
  await refresh;
  assert.equal(controller.getSnapshot().errorMessage, 'Tu sesión venció. Inicia sesión de nuevo.');
  assert.equal(controller.getSnapshot().canMutate, false);
  const retry = controller.getSnapshot().retry();
  await flush();
  calls.list[2].resolve(cart([product('menta'), 1]));
  await retry;
  const removing = controller.getSnapshot().remove('menta');
  await flush();
  calls.remove[0].reject(new ApiError('Private auth metadata', 401));
  await removing;
  assert.equal(controller.getSnapshot().actionError.message, 'Tu sesión venció. Inicia sesión de nuevo.');
  assert.equal(controller.getSnapshot().canMutate, false);
});

test('stop invalidates operation guards and ignores late successes and errors', async context => {
  for (const fail of [false, true]) {
    const setup = fixture(context);
    await ready(setup);
    const { controller, calls } = setup;
    const add = controller.getSnapshot().add(product('menta'));
    await flush();
    const guard = calls.add[0].options.isCurrent;
    assert.equal(guard(), true);
    controller.stop();
    assert.equal(guard(), false);
    assert.equal(calls.list[0].options.isCurrent(), false);
    const stopped = controller.getSnapshot();
    let changes = 0;
    const unsubscribe = controller.subscribe(() => { changes += 1; });
    if (fail) calls.add[0].reject(new Error('late error'));
    else calls.add[0].resolve(cart([product('menta'), 1]));
    await add;
    assert.equal(controller.getSnapshot(), stopped);
    assert.equal(changes, 0);
    await controller.getSnapshot().refresh();
    await controller.getSnapshot().add(product('eucalipto'));
    assert.equal(calls.list.length, 1);
    assert.equal(calls.add.length, 1);
    unsubscribe();
  }
});

test('restart waits for an already-sent write and skips old unsent writes before reconciliation', async context => {
  const setup = fixture(context);
  await ready(setup);
  const { controller, calls } = setup;
  const first = controller.getSnapshot().add(product('menta'));
  const queued = controller.getSnapshot().add(product('eucalipto'));
  await flush();
  controller.stop();
  const restarted = controller.start();
  await flush();
  assert.equal(controller.getSnapshot().canMutate, false);
  assert.deepEqual(pending(controller), []);
  assert.equal(calls.list.length, 1);
  calls.add[0].resolve(cart([product('menta'), 1]));
  await Promise.all([first, queued]);
  await flush();
  assert.equal(calls.add.length, 1);
  assert.equal(calls.list.length, 2);
  assert.equal(controller.getSnapshot().feedback, null);
  assert.equal(controller.getSnapshot().cart.totalItems, 0);
  calls.list[1].resolve(cart([product('menta'), 1]));
  await restarted;
  assert.equal(controller.getSnapshot().canMutate, true);
  assert.equal(controller.getSnapshot().cart.totalItems, 1);
});

test('failed remount validation retains items but blocks operations until a successful read', async context => {
  const setup = fixture(context);
  const before = cart([product('menta'), 2]);
  await ready(setup, before);
  const { controller, calls } = setup;
  controller.stop();
  const restarted = controller.start();
  await flush();
  calls.list[1].reject(new Error('offline'));
  await restarted;
  assert.equal(controller.getSnapshot().cart, before);
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().canMutate, false);
  await controller.getSnapshot().remove('menta');
  assert.equal(calls.remove.length, 0);
});

test('a separate account controller never receives the stopped account cart', async context => {
  const oldAccount = fixture(context);
  await ready(oldAccount);
  const adding = oldAccount.controller.getSnapshot().add(product('private'));
  await flush();
  oldAccount.controller.stop();
  const newAccount = fixture(context);
  const current = cart([product('new-user-product'), 1]);
  await ready(newAccount, current);
  oldAccount.calls.add[0].resolve(cart([product('private'), 1]));
  await adding;
  assert.equal(newAccount.controller.getSnapshot().cart, current);
  assert.equal(newAccount.controller.getSnapshot().feedback, null);
});

test('checkout locks immediately, revalidates remote quantities and blocks duplicate checkout and writes', async context => {
  const setup = fixture(context);
  const before = cart([product('menta'), 2]);
  await ready(setup, before);
  const { controller, calls } = setup;
  const expected = [{ productId: 'menta', quantity: 2 }];
  const checkout = controller.beginCheckout(expected);
  assert.equal(controller.getSnapshot().checkoutLocked, true);
  assert.equal(controller.getSnapshot().canMutate, false);
  assert.equal(await controller.beginCheckout(expected), null);
  await controller.add(product('menta'));
  await controller.setQuantity('menta', 3);
  await controller.remove('menta');
  await flush();
  assert.equal(calls.add.length + calls.updateQuantity.length + calls.remove.length, 0);
  const fresh = cart([product('menta'), 2, 45]);
  calls.list[1].resolve(fresh);
  assert.equal(await checkout, fresh);
  assert.equal(controller.getSnapshot().cart.subtotal, 90);
  assert.equal(controller.getSnapshot().canMutate, false);
  controller.endCheckout();
  assert.equal(controller.getSnapshot().checkoutLocked, false);
  assert.equal(controller.getSnapshot().canMutate, true);
});

test('checkout waits for already queued changes and requires review when their quantities changed', async context => {
  const setup = fixture(context);
  const before = cart([product('menta'), 2]);
  await ready(setup, before);
  const { controller, calls, order } = setup;
  const adding = controller.add(product('menta'));
  const checkout = controller.beginCheckout(before.items);
  await flush();
  assert.equal(calls.list.length, 1);
  calls.add[0].resolve(cart([product('menta'), 3]));
  await adding;
  await flush();
  calls.list[1].resolve(cart([product('menta'), 3]));
  assert.equal(await checkout, null);
  assert.deepEqual(order, ['list', 'add', 'list']);
  assert.equal(controller.getSnapshot().checkoutLocked, false);
  assert.equal(controller.getSnapshot().cart.totalItems, 3);
  assert.match(controller.getSnapshot().errorMessage, /bolsa cambió/);
});

test('failed checkout validation releases the lock and never calls DELETE', async context => {
  const setup = fixture(context);
  const before = cart([product('menta'), 2]);
  await ready(setup, before);
  const { controller, calls, ApiError } = setup;
  const checkout = controller.beginCheckout(before.items);
  await flush();
  calls.list[1].reject(new ApiError('private session metadata', 401));
  assert.equal(await checkout, null);
  assert.equal(controller.getSnapshot().checkoutLocked, false);
  assert.equal(controller.getSnapshot().canMutate, false);
  assert.equal(controller.getSnapshot().errorMessage, 'Tu sesión venció. Inicia sesión de nuevo.');
  assert.equal(calls.clear.length, 0);
});

test('cancelled checkout validation cannot restore a released lock or overwrite another capture', async context => {
  const setup = fixture(context);
  const before = cart([product('menta'), 2]);
  await ready(setup, before);
  const { controller, calls } = setup;
  const checkout = controller.beginCheckout(before.items);
  await flush();
  controller.endCheckout();
  assert.equal(calls.list[1].options.isCurrent(), false);
  assert.equal(controller.resumeCheckout([{ productId: 'other', quantity: 1 }]), true);
  calls.list[1].resolve(cart([product('menta'), 3]));
  assert.equal(await checkout, null);
  assert.equal(controller.getSnapshot().cart, before);
  assert.equal(controller.getSnapshot().checkoutLocked, true);
  assert.equal(controller.resumeCheckout(before.items), false);
});

test('confirmed cleanup checks purchased items and clears only the matching current bag once', async context => {
  const setup = fixture(context);
  const before = cart([product('menta'), 2], [product('eucalipto'), 1]);
  await ready(setup, before);
  const { controller, calls, order } = setup;
  assert.equal(controller.resumeCheckout(before.items), true);
  const clearing = controller.clearAfterOrder(before.items);
  await flush();
  calls.list[1].resolve(cart([product('eucalipto'), 1], [product('menta'), 2]));
  await flush();
  assert.equal(calls.clear.length, 1);
  assert.equal(await controller.clearAfterOrder(before.items), 'failed');
  controller.endCheckout();
  assert.equal(controller.getSnapshot().checkoutLocked, true);
  calls.clear[0].resolve(cart());
  assert.equal(await clearing, 'cleared');
  assert.deepEqual(order, ['list', 'list', 'clear']);
  assert.equal(controller.getSnapshot().status, 'empty');
  assert.equal(controller.getSnapshot().checkoutLocked, true);
  controller.endCheckout();
  assert.equal(controller.getSnapshot().canMutate, true);
});

test('cleanup preserves changed external products, quantities and forged purchased snapshots', async context => {
  for (const current of [cart([product('menta'), 3]), cart([product('menta'), 2], [product('new'), 1]), cart([product('new'), 1])]) {
    const setup = fixture(context);
    const before = cart([product('menta'), 2]);
    await ready(setup, before);
    const { controller, calls } = setup;
    assert.equal(await controller.clearAfterOrder(before.items), 'inactive');
    assert.equal(controller.resumeCheckout(before.items), true);
    assert.equal(await controller.clearAfterOrder([{ productId: 'new', quantity: 1 }]), 'changed');
    assert.equal(calls.list.length, 1);
    const clearing = controller.clearAfterOrder(before.items);
    await flush();
    calls.list[1].resolve(current);
    assert.equal(await clearing, 'changed');
    assert.equal(controller.getSnapshot().cart, current);
    assert.equal(calls.clear.length, 0);
  }
});

test('lost DELETE acknowledgement stays locked and retry recognizes already cleared bag without another DELETE', async context => {
  const setup = fixture(context);
  const before = cart([product('menta'), 2]);
  await ready(setup, before);
  const { controller, calls } = setup;
  controller.resumeCheckout(before.items);
  const first = controller.clearAfterOrder(before.items);
  await flush();
  calls.list[1].resolve(before);
  await flush();
  calls.clear[0].reject(new Error('timeout after the server cleared'));
  assert.equal(await first, 'failed');
  assert.equal(controller.getSnapshot().checkoutLocked, true);
  assert.equal(controller.getSnapshot().canMutate, false);
  assert.equal(controller.getSnapshot().cart, before);
  const retry = controller.clearAfterOrder(before.items);
  await flush();
  calls.list[2].resolve(cart());
  assert.equal(await retry, 'cleared');
  assert.equal(calls.clear.length, 1);
  controller.endCheckout();
  assert.equal(controller.getSnapshot().canMutate, true);
});

test('cleanup read failure makes no DELETE and a retry preserves products added elsewhere', async context => {
  const setup = fixture(context);
  const before = cart([product('menta'), 2]);
  await ready(setup, before);
  const { controller, calls } = setup;
  controller.resumeCheckout(before.items);
  const first = controller.clearAfterOrder(before.items);
  await flush();
  calls.list[1].reject(new Error('offline'));
  assert.equal(await first, 'failed');
  const retry = controller.clearAfterOrder(before.items);
  await flush();
  const current = cart([product('menta'), 2], [product('new'), 1]);
  calls.list[2].resolve(current);
  assert.equal(await retry, 'changed');
  assert.equal(calls.clear.length, 0);
  assert.equal(controller.getSnapshot().cart, current);
});

test('restored intent accepts only valid immutable snapshots and refresh cannot unlock checkout', async context => {
  const setup = fixture(context);
  await ready(setup, cart([product('menta'), 2]));
  const { controller, calls } = setup;
  for (const items of [[], [{ productId: ' ', quantity: 2 }], [{ productId: ' padded ', quantity: 2 }], [{ productId: 'menta', quantity: 0 }], [{ productId: 'menta', quantity: 26 }], [{ productId: 'menta', quantity: 1 }, { productId: 'menta', quantity: 1 }]]) {
    assert.equal(controller.resumeCheckout(items), false);
    assert.equal(await controller.beginCheckout(items), null);
  }
  const expected = [{ productId: 'menta', quantity: 2 }];
  assert.equal(controller.resumeCheckout(expected), true);
  expected[0].quantity = 3;
  assert.equal(controller.resumeCheckout(expected), false);
  const refreshing = controller.refresh();
  await flush();
  calls.list[1].resolve(cart([product('new'), 1]));
  await refreshing;
  assert.equal(controller.getSnapshot().canMutate, false);
  assert.equal(controller.getSnapshot().checkoutLocked, true);
});

test('stop invalidates cleanup authentication guards and ignores late account data', async context => {
  const setup = fixture(context);
  const before = cart([product('menta'), 2]);
  await ready(setup, before);
  const { controller, calls } = setup;
  controller.resumeCheckout(before.items);
  const clearing = controller.clearAfterOrder(before.items);
  await flush();
  calls.list[1].resolve(before);
  await flush();
  assert.equal(calls.clear[0].options.isCurrent(), true);
  controller.stop();
  assert.equal(calls.clear[0].options.isCurrent(), false);
  const snapshot = controller.getSnapshot();
  calls.clear[0].resolve(cart());
  assert.equal(await clearing, 'inactive');
  assert.equal(controller.getSnapshot(), snapshot);
  assert.equal(controller.resumeCheckout(before.items), false);
});
