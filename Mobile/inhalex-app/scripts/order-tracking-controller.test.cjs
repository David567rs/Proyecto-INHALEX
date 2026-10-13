/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const FIRST_ID = '68ed00000000000000000001';
const SECOND_ID = '68ed00000000000000000002';

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
    ...load(path.join(projectRoot, 'src/features/orderTracking/presentation/viewModels/OrderTrackingController.ts')),
    ...load(path.join(projectRoot, 'src/core/network/ApiError.ts')),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function order(id = FIRST_ID, overrides = {}) {
  return {
    id, reference: 'INH-2026-123', status: 'pending_review', currency: 'MXN',
    totalItems: 2, subtotal: 120, createdAt: '2026-10-13T10:00:00.000Z',
    confirmedAt: null, cancelledAt: null, completedAt: null, ...overrides,
  };
}

function fixture(context) {
  const { OrderTrackingController, ApiError } = loadProduction();
  const calls = [];
  let clock = '2026-10-13T12:00:00.000Z';
  const repository = {
    getById(id, guard) {
      const request = { id, guard, ...deferred() };
      calls.push(request);
      return request.promise;
    },
  };
  const controller = new OrderTrackingController(repository, () => clock);
  context.after(() => controller.stop());
  return { controller, calls, ApiError, setClock: value => { clock = value; } };
}

async function ready(setup, response = order()) {
  await setup.controller.start();
  const request = setup.controller.load(response.id);
  setup.calls.at(-1).resolve(response);
  await request;
}

test('provider startup is idle until the screen requests a specific order', async context => {
  const setup = fixture(context);
  assert.equal(setup.controller.getSnapshot().status, 'idle');
  const snapshot = setup.controller.getSnapshot();
  assert.equal(snapshot, setup.controller.getSnapshot());
  await setup.controller.start();
  await setup.controller.start();
  await setup.controller.refresh();
  assert.equal(setup.calls.length, 0);
  assert.equal(setup.controller.getSnapshot(), snapshot);
});

test('deep-link focus can queue a load before provider startup', async context => {
  const setup = fixture(context);
  const loading = setup.controller.load(FIRST_ID);
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  assert.equal(setup.calls.length, 0);
  assert.equal(setup.controller.refresh(), loading);
  assert.equal(setup.controller.start(), loading);
  assert.equal(setup.controller.start(), loading);
  assert.equal(setup.calls.length, 1);
  assert.equal(setup.calls[0].guard(), true);
  setup.calls[0].resolve(order());
  await loading;
  assert.equal(setup.controller.getSnapshot().status, 'ready');
});

test('closing a queued deep link prevents its request from starting', async context => {
  const setup = fixture(context);
  const loading = setup.controller.load(FIRST_ID);
  setup.controller.close();
  await loading;
  await setup.controller.start();
  assert.equal(setup.calls.length, 0);
  assert.equal(setup.controller.getSnapshot().status, 'idle');
});

test('only the latest ID queued before startup is requested', async context => {
  const setup = fixture(context);
  const cancelled = setup.controller.load(FIRST_ID);
  const loading = setup.controller.load(SECOND_ID);
  await cancelled;
  const starting = setup.controller.start();
  assert.equal(starting, loading);
  assert.equal(setup.calls.length, 1);
  assert.equal(setup.calls[0].id, SECOND_ID);
  setup.calls[0].resolve(order(SECOND_ID));
  await starting;
  assert.equal(setup.controller.getSnapshot().order.id, SECOND_ID);
});

test('IDs normalize once and repeated in-flight loads coalesce', async context => {
  const setup = fixture(context);
  await setup.controller.start();
  const loading = setup.controller.load(FIRST_ID.toUpperCase());
  assert.equal(setup.controller.load(FIRST_ID), loading);
  assert.equal(setup.controller.refresh(), loading);
  assert.equal(setup.calls.length, 1);
  assert.equal(setup.calls[0].id, FIRST_ID);
  setup.calls[0].resolve(order());
  await loading;
  assert.equal(setup.controller.getSnapshot().order.id, FIRST_ID);
});

for (const status of ['pending_review', 'confirmed', 'cancelled', 'completed']) {
  test(`successful ${status} read exposes the server status and recorded dates`, async context => {
    const setup = fixture(context);
    const response = order(FIRST_ID, {
      status,
      confirmedAt: status === 'confirmed' || status === 'completed' ? '2026-10-13T10:30:00.000Z' : null,
      cancelledAt: status === 'cancelled' ? '2026-10-13T11:00:00.000Z' : null,
      completedAt: status === 'completed' ? '2026-10-13T11:30:00.000Z' : null,
    });
    await ready(setup, response);
    const state = setup.controller.getSnapshot();
    assert.equal(state.order, response);
    assert.equal(state.status, 'ready');
    assert.equal(state.updatedAt, '2026-10-13T12:00:00.000Z');
    assert.equal(state.refreshing, false);
    assert.equal(state.errorMessage, null);
  });
}

