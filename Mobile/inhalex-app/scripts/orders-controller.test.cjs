/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const PRODUCT = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const ADDRESS = 'cccccccccccccccccccccccc';
const ORDER = 'dddddddddddddddddddddddd';
const SIGNATURE = 'a'.repeat(64);
const plain = value => JSON.parse(JSON.stringify(value));
const flush = () => new Promise(resolve => setImmediate(resolve));

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
    ...load(path.join(projectRoot, 'src/features/orders/presentation/viewModels/OrdersController.ts')),
    ...load(path.join(projectRoot, 'src/core/network/ApiError.ts')),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function address(overrides = {}) {
  return {
    id: ADDRESS, label: 'Casa', recipientName: 'Cliente de prueba', phone: '5512345678',
    street: 'Reforma', exteriorNumber: '12', interiorNumber: '', neighborhood: 'Centro',
    municipality: 'Cuauhtémoc', state: 'Ciudad de México', postalCode: '06000', references: '',
    isDefault: true, ...overrides,
  };
}

const contact = () => ({ customerName: '  Cliente de prueba  ', customerEmail: '  CLIENTE@EXAMPLE.COM  ', customerPhone: ' 5512345678 ' });
const items = () => [{ productId: PRODUCT, quantity: 2 }];

function preview(overrides = {}) {
  return {
    items: [{
      productId: PRODUCT, productName: 'Aroma de prueba', productSlug: 'aroma-prueba', image: '', imageUrl: null,
      category: 'Aromas', presentation: '10 ml', origin: 'México', unitPrice: 80, currency: 'MXN',
      requestedQuantity: 2, quantity: 2, subtotal: 160, fulfillment: 'available', stockAvailable: 12,
      reservedQuantity: 2, backorderQuantity: 0, inventoryTracked: true, allowBackorder: false,
    }],
    issues: [], subtotal: 160, totalItems: 2, currency: 'MXN', canCreateDraft: true,
    canConfirmOrder: true, needsManualReview: false, signature: SIGNATURE, ...overrides,
  };
}

const confirmed = (overrides = {}) => ({ ...preview(), orderId: ORDER, reference: 'INH-TEST-0001', status: 'pending_review', ...overrides });
const cartValue = () => ({ items: items(), subtotal: 160, totalItems: 2, currency: 'MXN' });

function fixture(context, initial = null) {
  const { OrdersController, ApiError } = loadProduction();
  let saved = initial;
  let nextKey = 0;
  let cartLocked = false;
  const calls = { load: 0, save: [], clear: 0, key: 0, begin: [], resume: [], end: 0, cleanup: [], preview: [], confirm: [], events: [] };
  const repository = {
    preview(input, guard) {
      const request = { input, guard, ...deferred() };
      calls.preview.push(request);
      calls.events.push('preview');
      return request.promise;
    },
    confirm(input, key, guard) {
      const request = { input, key, guard, ...deferred() };
      calls.confirm.push(request);
      calls.events.push('confirm');
      return request.promise;
    },
  };
  const cart = {
    async beginCheckout(input) { calls.begin.push(plain(input)); if (cartLocked) return null; cartLocked = true; return cartValue(); },
    resumeCheckout(input) { calls.resume.push(plain(input)); cartLocked = true; return true; },
    endCheckout() { calls.end += 1; cartLocked = false; },
    async clearAfterOrder(input) { calls.cleanup.push(plain(input)); calls.events.push('cleanup'); return 'cleared'; },
  };
  const store = {
    async load() { calls.load += 1; return saved === null ? null : plain(saved); },
    async save(value) { calls.save.push(plain(value)); saved = plain(value); calls.events.push('save'); },
    async clear() { calls.clear += 1; saved = null; calls.events.push('clear'); },
  };
  const controller = new OrdersController(repository, cart, {
    contact: contact(), store,
    createKey() { calls.key += 1; return `inhalex-test-key-${++nextKey}`; },
  });
  context.after(() => controller.stop());
  return { controller, repository, cart, store, calls, ApiError, saved: () => saved };
}

