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
    ...load(path.join(projectRoot, 'src/features/orderHistory/presentation/viewModels/OrderHistoryController.ts')),
    ...load(path.join(projectRoot, 'src/core/network/ApiError.ts')),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function order(id, overrides = {}) {
  return {
    id, reference: `INH-${id}`, status: 'pending_review', currency: 'MXN',
    totalItems: 2, subtotal: 120, createdAt: '2026-10-13T10:00:00.000Z',
    ...overrides,
  };
}

function detail(id, overrides = {}) {
  return { ...order(id), items: [], shippingAddress: null, ...overrides };
}

function page(orders = [], nextCursor = null) {
  return { orders, nextCursor };
}

function fixture(context) {
  const { OrderHistoryController, ApiError } = loadProduction();
  const calls = { list: [], getById: [] };
  const repository = {
    list(cursor, guard) {
      const request = { cursor, guard, ...deferred() };
      calls.list.push(request);
      return request.promise;
    },
    getById(id, guard) {
      const request = { id, guard, ...deferred() };
      calls.getById.push(request);
      return request.promise;
    },
  };
  const controller = new OrderHistoryController(repository);
  context.after(() => controller.stop());
  return { controller, calls, ApiError };
}

async function ready(setup, response = page([order('first')])) {
  const starting = setup.controller.start();
  setup.calls.list[0].resolve(response);
  await starting;
}

const ids = state => Array.from(state.orders, entry => entry.id);

test('initial read starts once and never eagerly fetches details', async context => {
  const setup = fixture(context);
  const initial = setup.controller.getSnapshot();
  assert.equal(initial.status, 'idle');
  assert.equal(initial, setup.controller.getSnapshot());
  const starting = setup.controller.start();
  assert.equal(setup.controller.start(), starting);
  assert.equal(setup.controller.refresh(), starting);
  assert.equal(setup.calls.list.length, 1);
  assert.equal(setup.calls.list[0].cursor, undefined);
  assert.equal(setup.calls.list[0].guard(), true);
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  setup.calls.list[0].resolve(page());
  await starting;
  assert.equal(setup.controller.getSnapshot().status, 'empty');
  assert.equal(setup.controller.getSnapshot().hasMore, false);
  assert.equal(setup.calls.getById.length, 0);
});

test('initial results are unique and newest first with deterministic date ties', async context => {
  const setup = fixture(context);
  await ready(setup, page([
    order('old', { createdAt: '2026-10-12T10:00:00.000Z' }),
    order('a'), order('z'), order('a'),
  ], 'cursor-a'));
  const state = setup.controller.getSnapshot();
  assert.deepEqual(ids(state), ['z', 'a', 'old']);
  assert.equal(state.status, 'ready');
  assert.equal(state.hasMore, true);
});

test('first read failure has a controlled message and can be retried', async context => {
  const setup = fixture(context);
  const first = setup.controller.start();
  setup.calls.list[0].reject(new Error('secret backend exception'));
  await first;
  assert.equal(setup.controller.getSnapshot().status, 'error');
  assert.match(setup.controller.getSnapshot().errorMessage, /conexión/);
  assert.doesNotMatch(setup.controller.getSnapshot().errorMessage, /secret/);
  const retry = setup.controller.refresh();
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  setup.calls.list[1].resolve(page([order('retried')]));
  await retry;
  assert.deepEqual(ids(setup.controller.getSnapshot()), ['retried']);
  assert.equal(setup.controller.getSnapshot().errorMessage, null);
});