test('refresh keeps the last snapshot visible and replaces it with the latest status', async context => {
  const setup = fixture(context);
  await ready(setup);
  const previous = setup.controller.getSnapshot().order;
  setup.setClock('2026-10-13T12:05:00.000Z');
  const refreshing = setup.controller.refresh();
  assert.equal(setup.controller.refresh(), refreshing);
  assert.equal(setup.controller.load(FIRST_ID), refreshing);
  assert.equal(setup.controller.getSnapshot().order, previous);
  assert.equal(setup.controller.getSnapshot().status, 'ready');
  assert.equal(setup.controller.getSnapshot().refreshing, true);
  assert.equal(setup.controller.getSnapshot().updatedAt, '2026-10-13T12:00:00.000Z');
  setup.calls[1].resolve(order(FIRST_ID, { status: 'confirmed', confirmedAt: '2026-10-13T12:02:00.000Z' }));
  await refreshing;
  assert.equal(setup.controller.getSnapshot().order.status, 'confirmed');
  assert.equal(setup.controller.getSnapshot().refreshing, false);
  assert.equal(setup.controller.getSnapshot().updatedAt, '2026-10-13T12:05:00.000Z');
});

test('transient refresh failure preserves data and successful-check time with a stale warning', async context => {
  const setup = fixture(context);
  await ready(setup);
  const previous = setup.controller.getSnapshot().order;
  setup.setClock('2026-10-13T12:05:00.000Z');
  const refreshing = setup.controller.refresh();
  setup.calls[1].reject(new Error('private backend error'));
  await refreshing;
  const state = setup.controller.getSnapshot();
  assert.equal(state.order, previous);
  assert.equal(state.status, 'ready');
  assert.equal(state.refreshing, false);
  assert.equal(state.updatedAt, '2026-10-13T12:00:00.000Z');
  assert.match(state.errorMessage, /última información/);
  assert.doesNotMatch(state.errorMessage, /private/);
  const retry = setup.controller.refresh();
  assert.equal(setup.controller.getSnapshot().errorMessage, null);
  setup.calls[2].resolve(order(FIRST_ID, { status: 'completed' }));
  await retry;
  assert.equal(setup.controller.getSnapshot().order.status, 'completed');
  assert.equal(setup.controller.getSnapshot().updatedAt, '2026-10-13T12:05:00.000Z');
});

test('first-load connection failure exposes a controlled retryable error', async context => {
  const setup = fixture(context);
  await setup.controller.start();
  const loading = setup.controller.load(FIRST_ID);
  setup.calls[0].reject(new Error('secret endpoint details'));
  await loading;
  assert.equal(setup.controller.getSnapshot().status, 'error');
  assert.equal(setup.controller.getSnapshot().order, null);
  assert.equal(setup.controller.getSnapshot().updatedAt, null);
  assert.match(setup.controller.getSnapshot().errorMessage, /conexión/);
  assert.doesNotMatch(setup.controller.getSnapshot().errorMessage, /secret/);
  const retry = setup.controller.refresh();
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  setup.calls[1].resolve(order());
  await retry;
  assert.equal(setup.controller.getSnapshot().status, 'ready');
});

for (const status of [401, 403, 404]) {
  test(`${status} on refresh clears cached order and successful-check time`, async context => {
    const setup = fixture(context);
    await ready(setup);
    const refreshing = setup.controller.refresh();
    setup.calls[1].reject(new setup.ApiError('server-private-message', status));
    await refreshing;
    const state = setup.controller.getSnapshot();
    assert.equal(state.order, null);
    assert.equal(state.updatedAt, null);
    assert.equal(state.refreshing, false);
    assert.equal(state.status, status === 404 ? 'not-found' : 'error');
    assert.match(state.errorMessage, status === 404 ? /No encontramos/ : /sesión venció/);
    assert.doesNotMatch(state.errorMessage, /server-private/);
  });
}

test('a missing order can be retried after it becomes available', async context => {
  const setup = fixture(context);
  await setup.controller.start();
  const loading = setup.controller.load(FIRST_ID);
  setup.calls[0].reject(new setup.ApiError('Missing', 404));
  await loading;
  assert.equal(setup.controller.getSnapshot().status, 'not-found');
  const retry = setup.controller.refresh();
  setup.calls[1].resolve(order());
  await retry;
  assert.equal(setup.controller.getSnapshot().status, 'ready');
});

test('selecting another order immediately removes previous data and checked time', async context => {
  const setup = fixture(context);
  await ready(setup);
  const loading = setup.controller.load(SECOND_ID);
  const state = setup.controller.getSnapshot();
  assert.equal(state.order, null);
  assert.equal(state.updatedAt, null);
  assert.equal(state.status, 'loading');
  assert.equal(state.refreshing, false);
  setup.calls[1].resolve(order(SECOND_ID));
  await loading;
  assert.equal(setup.controller.getSnapshot().order.id, SECOND_ID);
});