async function ready(setup) {
  await setup.controller.start();
  setup.controller.setAddress(address());
}

async function reviewed(setup, value = preview()) {
  const reviewing = setup.controller.review(items());
  await flush();
  setup.calls.preview.at(-1).resolve(value);
  await reviewing;
}

async function ambiguous(setup) {
  await ready(setup);
  await reviewed(setup);
  const confirming = setup.controller.confirm();
  await flush();
  setup.calls.confirm.at(-1).reject(new Error('Server may already have saved the order'));
  assert.equal(await confirming, false);
}

test('startup restores once, preserves snapshot identity and does not automatically create an order', async context => {
  const setup = fixture(context);
  const first = setup.controller.start();
  assert.equal(first, setup.controller.start());
  assert.equal(setup.controller.getSnapshot().restoring, true);
  assert.equal(setup.controller.getSnapshot().canEdit, false);
  await first;
  const snapshot = setup.controller.getSnapshot();
  assert.equal(snapshot.status, 'idle');
  assert.equal(snapshot.restoring, false);
  assert.equal(snapshot.canEdit, true);
  assert.equal(snapshot, setup.controller.getSnapshot());
  assert.equal(setup.calls.load, 1);
  assert.equal(setup.calls.preview.length, 0);
  assert.equal(setup.calls.confirm.length, 0);
});

test('review waits for the locked current bag and presents only the authoritative server total', async context => {
  const setup = fixture(context);
  await ready(setup);
  const bag = deferred();
  setup.cart.beginCheckout = async value => { setup.calls.begin.push(plain(value)); return bag.promise; };
  const reviewing = setup.controller.review(items());
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  assert.equal(setup.controller.getSnapshot().canConfirm, false);
  assert.equal(setup.calls.preview.length, 0);
  bag.resolve(cartValue());
  await flush();
  const serverPreview = preview({ items: [preview().items[0], { ...preview().items[0], productId: OTHER }] });
  assert.equal(setup.calls.preview[0].guard(), true);
  setup.calls.preview[0].resolve(preview({ subtotal: 150, items: [{ ...preview().items[0], subtotal: 150, unitPrice: 75 }] }));
  await reviewing;
  assert.equal(setup.controller.getSnapshot().status, 'review');
  assert.equal(setup.controller.getSnapshot().preview.subtotal, 150);
  assert.deepEqual(setup.calls.begin[0], items());
  assert.notEqual(setup.controller.getSnapshot().preview.subtotal, serverPreview.subtotal);
});

test('an empty, duplicate, invalid or excessive bag is rejected before preview or order requests', async context => {
  const setup = fixture(context);
  await ready(setup);
  for (const invalid of [[], [{ productId: PRODUCT, quantity: 0 }], [{ productId: PRODUCT, quantity: 26 }], [...items(), ...items()], [{ productId: 'bad', quantity: 1 }]]) {
    await setup.controller.review(invalid);
    assert.equal(setup.controller.getSnapshot().status, 'error');
    assert.match(setup.controller.getSnapshot().errorMessage, /productos y cantidades/);
  }
  assert.equal(setup.calls.preview.length, 0);
  assert.equal(setup.calls.confirm.length, 0);
});

test('a changed or unavailable bag cannot produce a preview or confirm action', async context => {
  const setup = fixture(context);
  await ready(setup);
  setup.cart.beginCheckout = async () => null;
  await setup.controller.review(items());
  assert.equal(setup.controller.getSnapshot().status, 'error');
  assert.equal(setup.calls.preview.length, 0);
  assert.equal(await setup.controller.confirm(), false);
  assert.match(setup.controller.getSnapshot().errorMessage, /bolsa cambió/);
});