test('refresh replaces the visible pages and allows a fresh pagination traversal', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('first')], 'cursor-a'));
  const more = setup.controller.loadMore();
  setup.calls.list[1].resolve(page([order('older', { createdAt: '2026-10-11T10:00:00.000Z' })]));
  await more;
  const refresh = setup.controller.refresh();
  assert.equal(setup.controller.refresh(), refresh);
  assert.equal(setup.controller.getSnapshot().refreshing, true);
  assert.deepEqual(ids(setup.controller.getSnapshot()), ['first', 'older']);
  setup.calls.list[2].resolve(page([order('new-first')], 'cursor-a'));
  await refresh;
  assert.deepEqual(ids(setup.controller.getSnapshot()), ['new-first']);
  assert.equal(setup.controller.getSnapshot().hasMore, true);
  const moreAgain = setup.controller.loadMore();
  assert.equal(setup.calls.list[3].cursor, 'cursor-a');
  setup.calls.list[3].resolve(page([order('older')]));
  await moreAgain;
  assert.equal(setup.controller.getSnapshot().loadMoreError, null);
});

test('refresh failure retains loaded history and exposes its stale information message', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('first')], 'cursor-a'));
  const refresh = setup.controller.refresh();
  await setup.controller.loadMore();
  assert.equal(setup.calls.list.length, 2);
  setup.calls.list[1].reject(new Error('offline'));
  await refresh;
  const state = setup.controller.getSnapshot();
  assert.equal(state.status, 'ready');
  assert.deepEqual(ids(state), ['first']);
  assert.equal(state.refreshing, false);
  assert.equal(state.hasMore, true);
  assert.match(state.errorMessage, /última información/);
});

test('refresh failure also preserves a successfully loaded empty state', async context => {
  const setup = fixture(context);
  await ready(setup, page());
  const refresh = setup.controller.refresh();
  setup.calls.list[1].reject(new Error('offline'));
  await refresh;
  assert.equal(setup.controller.getSnapshot().status, 'empty');
  assert.match(setup.controller.getSnapshot().errorMessage, /última información/);
});

test('pagination is explicit and repeated presses share one request', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('first')], 'cursor-a'));
  assert.equal(setup.calls.list.length, 1);
  const more = setup.controller.loadMore();
  assert.equal(setup.controller.loadMore(), more);
  assert.equal(setup.calls.list.length, 2);
  assert.equal(setup.calls.list[1].cursor, 'cursor-a');
  assert.equal(setup.controller.getSnapshot().loadingMore, true);
  setup.calls.list[1].resolve(page([order('older', { createdAt: '2026-10-12T10:00:00.000Z' })]));
  await more;
  assert.deepEqual(ids(setup.controller.getSnapshot()), ['first', 'older']);
  assert.equal(setup.controller.getSnapshot().loadingMore, false);
  assert.equal(setup.controller.getSnapshot().hasMore, false);
  await setup.controller.loadMore();
  assert.equal(setup.calls.list.length, 2);
});

test('overlapping page boundaries never duplicate or regress the existing entry', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('first', { status: 'completed' })], 'cursor-a'));
  const more = setup.controller.loadMore();
  setup.calls.list[1].resolve(page([order('first', { status: 'confirmed' }), order('older')], 'cursor-b'));
  await more;
  const state = setup.controller.getSnapshot();
  assert.equal(state.orders.length, 2);
  assert.equal(state.orders.find(entry => entry.id === 'first').status, 'completed');
  assert.equal(state.hasMore, true);
});

test('pagination failure preserves history and retry requests the same cursor', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('first')], 'cursor-a'));
  const more = setup.controller.loadMore();
  setup.calls.list[1].reject(new Error('offline'));
  await more;
  assert.deepEqual(ids(setup.controller.getSnapshot()), ['first']);
  assert.match(setup.controller.getSnapshot().loadMoreError, /cargar más/);
  assert.equal(setup.controller.getSnapshot().hasMore, true);
  const retry = setup.controller.loadMore();
  assert.equal(setup.calls.list[2].cursor, 'cursor-a');
  setup.calls.list[2].resolve(page([order('older')]));
  await retry;
  assert.equal(setup.controller.getSnapshot().loadMoreError, null);
  assert.equal(setup.controller.getSnapshot().hasMore, false);
});

