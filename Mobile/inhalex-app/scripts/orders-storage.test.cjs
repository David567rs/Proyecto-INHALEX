/* global __dirname */
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/features/orders/data/storage/ChunkedOrderAttemptStore.ts');
const loaded = new Module(filename, module);
loaded.require = importPath => { throw new Error(`Unexpected runtime import: ${importPath}`); };
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { ChunkedOrderAttemptStore } = loaded.exports;

function storageFixture() {
  const values = new Map();
  const calls = [];
  let beforeSet = async () => {};
  let beforeRemove = async () => {};
  let revision = 0;
  const storage = {
    async get(key) { calls.push(['get', key]); return values.get(key) ?? null; },
    async set(key, value) {
      calls.push(['set', key, value]);
      await beforeSet(key, value);
      // The native adapter crosses a UTF-8 boundary, which cannot preserve isolated surrogate halves.
      values.set(key, Buffer.from(value, 'utf8').toString('utf8'));
    },
    async remove(key) { calls.push(['remove', key]); await beforeRemove(key); values.delete(key); },
  };
  return {
    values, calls, storage,
    owner(userId = 'customer_a') { return new ChunkedOrderAttemptStore(userId, storage, () => `revision_${++revision}`); },
    failSet(handler) { beforeSet = handler; },
    failRemove(handler) { beforeRemove = handler; },
  };
}

function attempt(key = 'saved-order-key-123456', note = '') {
  return {
    key,
    input: {
      customerName: 'Cliente de prueba', customerEmail: 'fixture@example.test', customerPhone: '5512345678',
      shippingAddressId: 'aaaaaaaaaaaaaaaaaaaaaaaa', previewSignature: 'b'.repeat(64),
      items: [{ productId: 'cccccccccccccccccccccccc', quantity: 2 }],
    },
    address: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', references: note },
    preview: { signature: 'b'.repeat(64), items: [{ productId: 'cccccccccccccccccccccccc', quantity: 2, productName: 'Menta' }], subtotal: 120, totalItems: 2, currency: 'MXN' },
  };
}

function manifestFor(fixture, owner = 'customer_a') {
  return JSON.parse(fixture.values.get(`inhalex.order.${owner}`));
}

test('an absent manifest represents no pending order without scanning unrelated storage', async () => {
  const fixture = storageFixture();
  const store = fixture.owner();
  fixture.values.set('inhalex.order.customer_a.orphan.0', 'private stale chunk');
  assert.equal(await store.load(), null);
  assert.deepEqual(fixture.calls, [['get', 'inhalex.order.customer_a']]);
});

test('a saved attempt roundtrips all fields and publishes its manifest only after every chunk', async () => {
  const fixture = storageFixture();
  const store = fixture.owner();
  const value = { ...attempt(undefined, 'Referencias '.repeat(200)), confirmedOrder: { orderId: 'order_fixture', reference: 'INH-001', status: 'pending_review' } };
  await store.save(value);
  const writes = fixture.calls.filter(([method]) => method === 'set');
  const manifest = manifestFor(fixture);
  assert.ok(manifest.count > 1);
  assert.equal(writes.length, manifest.count + 1);
  assert.equal(writes.at(-1)[1], 'inhalex.order.customer_a');
  assert.deepEqual(await store.load(), value);
  const reloadedInstance = fixture.owner();
  assert.deepEqual(await reloadedInstance.load(), value);
});

test('a replacement save keeps the previous attempt readable until its new manifest commits', async () => {
  const fixture = storageFixture();
  const store = fixture.owner();
  const first = attempt('first-persisted-key-123456', 'Initial address');
  const second = attempt('second-persisted-key-123456', 'Replacement address '.repeat(80));
  await store.save(first);
  const oldManifest = manifestFor(fixture);
  let inspected = 0;
  fixture.failSet(async key => {
    if (key.startsWith('inhalex.order.customer_a.')) {
      assert.deepEqual(await store.load(), first);
      inspected += 1;
    }
  });
  await store.save(second);
  assert.ok(inspected > 1);
  assert.deepEqual(await store.load(), second);
  for (let i = 0; i < oldManifest.count; i += 1) assert.equal(fixture.values.has(`inhalex.order.customer_a.${oldManifest.revision}.${i}`), false);
});

test('failed chunk writes leave the previous manifest and attempt recoverable', async () => {
  const fixture = storageFixture();
  const store = fixture.owner();
  const first = attempt('first-persisted-key-123456');
  await store.save(first);
  const previousManifest = fixture.values.get('inhalex.order.customer_a');
  fixture.failSet(async key => { if (key.endsWith('revision_2.1')) throw new Error('Disk full'); });
  await assert.rejects(store.save(attempt('new-not-committed-key-123456', 'Large field '.repeat(150))), /Disk full/);
  assert.equal(fixture.values.get('inhalex.order.customer_a'), previousManifest);
  assert.deepEqual(await store.load(), first);
});

test('a failed manifest write leaves newly written parts orphaned and never replays them', async () => {
  const fixture = storageFixture();
  const store = fixture.owner();
  const first = attempt('first-persisted-key-123456');
  await store.save(first);
  fixture.failSet(async key => { if (key === 'inhalex.order.customer_a') throw new Error('Manifest write failed'); });
  await assert.rejects(store.save(attempt('new-not-committed-key-123456')), /Manifest write failed/);
  assert.ok([...fixture.values.keys()].some(key => key.includes('revision_2')));
  assert.deepEqual(await store.load(), first);
});