test('a nonconfirmable summary exposes availability issues and cannot create an order', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup, preview({ canConfirmOrder: false, issues: [{ code: 'stock', title: 'Agotado', description: 'Sin existencias', severity: 'error' }] }));
  assert.equal(setup.controller.getSnapshot().status, 'review');
  assert.equal(setup.controller.getSnapshot().canConfirm, false);
  assert.equal(setup.controller.getSnapshot().preview.issues[0].title, 'Agotado');
  assert.equal(await setup.controller.confirm(), false);
  assert.equal(setup.calls.confirm.length, 0);
});

test('invalid contact and missing address expose field errors without saving an intent or sending an order', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  setup.controller.setContact('customerName', '');
  setup.controller.setContact('customerEmail', 'no-email');
  setup.controller.setContact('customerPhone', '+52 555');
  setup.controller.setAddress(null);
  assert.equal(await setup.controller.confirm(), false);
  assert.equal(Object.keys(setup.controller.getSnapshot().contactErrors).length, 3);
  assert.match(setup.controller.getSnapshot().addressError, /dirección/);
  assert.equal(setup.calls.save.length, 0);
  assert.equal(setup.calls.confirm.length, 0);
});

test('confirmation normalizes contact, sends the selected address and requested quantities, and persists before POST', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup, preview({ items: [{ ...preview().items[0], quantity: 1, subtotal: 80, fulfillment: 'adjusted' }], totalItems: 1, subtotal: 80 }));
  const confirming = setup.controller.confirm();
  await flush();
  const request = setup.calls.confirm[0];
  assert.deepEqual(plain(request.input), {
    items: items(), customerName: 'Cliente de prueba', customerEmail: 'cliente@example.com',
    customerPhone: '5512345678', shippingAddressId: ADDRESS, previewSignature: SIGNATURE,
  });
  assert.ok(setup.calls.events.indexOf('save') < setup.calls.events.indexOf('confirm'));
  assert.equal(setup.saved().key, request.key);
  request.resolve(confirmed({ items: [{ ...preview().items[0], quantity: 1, subtotal: 80, fulfillment: 'adjusted' }], totalItems: 1, subtotal: 80 }));
  assert.equal(await confirming, true);
  assert.equal(setup.controller.getSnapshot().order.totalItems, 1);
  assert.equal(setup.calls.cleanup.length, 0);
  assert.equal(setup.controller.getSnapshot().cleanupStatus, 'changed');
  assert.equal(setup.saved(), null);
});

test('double taps are ignored while writing the durable intent and while waiting for the server', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  const save = deferred();
  setup.store.save = async value => { setup.calls.save.push(plain(value)); await save.promise; };
  const confirming = setup.controller.confirm();
  assert.equal(await setup.controller.confirm(), false);
  assert.equal(await setup.controller.retryConfirmation(), false);
  await flush();
  assert.equal(setup.calls.confirm.length, 0);
  save.resolve();
  await flush();
  assert.equal(setup.calls.confirm.length, 1);
  assert.equal(await setup.controller.confirm(), false);
  setup.calls.confirm[0].resolve(confirmed());
  assert.equal(await confirming, true);
  assert.equal(setup.calls.key, 1);
});

test('storage failure before POST keeps the reviewed summary and sends no order', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  setup.store.save = async () => { throw new Error('Disk unavailable'); };
  assert.equal(await setup.controller.confirm(), false);
  assert.equal(setup.controller.getSnapshot().status, 'review');
  assert.match(setup.controller.getSnapshot().errorMessage, /almacenamiento/);
  assert.equal(setup.calls.confirm.length, 0);
  assert.equal(setup.calls.cleanup.length, 0);
});