test('a repeated continuation cursor stops the cycle after preserving the returned orders', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('first')], 'cursor-a'));
  const more = setup.controller.loadMore();
  setup.calls.list[1].resolve(page([order('older')], 'cursor-a'));
  await more;
  assert.equal(setup.controller.getSnapshot().orders.length, 2);
  assert.equal(setup.controller.getSnapshot().hasMore, false);
  assert.match(setup.controller.getSnapshot().loadMoreError, /Actualiza/);
  await setup.controller.loadMore();
  assert.equal(setup.calls.list.length, 2);
});

test('a multi-page cursor cycle and empty continuation both stop further requests', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('first')], 'cursor-a'));
  const second = setup.controller.loadMore();
  setup.calls.list[1].resolve(page([order('second')], 'cursor-b'));
  await second;
  const third = setup.controller.loadMore();
  setup.calls.list[2].resolve(page([order('third')], 'cursor-a'));
  await third;
  assert.equal(setup.controller.getSnapshot().hasMore, false);
  const refresh = setup.controller.refresh();
  setup.calls.list[3].resolve(page([], 'cursor-c'));
  await refresh;
  assert.equal(setup.controller.getSnapshot().status, 'empty');
  assert.equal(setup.controller.getSnapshot().hasMore, false);
  assert.match(setup.controller.getSnapshot().loadMoreError, /Actualiza/);
});

test('refresh supersedes pagination and a late page cannot overwrite refreshed history', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('first')], 'cursor-a'));
  const more = setup.controller.loadMore();
  const refresh = setup.controller.refresh();
  assert.equal(setup.calls.list[1].guard(), false);
  assert.equal(setup.calls.list[2].guard(), true);
  setup.calls.list[2].resolve(page([order('fresh')], 'cursor-fresh'));
  await refresh;
  setup.calls.list[1].resolve(page([order('stale')], 'cursor-stale'));
  await more;
  assert.deepEqual(ids(setup.controller.getSnapshot()), ['fresh']);
  const next = setup.controller.loadMore();
  assert.equal(setup.calls.list[3].cursor, 'cursor-fresh');
  setup.calls.list[3].resolve(page());
  await next;
});

test('a superseded pagination failure cannot erase a refresh error or finish its spinner', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('first')], 'cursor-a'));
  const more = setup.controller.loadMore();
  const refresh = setup.controller.refresh();
  setup.calls.list[1].reject(new Error('old request failed'));
  await more;
  assert.equal(setup.controller.getSnapshot().refreshing, true);
  assert.equal(setup.controller.getSnapshot().loadMoreError, null);
  setup.calls.list[2].reject(new Error('new request failed'));
  await refresh;
  assert.equal(setup.controller.getSnapshot().refreshing, false);
  assert.match(setup.controller.getSnapshot().errorMessage, /última información/);
});

test('selecting an order fetches only that detail and repeated loading taps are coalesced', async context => {
  const setup = fixture(context);
  await ready(setup);
  const loading = setup.controller.loadDetail('first');
  assert.equal(setup.controller.loadDetail('first'), loading);
  assert.equal(setup.calls.getById.length, 1);
  assert.equal(setup.calls.getById[0].id, 'first');
  assert.equal(setup.controller.getSnapshot().detailStatus, 'loading');
  setup.calls.getById[0].resolve(detail('first', { status: 'confirmed' }));
  await loading;
  assert.equal(setup.controller.getSnapshot().detailStatus, 'ready');
  assert.equal(setup.controller.getSnapshot().detail.status, 'confirmed');
  assert.deepEqual(ids(setup.controller.getSnapshot()), ['first']);
});

