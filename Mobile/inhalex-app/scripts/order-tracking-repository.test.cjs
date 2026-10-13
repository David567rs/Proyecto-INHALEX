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
const { OrderTrackingApiAdapter } = load('src/features/orderTracking/data/adapters/OrderTrackingApiAdapter.ts');
const { HttpOrderTrackingRepository } = load('src/features/orderTracking/data/repositories/HttpOrderTrackingRepository.ts');
const { mapOrderTracking } = load('src/features/orderTracking/data/mappers/orderTrackingMapper.ts');
const orderId = '69a7d21b350f57ff952f6e82';
function tracking(patch = {}) {
  return { id: orderId, reference: 'PED-20261013-DEMO01', status: 'pending_review', currency: 'MXN',
    totalItems: 2, subtotal: 160.5, createdAt: '2026-10-13T18:00:00.000Z',
    confirmedAt: null, cancelledAt: null, completedAt: null, ...patch };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { resolve, promise };
}
function setup(request = async () => tracking()) {
  let token = 'fixture-first-token';
  let reads = 0;
  const calls = [];
  const session = { getAccessToken: async () => { reads += 1; return token; } };
  const adapter = new OrderTrackingApiAdapter({ request: async (endpoint, options) => {
    calls.push({ endpoint, options });
    return request(endpoint, options);
  } }, session);
  return { repository: new HttpOrderTrackingRepository(adapter), session, calls,
    setToken(value) { token = value; }, get reads() { return reads; } };
}

test('tracking uses the customer endpoint and a fresh bearer token for each GET', async () => {
  const fixture = setup();
  await fixture.repository.getById(orderId.toUpperCase());
  fixture.setToken('fixture-next-token');
  await fixture.repository.getById(orderId);
  assert.equal(fixture.reads, 2);
  assert.deepEqual(fixture.calls, [
    { endpoint: `/orders/me/${orderId}/tracking`, options: { method: 'GET', token: 'fixture-first-token' } },
    { endpoint: `/orders/me/${orderId}/tracking`, options: { method: 'GET', token: 'fixture-next-token' } },
  ]);
});

test('invalid IDs fail before accessing credentials or contacting the API', async () => {
  const fixture = setup();
  for (const id of ['', 'not-an-id', `${orderId}/tracking`, ` ${orderId}`, null, 7, {}]) {
    await assert.rejects(fixture.repository.getById(id), error => error instanceof ApiError && error.status === 404);
  }
  assert.equal(fixture.reads, 0);
  assert.equal(fixture.calls.length, 0);
});

test('missing tokens and already inactive operations cannot send requests', async () => {
  const fixture = setup();
  for (const token of [null, '', ' ']) {
    fixture.setToken(token);
    await assert.rejects(fixture.repository.getById(orderId), error => error instanceof ApiError && error.status === 401);
  }
  const previousReads = fixture.reads;
  await assert.rejects(fixture.repository.getById(orderId, () => false), error => error.status === 401);
  assert.equal(fixture.reads, previousReads);
  assert.equal(fixture.calls.length, 0);
});

test('a session change during token retrieval prevents a request with another account token', async () => {
  const fixture = setup();
  const pending = deferred();
  let current = true;
  fixture.session.getAccessToken = () => pending.promise;
  const result = fixture.repository.getById(orderId, () => current);
  current = false;
  pending.resolve('fixture-other-user-token');
  await assert.rejects(result, error => error.status === 401);
  assert.equal(fixture.calls.length, 0);
});

test('a late response is discarded when the active session or request changes', async () => {
  const pending = deferred();
  const fixture = setup(() => pending.promise);
  let current = true;
  const result = fixture.repository.getById(orderId, () => current);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.calls.length, 1);
  current = false;
  pending.resolve(tracking());
  await assert.rejects(result, error => error.status === 401);
});

test('token storage failures propagate without contacting the API', async () => {
  const fixture = setup();
  const failure = new Error('Storage unavailable');
  fixture.session.getAccessToken = async () => { throw failure; };
  await assert.rejects(fixture.repository.getById(orderId), error => error === failure);
  assert.equal(fixture.calls.length, 0);
});

test('tracking keeps actual recorded events and strips internal properties', () => {
  const events = { confirmedAt: '2026-10-13T19:00:00.000Z', completedAt: '2026-10-14T18:00:00.000Z' };
  const result = mapOrderTracking(tracking({ ...events, id: orderId.toUpperCase(), currency: 'mxn', reference: '  PED-DEMO  ',
    status: 'completed', customerUserId: 'private', statusNotes: ['private'], idempotencyKey: 'private', updatedAt: 'private' }));
  assert.deepEqual(result, tracking({ ...events, reference: 'PED-DEMO', status: 'completed' }));
});

test('legacy missing timestamps remain null without guessing dates from current status', () => {
  for (const status of ['pending_review', 'confirmed', 'cancelled', 'completed']) {
    assert.deepEqual(mapOrderTracking(tracking({ status })), tracking({ status }));
  }
  const cancelled = tracking({ status: 'cancelled', confirmedAt: '2026-10-13T19:00:00.000Z', cancelledAt: '2026-10-13T20:00:00.000Z' });
  assert.deepEqual(mapOrderTracking(cancelled), cancelled);
});

test('unknown or invented fulfillment states are rejected', () => {
  for (const status of ['draft', 'shipped', 'delivered', 'unknown', null, undefined]) {
    assert.throws(() => mapOrderTracking(tracking({ status })), /seguimiento/);
  }
});

test('event dates must be null or valid canonical UTC ISO timestamps', () => {
  for (const key of ['confirmedAt', 'cancelledAt', 'completedAt']) {
    for (const value of [undefined, '', 'yesterday', '2026-10-13', '2026-02-30T18:00:00.000Z',
      '2026-10-13T18:00:00Z', '2026-10-13T18:00:00.000+00:00', '2026-10-13T18:00:00.000', 0, {}, []]) {
      assert.throws(() => mapOrderTracking(tracking({ [key]: value })), /seguimiento/);
    }
  }
});

test('malformed summaries reject the whole tracking response', () => {
  for (const value of [null, undefined, [], {}, 'invalid']) assert.throws(() => mapOrderTracking(value), /seguimiento/);
  for (const patch of [{ id: '' }, { reference: ' ' }, { currency: 'pesos' }, { totalItems: 0 }, { totalItems: 1.5 },
    { totalItems: Number.MAX_SAFE_INTEGER + 1 }, { subtotal: -1 }, { subtotal: Infinity }, { subtotal: NaN },
    { subtotal: '160.5' }, { createdAt: '2026-02-30T18:00:00.000Z' }, { createdAt: null }]) {
    assert.throws(() => mapOrderTracking(tracking(patch)), /seguimiento/);
  }
});

test('a valid response for a different order cannot replace the selected order', async () => {
  await assert.rejects(setup(async () => tracking({ id: '69a7d21b350f57ff952f6e81' })).repository.getById(orderId), /pedido seleccionado/);
});

test('404 stays distinguishable from connectivity and authorization errors', async () => {
  const original = new ApiError('Not Found', 404);
  await assert.rejects(setup(async () => { throw original; }).repository.getById(orderId), error =>
    error instanceof ApiError && error.status === 404 && error.message === 'No encontramos este pedido en tu cuenta.' && error.cause === original);
  for (const failure of [new ApiError('Unauthorized', 401), new ApiError('Forbidden', 403), new ApiError('Internal failure', 500), new ApiError('Timeout')]) {
    await assert.rejects(setup(async () => { throw failure; }).repository.getById(orderId), error => error === failure);
  }
});