test('successful order is immutable, never reported as paid, and cart cleanup is a separate operation', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  const cleanup = deferred();
  setup.cart.clearAfterOrder = async value => { setup.calls.cleanup.push(plain(value)); return cleanup.promise; };
  const confirming = setup.controller.confirm();
  await flush();
  setup.calls.confirm[0].resolve(confirmed());
  await flush();
  assert.equal(setup.controller.getSnapshot().status, 'success');
  assert.equal(setup.controller.getSnapshot().order.status, 'pending_review');
  assert.equal(setup.controller.getSnapshot().cleanupStatus, 'pending');
  assert.equal(setup.saved().confirmedOrder.orderId, ORDER);
  setup.controller.setAddress(null);
  setup.controller.setContact('customerName', 'Another buyer');
  setup.controller.reset();
  assert.equal(setup.controller.getSnapshot().address.id, ADDRESS);
  assert.equal(setup.controller.getSnapshot().contact.customerName, 'Cliente de prueba');
  assert.equal(await setup.controller.confirm(), false);
  cleanup.resolve('cleared');
  assert.equal(await confirming, true);
  assert.equal(setup.calls.confirm.length, 1);
  setup.controller.reset();
  assert.equal(setup.controller.getSnapshot().status, 'idle');
  assert.equal(setup.controller.getSnapshot().order, null);
});

test('timeout preserves the exact key and body, prevents editing or cancellation, and retries only that intent', async context => {
  const setup = fixture(context);
  await ambiguous(setup);
  const original = setup.calls.confirm[0];
  assert.equal(setup.controller.getSnapshot().status, 'uncertain');
  setup.controller.setContact('customerEmail', 'other@example.com');
  setup.controller.setAddress(address({ id: OTHER }));
  setup.controller.cancelReview();
  setup.controller.reset();
  await setup.controller.review([{ productId: OTHER, quantity: 1 }]);
  assert.equal(setup.controller.getSnapshot().status, 'uncertain');
  assert.equal(setup.calls.preview.length, 1);
  assert.equal(setup.calls.cleanup.length, 0);
  const retrying = setup.controller.retryConfirmation();
  await flush();
  assert.equal(setup.calls.key, 1);
  assert.equal(setup.calls.confirm[1].key, original.key);
  assert.deepEqual(plain(setup.calls.confirm[1].input), plain(original.input));
  setup.calls.confirm[1].resolve(confirmed());
  assert.equal(await retrying, true);
  assert.equal(setup.controller.getSnapshot().status, 'success');
  assert.equal(setup.controller.getSnapshot().order.reference, 'INH-TEST-0001');
});

test('500, 408 and 429 confirmations remain uncertain and do not clear the bag or durable intent', async context => {
  for (const status of [500, 503, 408, 429]) {
    const setup = fixture(context);
    await ready(setup);
    await reviewed(setup);
    const confirming = setup.controller.confirm();
    await flush();
    setup.calls.confirm[0].reject(new setup.ApiError('Internal diagnostic', status));
    assert.equal(await confirming, false);
    assert.equal(setup.controller.getSnapshot().status, 'uncertain');
    assert.match(setup.controller.getSnapshot().errorMessage, /evitar duplicarlo/);
    assert.equal(setup.calls.cleanup.length, 0);
    assert.equal(setup.calls.clear, 0);
    assert.ok(setup.saved());
  }
});

test('400, 401, 403 and 409 after an ambiguous result retain the old key because the first request can still finish', async context => {
  for (const status of [400, 401, 403, 409]) {
    const setup = fixture(context);
    await ambiguous(setup);
    const retrying = setup.controller.retryConfirmation();
    await flush();
    setup.calls.confirm[1].reject(new setup.ApiError('Conflicting retry', status));
    assert.equal(await retrying, false);
    assert.equal(setup.controller.getSnapshot().status, 'uncertain');
    assert.equal(setup.calls.clear, 0);
    assert.equal(setup.calls.preview.length, 1);
    assert.equal(setup.saved().key, setup.calls.confirm[0].key);
    assert.equal(setup.calls.key, 1);
  }
});