test('missing chunks and corrupted JSON fail closed instead of treating a pending order as absent', async () => {
  for (const corrupt of ['missing', 'invalid-json']) {
    const fixture = storageFixture();
    const store = fixture.owner();
    await store.save(attempt());
    const manifest = manifestFor(fixture);
    const key = `inhalex.order.customer_a.${manifest.revision}.0`;
    if (corrupt === 'missing') fixture.values.delete(key);
    else fixture.values.set(key, '{broken JSON');
    await assert.rejects(store.load());
    assert.ok(fixture.values.has('inhalex.order.customer_a'));
  }
});

test('malformed manifests fail closed before reading any chunks', async () => {
  for (const manifest of ['{broken', 'null', '{}', JSON.stringify({ revision: '../invalid', count: 1 }), JSON.stringify({ revision: 'valid', count: 0 }), JSON.stringify({ revision: 'valid', count: 1001 }), JSON.stringify({ revision: 'valid', count: 1.5 }), JSON.stringify({ revision: 'valid', count: '1' })]) {
    const fixture = storageFixture();
    const store = fixture.owner();
    fixture.values.set('inhalex.order.customer_a', manifest);
    await assert.rejects(store.load());
    assert.deepEqual(fixture.calls, [['get', 'inhalex.order.customer_a']]);
  }
});

test('clear removes the manifest before parts and prevents recovery while orphan cleanup runs', async () => {
  const fixture = storageFixture();
  const store = fixture.owner();
  await store.save(attempt(undefined, 'Line '.repeat(200)));
  const previous = manifestFor(fixture);
  fixture.calls.length = 0;
  fixture.failRemove(async key => {
    if (key !== 'inhalex.order.customer_a') assert.equal(await store.load(), null);
  });
  await store.clear();
  const removals = fixture.calls.filter(([method]) => method === 'remove');
  assert.equal(removals[0][1], 'inhalex.order.customer_a');
  assert.equal(removals.length, previous.count + 1);
  assert.equal(fixture.values.size, 0);
  assert.equal(await store.load(), null);
  await store.clear();
  assert.equal(await store.load(), null);
});

test('failed manifest removal preserves the saved intent and does not remove its chunks', async () => {
  const fixture = storageFixture();
  const store = fixture.owner();
  const value = attempt();
  await store.save(value);
  fixture.calls.length = 0;
  fixture.failRemove(async key => { if (key === 'inhalex.order.customer_a') throw new Error('Storage locked'); });
  await assert.rejects(store.clear(), /Storage locked/);
  assert.equal(fixture.calls.filter(([method]) => method === 'remove').length, 1);
  assert.deepEqual(await store.load(), value);
});

test('per-user manifests and chunks remain isolated across save and clear operations', async () => {
  const fixture = storageFixture();
  const alice = fixture.owner('customer_a');
  const bob = fixture.owner('customer_b');
  const first = attempt('alice-attempt-key-123456');
  const second = attempt('bob-attempt-key-123456');
  await alice.save(first);
  await bob.save(second);
  assert.deepEqual(await alice.load(), first);
  assert.deepEqual(await bob.load(), second);
  await alice.clear();
  assert.equal(await alice.load(), null);
  assert.deepEqual(await bob.load(), second);
  assert.ok([...fixture.values.keys()].every(key => key.startsWith('inhalex.order.customer_b')));
});

test('orphan cleanup failure cannot invalidate a newly committed save or cleared manifest', async () => {
  const fixture = storageFixture();
  const store = fixture.owner();
  await store.save(attempt('old-attempt-key-123456'));
  fixture.failRemove(async key => { if (key !== 'inhalex.order.customer_a') throw new Error('Cleanup unavailable'); });
  const current = attempt('new-attempt-key-123456');
  await store.save(current);
  assert.deepEqual(await store.load(), current);
  assert.ok([...fixture.values.keys()].some(key => key.includes('revision_1')));
  await store.clear();
  assert.equal(await store.load(), null);
  assert.ok(fixture.values.size > 0);
});

test('Unicode supplementary characters survive chunk boundaries and every value fits 1800 UTF-8 bytes', async () => {
  const fixture = storageFixture();
  const store = fixture.owner();
  // A long leading string exercises many boundaries, including a surrogate pair at offset 449.
  const value = { key: `${'x'.repeat(441)}🌿${'🛍️🌱é'.repeat(1000)}`, input: {}, preview: {}, address: {} };
  await store.save(value);
  assert.deepEqual(await store.load(), value);
  const chunks = fixture.calls.filter(([method, key]) => method === 'set' && key !== 'inhalex.order.customer_a');
  assert.ok(chunks.length > 2);
  for (const [, , chunk] of chunks) {
    assert.ok(Buffer.byteLength(chunk, 'utf8') <= 1800);
    assert.equal(chunk, Buffer.from(chunk, 'utf8').toString('utf8'));
  }
});

test('invalid storage owners, revisions and oversized attempts never write a partial intent', async () => {
  const fixture = storageFixture();
  for (const owner of ['', '../other', 'customer.a', 'x'.repeat(129)]) assert.throws(() => fixture.owner(owner), /Invalid order owner/);
  for (const revision of ['', '../other', 'x'.repeat(101)]) {
    const store = new ChunkedOrderAttemptStore('customer_a', fixture.storage, () => revision);
    await assert.rejects(store.save(attempt()), /Invalid order revision/);
  }
  await assert.rejects(fixture.owner().save(attempt(undefined, 'x'.repeat(450001))), /storage limit/);
  assert.equal(fixture.calls.filter(([method]) => method === 'set').length, 0);
  assert.equal(fixture.values.size, 0);
});