for (const staleResult of ['success', 'error', 'unauthorized', 'not-found']) {
  test(`late ${staleResult} from the old ID cannot change the currently selected order`, async context => {
    const setup = fixture(context);
    await setup.controller.start();
    const first = setup.controller.load(FIRST_ID);
    const second = setup.controller.load(SECOND_ID);
    await first;
    assert.equal(setup.calls[0].guard(), false);
    setup.calls[1].resolve(order(SECOND_ID));
    await second;
    const current = setup.controller.getSnapshot();
    if (staleResult === 'success') setup.calls[0].resolve(order());
    else setup.calls[0].reject(new setup.ApiError('Old failure', staleResult === 'unauthorized' ? 401 : staleResult === 'not-found' ? 404 : 500));
    await Promise.resolve();
    assert.equal(setup.controller.getSnapshot(), current);
    assert.equal(current.order.id, SECOND_ID);
  });
}

test('close cancels the active read and late completion cannot repopulate the screen', async context => {
  const setup = fixture(context);
  await setup.controller.start();
  const loading = setup.controller.load(FIRST_ID);
  setup.controller.close();
  await loading;
  assert.equal(setup.calls[0].guard(), false);
  const closed = setup.controller.getSnapshot();
  assert.equal(closed.status, 'idle');
  assert.equal(closed.order, null);
  setup.calls[0].resolve(order());
  await Promise.resolve();
  assert.equal(setup.controller.getSnapshot(), closed);
  await setup.controller.refresh();
  assert.equal(setup.calls.length, 1);
});

test('unmount/logout stop clears all data and invalidates an in-flight refresh', async context => {
  const setup = fixture(context);
  await ready(setup);
  const refreshing = setup.controller.refresh();
  setup.controller.stop();
  await refreshing;
  const stopped = setup.controller.getSnapshot();
  assert.equal(stopped.status, 'idle');
  assert.equal(stopped.order, null);
  assert.equal(stopped.updatedAt, null);
  assert.equal(stopped.errorMessage, null);
  assert.equal(setup.calls[1].guard(), false);
  setup.calls[1].reject(new setup.ApiError('late logout failure', 401));
  await Promise.resolve();
  assert.equal(setup.controller.getSnapshot(), stopped);
});

test('effect restart accepts the new focused load without reviving the old request', async context => {
  const setup = fixture(context);
  await setup.controller.start();
  const first = setup.controller.load(FIRST_ID);
  setup.controller.stop();
  await first;
  const queued = setup.controller.load(SECOND_ID);
  assert.equal(setup.calls.length, 1);
  assert.equal(setup.controller.start(), queued);
  assert.equal(setup.calls.length, 2);
  setup.calls[0].resolve(order());
  await Promise.resolve();
  assert.equal(setup.controller.getSnapshot().order, null);
  setup.calls[1].resolve(order(SECOND_ID));
  await queued;
  assert.equal(setup.controller.getSnapshot().order.id, SECOND_ID);
});

test('a response for another ID is rejected and cannot leak another order', async context => {
  const setup = fixture(context);
  await setup.controller.start();
  const loading = setup.controller.load(FIRST_ID);
  setup.calls[0].resolve(order(SECOND_ID));
  await loading;
  assert.equal(setup.controller.getSnapshot().status, 'error');
  assert.equal(setup.controller.getSnapshot().order, null);
  assert.equal(setup.controller.getSnapshot().updatedAt, null);
});

test('an invalid refresh response keeps only the previously verified order', async context => {
  const setup = fixture(context);
  await ready(setup);
  const refreshing = setup.controller.refresh();
  setup.calls[1].resolve(order(SECOND_ID));
  await refreshing;
  assert.equal(setup.controller.getSnapshot().order.id, FIRST_ID);
  assert.match(setup.controller.getSnapshot().errorMessage, /última información/);
});

test('subscriptions deliver stable snapshots and can be removed', async context => {
  const setup = fixture(context);
  const snapshots = [];
  const unsubscribe = setup.controller.subscribe(() => snapshots.push(setup.controller.getSnapshot()));
  await ready(setup);
  assert.equal(snapshots[0].status, 'loading');
  assert.equal(snapshots.at(-1).status, 'ready');
  assert.equal(snapshots.at(-1), setup.controller.getSnapshot());
  assert.equal(snapshots[0].refresh, snapshots.at(-1).refresh);
  assert.equal(snapshots[0].load, snapshots.at(-1).load);
  unsubscribe();
  const length = snapshots.length;
  setup.controller.close();
  assert.equal(snapshots.length, length);
});

test('synchronous repository errors settle the read and allow a later retry', async context => {
  const { OrderTrackingController } = loadProduction();
  let failed = true;
  const controller = new OrderTrackingController({ getById() {
    if (failed) throw new Error('synchronous storage or adapter failure');
    return Promise.resolve(order());
  } });
  context.after(() => controller.stop());
  await controller.start();
  await controller.load(FIRST_ID);
  assert.equal(controller.getSnapshot().status, 'error');
  failed = false;
  await controller.refresh();
  assert.equal(controller.getSnapshot().status, 'ready');
});