test('a fresh 409 fetches a new authoritative preview but waits for explicit consent before sending again', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  const confirming = setup.controller.confirm();
  await flush();
  setup.calls.confirm[0].reject(new setup.ApiError('Inventory changed', 409));
  await flush();
  assert.equal(setup.calls.preview.length, 2);
  assert.equal(setup.calls.confirm.length, 1);
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  setup.calls.preview[1].resolve(preview({ signature: 'b'.repeat(64) }));
  assert.equal(await confirming, false);
  assert.equal(setup.controller.getSnapshot().status, 'review');
  assert.match(setup.controller.getSnapshot().errorMessage, /Revisa el nuevo resumen/);
  const reviewedSnapshot = setup.controller.getSnapshot();
  setup.controller.setAddress(address());
  assert.equal(setup.controller.getSnapshot(), reviewedSnapshot);
  setup.controller.setAddress(address({ label: 'Oficina' }));
  assert.match(setup.controller.getSnapshot().errorMessage, /Revisa el nuevo resumen/);
  assert.equal(setup.calls.confirm.length, 1);
  const consenting = setup.controller.confirm();
  await flush();
  assert.notEqual(setup.calls.confirm[1].key, setup.calls.confirm[0].key);
  assert.equal(setup.calls.confirm[1].input.previewSignature, 'b'.repeat(64));
  setup.calls.confirm[1].resolve(confirmed({ signature: 'b'.repeat(64) }));
  assert.equal(await consenting, true);
});

test('known rejection releases the bag and requires another review, without exposing server diagnostics', async context => {
  for (const status of [400, 401, 403, 422]) {
    const setup = fixture(context);
    await ready(setup);
    await reviewed(setup);
    const confirming = setup.controller.confirm();
    await flush();
    setup.calls.confirm[0].reject(new setup.ApiError('Private DTO / internal details', status));
    assert.equal(await confirming, false);
    assert.equal(setup.controller.getSnapshot().status, 'error');
    assert.equal(setup.controller.getSnapshot().preview, null);
    assert.doesNotMatch(setup.controller.getSnapshot().errorMessage, /Private|internal/);
    assert.equal(setup.saved(), null);
    assert.equal(setup.calls.cleanup.length, 0);
    assert.equal(await setup.controller.confirm(), false);
  }
});

test('failed local clearing after a known rejection preserves the old intent instead of enabling a different order', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  setup.store.clear = async () => { throw new Error('Storage unavailable'); };
  const confirming = setup.controller.confirm();
  await flush();
  setup.calls.confirm[0].reject(new setup.ApiError('Inventory changed', 409));
  assert.equal(await confirming, false);
  assert.equal(setup.controller.getSnapshot().status, 'uncertain');
  assert.equal(setup.calls.preview.length, 1);
  assert.ok(setup.saved());
});

test('a malformed success cannot publish an order or clear the cart and can only retry the same key', async context => {
  for (const malformed of [null, confirmed({ orderId: 'bad' }), confirmed({ signature: 'b'.repeat(64) }), confirmed({ subtotal: 999 }), confirmed({ status: 'paid' })]) {
    const setup = fixture(context);
    await ready(setup);
    await reviewed(setup);
    const confirming = setup.controller.confirm();
    await flush();
    setup.calls.confirm[0].resolve(malformed);
    assert.equal(await confirming, false);
    assert.equal(setup.controller.getSnapshot().status, 'uncertain');
    assert.equal(setup.controller.getSnapshot().order, null);
    assert.equal(setup.calls.cleanup.length, 0);
    assert.ok(setup.saved());
  }
});

test('cleanup failure keeps the received order and retryCleanup never invokes POST again', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  let count = 0;
  setup.cart.clearAfterOrder = async () => ++count === 1 ? 'failed' : 'cleared';
  const confirming = setup.controller.confirm();
  await flush();
  setup.calls.confirm[0].resolve(confirmed());
  assert.equal(await confirming, true);
  assert.equal(setup.controller.getSnapshot().status, 'success');
  assert.equal(setup.controller.getSnapshot().cleanupStatus, 'failed');
  assert.match(setup.controller.getSnapshot().errorMessage, /ya fue recibido/);
  assert.equal(await setup.controller.retryConfirmation(), false);
  setup.controller.reset();
  assert.equal(setup.controller.getSnapshot().order.orderId, ORDER);
  await setup.controller.retryCleanup();
  assert.equal(setup.controller.getSnapshot().cleanupStatus, 'cleared');
  assert.equal(setup.calls.confirm.length, 1);
  assert.equal(setup.saved(), null);
});