test('switching selected order hides old details immediately and ignores a late earlier response', async context => {
  const setup = fixture(context);
  await ready(setup);
  const first = setup.controller.loadDetail('first');
  const second = setup.controller.loadDetail('second');
  assert.equal(setup.calls.getById[0].guard(), false);
  assert.equal(setup.controller.getSnapshot().selectedId, 'second');
  assert.equal(setup.controller.getSnapshot().detail, null);
  setup.calls.getById[1].resolve(detail('second'));
  await second;
  setup.calls.getById[0].resolve(detail('first'));
  await first;
  assert.equal(setup.controller.getSnapshot().detail.id, 'second');
  assert.equal(setup.controller.getSnapshot().detailStatus, 'ready');
});

test('switching from a ready detail never displays it beneath another selected id', async context => {
  const setup = fixture(context);
  await ready(setup);
  const first = setup.controller.loadDetail('first');
  setup.calls.getById[0].resolve(detail('first'));
  await first;
  const next = setup.controller.loadDetail('second');
  assert.equal(setup.controller.getSnapshot().detail, null);
  assert.equal(setup.controller.getSnapshot().detailStatus, 'loading');
  setup.calls.getById[1].reject(new Error('offline'));
  await next;
  assert.equal(setup.controller.getSnapshot().detail, null);
  assert.equal(setup.controller.getSnapshot().detailStatus, 'error');
});

test('missing orders show not-found while connection failures can be retried independently', async context => {
  const setup = fixture(context);
  await ready(setup);
  const missing = setup.controller.loadDetail('missing');
  setup.calls.getById[0].reject(new setup.ApiError('Not Found', 404));
  await missing;
  assert.equal(setup.controller.getSnapshot().detailStatus, 'not-found');
  assert.match(setup.controller.getSnapshot().detailError, /No encontramos/);
  const offline = setup.controller.loadDetail('first');
  setup.calls.getById[1].reject(new setup.ApiError('offline', null));
  await offline;
  assert.equal(setup.controller.getSnapshot().detailStatus, 'error');
  const retry = setup.controller.loadDetail('first');
  setup.calls.getById[2].resolve(detail('first'));
  await retry;
  assert.equal(setup.controller.getSnapshot().detailStatus, 'ready');
  assert.equal(setup.controller.getSnapshot().detailError, null);
  assert.equal(setup.calls.list.length, 1);
});

test('closing a pending detail invalidates both success and error updates', async context => {
  const setup = fixture(context);
  await ready(setup);
  for (const reject of [false, true]) {
    const loading = setup.controller.loadDetail('first');
    const request = setup.calls.getById.at(-1);
    setup.controller.closeDetail();
    assert.equal(request.guard(), false);
    if (reject) request.reject(new Error('late offline'));
    else request.resolve(detail('first'));
    await loading;
    assert.equal(setup.controller.getSnapshot().detailStatus, 'idle');
    assert.equal(setup.controller.getSnapshot().selectedId, null);
    assert.equal(setup.controller.getSnapshot().detailError, null);
    assert.equal(setup.controller.getSnapshot().detail, null);
  }
});

test('a mismatched detail response fails closed instead of showing another order', async context => {
  const setup = fixture(context);
  await ready(setup);
  const loading = setup.controller.loadDetail('first');
  setup.calls.getById[0].resolve(detail('other-account-order'));
  await loading;
  assert.equal(setup.controller.getSnapshot().detail, null);
  assert.equal(setup.controller.getSnapshot().detailStatus, 'error');
});

test('list and detail requests complete independently', async context => {
  const setup = fixture(context);
  const starting = setup.controller.start();
  const loading = setup.controller.loadDetail('deep-linked');
  setup.calls.getById[0].resolve(detail('deep-linked'));
  await loading;
  assert.equal(setup.controller.getSnapshot().detailStatus, 'ready');
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  setup.calls.list[0].resolve(page());
  await starting;
  assert.equal(setup.controller.getSnapshot().status, 'empty');
  assert.equal(setup.controller.getSnapshot().detail.id, 'deep-linked');
});