test('a changed cart after confirmation is retained and disclosed, then a new order can be prepared explicitly', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  setup.cart.clearAfterOrder = async () => 'changed';
  const confirming = setup.controller.confirm();
  await flush();
  setup.calls.confirm[0].resolve(confirmed());
  assert.equal(await confirming, true);
  assert.equal(setup.controller.getSnapshot().cleanupStatus, 'changed');
  assert.match(setup.controller.getSnapshot().errorMessage, /Conservamos/);
  assert.equal(setup.saved(), null);
  setup.controller.reset();
  assert.equal(setup.controller.getSnapshot().status, 'idle');
});

test('a preview that omits an unavailable product never clears the unpurchased products from the bag', async context => {
  const setup = fixture(context);
  await ready(setup);
  const reviewing = setup.controller.review([...items(), { productId: OTHER, quantity: 1 }]);
  await flush();
  setup.calls.preview[0].resolve(preview());
  await reviewing;
  const confirming = setup.controller.confirm();
  await flush();
  setup.calls.confirm[0].resolve(confirmed());
  assert.equal(await confirming, true);
  assert.equal(setup.calls.cleanup.length, 0);
  assert.equal(setup.controller.getSnapshot().cleanupStatus, 'changed');
  assert.equal(setup.saved(), null);
});

test('failed success persistence keeps success visible and defers cleanup safely', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  const saving = setup.store.save;
  setup.store.save = async value => {
    if (value.confirmedOrder) throw new Error('Storage full');
    return saving(value);
  };
  const confirming = setup.controller.confirm();
  await flush();
  setup.calls.confirm[0].resolve(confirmed());
  assert.equal(await confirming, true);
  assert.equal(setup.controller.getSnapshot().status, 'success');
  assert.equal(setup.controller.getSnapshot().cleanupStatus, 'failed');
  assert.equal(setup.calls.cleanup.length, 0);
  assert.equal(setup.saved().confirmedOrder, undefined);
  setup.store.save = saving;
  await setup.controller.retryCleanup();
  assert.equal(setup.calls.confirm.length, 1);
  assert.equal(setup.controller.getSnapshot().cleanupStatus, 'cleared');
});

test('failed durable cleanup after cart clearing cannot enable a duplicate order', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  const clearing = setup.store.clear;
  setup.store.clear = async () => { throw new Error('Storage temporarily unavailable'); };
  const confirming = setup.controller.confirm();
  await flush();
  setup.calls.confirm[0].resolve(confirmed());
  assert.equal(await confirming, true);
  assert.equal(setup.controller.getSnapshot().cleanupStatus, 'failed');
  setup.controller.reset();
  assert.equal(setup.controller.getSnapshot().status, 'success');
  setup.store.clear = clearing;
  await setup.controller.retryCleanup();
  assert.equal(setup.calls.cleanup.length, 2);
  assert.equal(setup.calls.confirm.length, 1);
  assert.equal(setup.saved(), null);
});

test('restoring an ambiguous attempt after restart freezes the original payload and does not send automatically', async context => {
  const original = fixture(context);
  await ambiguous(original);
  const saved = plain(original.saved());
  original.controller.stop();
  const recovered = fixture(context, saved);
  await recovered.controller.start();
  assert.equal(recovered.controller.getSnapshot().status, 'uncertain');
  assert.equal(recovered.controller.getSnapshot().address.id, ADDRESS);
  assert.equal(recovered.controller.getSnapshot().contact.customerEmail, 'cliente@example.com');
  assert.equal(recovered.calls.confirm.length, 0);
  assert.equal(recovered.calls.key, 0);
  const checking = recovered.controller.retryConfirmation();
  await flush();
  assert.deepEqual(plain(recovered.calls.confirm[0].input), saved.input);
  assert.equal(recovered.calls.confirm[0].key, saved.key);
  recovered.calls.confirm[0].resolve(confirmed());
  assert.equal(await checking, true);
});