test('stop clears account data immediately and late reads cannot restore it', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('private')], 'cursor-a'));
  const refresh = setup.controller.refresh();
  const loading = setup.controller.loadDetail('private');
  setup.controller.stop();
  assert.equal(setup.calls.list[1].guard(), false);
  assert.equal(setup.calls.getById[0].guard(), false);
  assert.deepEqual(ids(setup.controller.getSnapshot()), []);
  assert.equal(setup.controller.getSnapshot().detail, null);
  assert.equal(setup.controller.getSnapshot().status, 'idle');
  setup.calls.list[1].resolve(page([order('late-private')]));
  setup.calls.getById[0].resolve(detail('private'));
  await Promise.all([refresh, loading]);
  assert.deepEqual(ids(setup.controller.getSnapshot()), []);
  assert.equal(setup.controller.getSnapshot().detailStatus, 'idle');
  await Promise.all([setup.controller.refresh(), setup.controller.loadMore(), setup.controller.loadDetail('ignored')]);
  assert.equal(setup.calls.list.length, 2);
  assert.equal(setup.calls.getById.length, 1);
});

test('Strict Mode start-stop-start isolates both initial reads and resumes fresh loading', async context => {
  const setup = fixture(context);
  const oldStart = setup.controller.start();
  setup.controller.stop();
  const newStart = setup.controller.start();
  assert.equal(setup.calls.list.length, 2);
  assert.equal(setup.calls.list[0].guard(), false);
  assert.equal(setup.calls.list[1].guard(), true);
  setup.calls.list[0].reject(new setup.ApiError('old unauthorized', 401));
  await oldStart;
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  setup.calls.list[1].resolve(page([order('fresh-session')]));
  await newStart;
  assert.deepEqual(ids(setup.controller.getSnapshot()), ['fresh-session']);
  assert.equal(setup.controller.getSnapshot().errorMessage, null);
});

test('session rejection clears list and detail and invalidates concurrent responses', async context => {
  const setup = fixture(context);
  await ready(setup, page([order('private')], 'cursor-a'));
  const more = setup.controller.loadMore();
  const loading = setup.controller.loadDetail('private');
  setup.calls.getById[0].reject(new setup.ApiError('Forbidden', 403));
  await loading;
  assert.equal(setup.calls.list[1].guard(), false);
  assert.deepEqual(ids(setup.controller.getSnapshot()), []);
  assert.equal(setup.controller.getSnapshot().detail, null);
  assert.equal(setup.controller.getSnapshot().hasMore, false);
  assert.equal(setup.controller.getSnapshot().loadingMore, false);
  assert.match(setup.controller.getSnapshot().errorMessage, /sesión venció/);
  setup.calls.list[1].resolve(page([order('late-private')]));
  await more;
  assert.deepEqual(ids(setup.controller.getSnapshot()), []);
});

test('unauthorized refresh invalidates selected detail and can recover after reauthentication', async context => {
  const setup = fixture(context);
  await ready(setup);
  const loading = setup.controller.loadDetail('first');
  const refresh = setup.controller.refresh();
  setup.calls.list[1].reject(new setup.ApiError('Unauthorized', 401));
  await refresh;
  assert.equal(setup.calls.getById[0].guard(), false);
  setup.calls.getById[0].resolve(detail('first'));
  await loading;
  assert.equal(setup.controller.getSnapshot().detail, null);
  const retry = setup.controller.refresh();
  setup.calls.list[2].resolve(page([order('allowed')]));
  await retry;
  assert.deepEqual(ids(setup.controller.getSnapshot()), ['allowed']);
  assert.equal(setup.controller.getSnapshot().errorMessage, null);
});

test('subscribers observe changes and unsubscribe stops notifications', async context => {
  const setup = fixture(context);
  let updates = 0;
  const unsubscribe = setup.controller.subscribe(() => { updates += 1; });
  await ready(setup);
  assert.ok(updates > 0);
  const observed = updates;
  unsubscribe();
  const loading = setup.controller.loadDetail('first');
  setup.calls.getById[0].resolve(detail('first'));
  await loading;
  assert.equal(updates, observed);
});