test('restoring a received order offers only cart cleanup and never confirmation', async context => {
  const original = fixture(context);
  await ambiguous(original);
  const saved = { ...plain(original.saved()), confirmedOrder: confirmed() };
  const recovered = fixture(context, saved);
  await recovered.controller.start();
  assert.equal(recovered.controller.getSnapshot().status, 'success');
  assert.equal(recovered.controller.getSnapshot().order.reference, 'INH-TEST-0001');
  assert.equal(recovered.controller.getSnapshot().cleanupStatus, 'failed');
  assert.equal(await recovered.controller.confirm(), false);
  assert.equal(await recovered.controller.retryConfirmation(), false);
  await recovered.controller.retryCleanup();
  assert.equal(recovered.calls.confirm.length, 0);
  assert.equal(recovered.calls.cleanup.length, 1);
  assert.equal(recovered.saved(), null);
});

test('unreadable pending storage blocks new orders and recovery retry does not erase it', async context => {
  const setup = fixture(context);
  setup.store.load = async () => { throw new Error('Unavailable key store'); };
  await setup.controller.start();
  assert.equal(setup.controller.getSnapshot().recoveryBlocked, true);
  assert.equal(setup.controller.getSnapshot().canEdit, false);
  await setup.controller.review(items());
  setup.controller.reset();
  assert.equal(setup.calls.preview.length, 0);
  assert.equal(setup.calls.clear, 0);
  setup.store.load = async () => null;
  await setup.controller.retryRecovery();
  assert.equal(setup.controller.getSnapshot().recoveryBlocked, false);
  assert.equal(setup.controller.getSnapshot().status, 'idle');
});

test('corrupted saved key, payload, address, summary or order never authorizes a replay or new order', async context => {
  const source = fixture(context);
  await ambiguous(source);
  const saved = source.saved();
  for (const corrupt of [
    { ...saved, key: 'bad' },
    { ...saved, input: { ...saved.input, shippingAddressId: 'bad' } },
    { ...saved, address: address({ id: OTHER }) },
    { ...saved, preview: preview({ signature: 'b'.repeat(64) }) },
    { ...saved, confirmedOrder: confirmed({ orderId: 'bad' }) },
  ]) {
    const setup = fixture(context, corrupt);
    await setup.controller.start();
    assert.equal(setup.controller.getSnapshot().recoveryBlocked, true);
    assert.equal(await setup.controller.retryConfirmation(), false);
    await setup.controller.review(items());
    assert.equal(setup.calls.confirm.length, 0);
    assert.equal(setup.calls.clear, 0);
  }
});

test('cancelled review ignores a late preview and permits returning to editable bag', async context => {
  const setup = fixture(context);
  await ready(setup);
  const reviewing = setup.controller.review(items());
  await flush();
  const guard = setup.calls.preview[0].guard;
  setup.controller.cancelReview();
  assert.equal(guard(), false);
  assert.equal(setup.controller.getSnapshot().status, 'idle');
  setup.calls.preview[0].resolve(preview());
  await reviewing;
  assert.equal(setup.controller.getSnapshot().preview, null);
});

test('older preview responses cannot replace the most recently requested summary', async context => {
  const setup = fixture(context);
  await ready(setup);
  const first = setup.controller.review(items());
  await flush();
  const second = setup.controller.review(items());
  await flush();
  setup.calls.preview[1].resolve(preview({ signature: 'b'.repeat(64) }));
  await second;
  setup.calls.preview[0].resolve(preview());
  await first;
  assert.equal(setup.controller.getSnapshot().preview.signature, 'b'.repeat(64));
});

test('a new invalid bag also invalidates an older in-flight preview', async context => {
  const setup = fixture(context);
  await ready(setup);
  const first = setup.controller.review(items());
  await flush();
  await setup.controller.review([]);
  assert.equal(setup.calls.preview[0].guard(), false);
  setup.calls.preview[0].resolve(preview());
  await first;
  assert.equal(setup.controller.getSnapshot().status, 'error');
  assert.equal(setup.controller.getSnapshot().preview, null);
  assert.equal(setup.controller.getSnapshot().canConfirm, false);
});

test('preview errors and malformed totals allow an explicit retry but never enable confirmation', async context => {
  for (const value of [null, preview({ subtotal: 1 }), preview({ items: [{ ...preview().items[0], productId: OTHER }] })]) {
    const setup = fixture(context);
    await ready(setup);
    await reviewed(setup, value);
    assert.equal(setup.controller.getSnapshot().status, 'error');
    assert.equal(setup.controller.getSnapshot().canConfirm, false);
    await reviewed(setup);
    assert.equal(setup.controller.getSnapshot().status, 'review');
  }
});

test('stop invalidates async token guards, ignores late success and prevents cross-session cart cleanup', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  const confirming = setup.controller.confirm();
  await flush();
  const request = setup.calls.confirm[0];
  assert.equal(request.guard(), true);
  setup.controller.stop();
  assert.equal(request.guard(), false);
  const stopped = setup.controller.getSnapshot();
  let updates = 0;
  const unsubscribe = setup.controller.subscribe(() => { updates += 1; });
  request.resolve(confirmed());
  assert.equal(await confirming, false);
  assert.equal(setup.controller.getSnapshot(), stopped);
  assert.equal(updates, 0);
  assert.equal(setup.calls.cleanup.length, 0);
  assert.equal(setup.saved().confirmedOrder, undefined);
  await setup.controller.review(items());
  assert.equal(await setup.controller.confirm(), false);
  unsubscribe();
});

test('Strict Mode restart waits for an outstanding confirmation, then recovers its original durable intent', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  const confirming = setup.controller.confirm();
  await flush();
  setup.controller.stop();
  const restarting = setup.controller.start();
  await flush();
  assert.equal(setup.calls.load, 1);
  assert.equal(setup.controller.getSnapshot().restoring, true);
  setup.calls.confirm[0].resolve(confirmed());
  assert.equal(await confirming, false);
  await restarting;
  assert.equal(setup.calls.load, 2);
  assert.equal(setup.controller.getSnapshot().status, 'uncertain');
  assert.equal(setup.calls.confirm.length, 1);
  assert.equal(setup.calls.cleanup.length, 0);
});

test('stopping during durable save prevents network dispatch but preserves a recoverable intent', async context => {
  const setup = fixture(context);
  await ready(setup);
  await reviewed(setup);
  const saving = setup.store.save;
  const blocked = deferred();
  setup.store.save = async value => { await saving(value); await blocked.promise; };
  const confirming = setup.controller.confirm();
  await flush();
  setup.controller.stop();
  blocked.resolve();
  assert.equal(await confirming, false);
  assert.equal(setup.calls.confirm.length, 0);
  assert.ok(setup.saved());
  await setup.controller.start();
  assert.equal(setup.controller.getSnapshot().status, 'uncertain');
});

test('another account does not receive the previous user response, summary, address or pending cleanup', async context => {
  const previous = fixture(context);
  await ready(previous);
  await reviewed(previous);
  const confirming = previous.controller.confirm();
  await flush();
  previous.controller.stop();
  const current = fixture(context);
  await current.controller.start();
  previous.calls.confirm[0].resolve(confirmed());
  await confirming;
  assert.equal(current.controller.getSnapshot().status, 'idle');
  assert.equal(current.controller.getSnapshot().preview, null);
  assert.equal(current.controller.getSnapshot().address, null);
  assert.equal(current.controller.getSnapshot().order, null);
  assert.equal(current.calls.cleanup.length, 0);
});
