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
    ...load(path.join(projectRoot, 'src/features/addresses/presentation/viewModels/AddressesController.ts')),
    ...load(path.join(projectRoot, 'src/core/network/ApiError.ts')),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function input(overrides = {}) {
  return {
    label: 'Casa', recipientName: 'David Resendez', phone: '5512345678',
    street: 'Reforma', exteriorNumber: '12', interiorNumber: '', neighborhood: 'Centro',
    municipality: 'Cuauhtémoc', state: 'Ciudad de México', postalCode: '06000', references: '',
    isDefault: false, ...overrides,
  };
}

function address(id, overrides = {}) {
  return { ...input(), id, ...overrides };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture(context) {
  const { AddressesController, ApiError } = loadProduction();
  const calls = { list: [], create: [], update: [], remove: [] };
  const order = [];
  const repository = {
    list(guard) {
      const request = { guard, ...deferred() };
      calls.list.push(request);
      order.push('list');
      return request.promise;
    },
    create(value, guard) {
      const request = { input: value, guard, ...deferred() };
      calls.create.push(request);
      order.push('create');
      return request.promise;
    },
    update(id, value, guard) {
      const request = { id, input: value, guard, ...deferred() };
      calls.update.push(request);
      order.push('update');
      return request.promise;
    },
    remove(id, guard) {
      const request = { id, guard, ...deferred() };
      calls.remove.push(request);
      order.push('remove');
      return request.promise;
    },
  };
  const controller = new AddressesController(repository);
  context.after(() => controller.stop());
  return { controller, repository, calls, order, ApiError };
}

async function ready(setup, addresses = []) {
  const starting = setup.controller.start();
  await flush();
  setup.calls.list[0].resolve(addresses);
  await starting;
}

test('initial load is idempotent and snapshots stay stable between updates', async context => {
  const setup = fixture(context);
  const first = setup.controller.start();
  assert.equal(setup.controller.start(), first);
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  assert.equal(setup.controller.getSnapshot().canMutate, false);
  assert.equal(setup.controller.getSnapshot(), setup.controller.getSnapshot());
  await flush();
  assert.equal(setup.calls.list.length, 1);
  setup.calls.list[0].resolve([]);
  await first;
  assert.equal(setup.controller.getSnapshot().status, 'empty');
  assert.equal(setup.controller.getSnapshot().selectedId, null);
  assert.equal(setup.controller.getSnapshot().canMutate, true);
});

test('initial selection chooses principal first and otherwise the first saved address', async context => {
  for (const values of [[address('first'), address('principal', { isDefault: true })], [address('first'), address('second')]]) {
    const setup = fixture(context);
    await ready(setup, values);
    assert.equal(setup.controller.getSnapshot().selectedId, values.find(value => value.isDefault)?.id ?? 'first');
    assert.equal(setup.controller.getSnapshot().status, 'ready');
  }
});

test('selection is local, survives refresh and stays independent from principal', async context => {
  const setup = fixture(context);
  await ready(setup, [address('home', { isDefault: true }), address('work')]);
  setup.controller.select('work');
  setup.controller.select('missing');
  assert.equal(setup.controller.getSnapshot().selectedId, 'work');
  assert.equal(setup.calls.update.length, 0);
  const refresh = setup.controller.refresh();
  await flush();
  setup.calls.list[1].resolve([address('home', { isDefault: true }), address('work', { label: 'Oficina' })]);
  await refresh;
  assert.equal(setup.controller.getSnapshot().selectedId, 'work');
  assert.equal(setup.controller.getSnapshot().addresses[0].isDefault, true);
  const nextRefresh = setup.controller.refresh();
  await flush();
  setup.calls.list[2].resolve([address('home', { isDefault: true })]);
  await nextRefresh;
  assert.equal(setup.controller.getSnapshot().selectedId, 'home');
});

test('create waits for confirmation, sends normalized text and selects the new address', async context => {
  const setup = fixture(context);
  await ready(setup, [address('home', { isDefault: true })]);
  const saving = setup.controller.save(input({ label: '  Oficina  ', postalCode: ' 01234 ', references: '  Timbre azul  ' }));
  assert.equal(setup.controller.getSnapshot().pending, true);
  assert.equal(setup.controller.getSnapshot().canMutate, false);
  assert.equal(setup.controller.getSnapshot().addresses.length, 1);
  await flush();
  assert.equal(setup.calls.create[0].input.label, 'Oficina');
  assert.equal(setup.calls.create[0].input.postalCode, '01234');
  assert.equal(setup.calls.create[0].input.references, 'Timbre azul');
  setup.calls.create[0].resolve([address('home', { isDefault: true }), address('work', { label: 'Oficina' })]);
  assert.equal(await saving, true);
  assert.equal(setup.controller.getSnapshot().selectedId, 'work');
  assert.equal(setup.controller.getSnapshot().addresses[0].isDefault, true);
  assert.equal(setup.controller.getSnapshot().feedback, 'Dirección guardada');
  assert.equal(setup.controller.getSnapshot().pending, false);
  assert.equal(setup.controller.getSnapshot().canMutate, true);
  setup.controller.clearFeedback();
  assert.equal(setup.controller.getSnapshot().feedback, null);
});

test('editing and principal updates use the server full list without optimistic principal changes', async context => {
  const setup = fixture(context);
  await ready(setup, [address('home', { isDefault: true }), address('work', { references: 'Viejas' })]);
  const saving = setup.controller.save(input({ label: 'Oficina', references: '' }), 'work');
  await flush();
  assert.equal(setup.calls.update[0].id, 'work');
  assert.equal(setup.calls.update[0].input.references, '');
  setup.calls.update[0].resolve([address('home', { isDefault: true }), address('work', { label: 'Oficina' })]);
  assert.equal(await saving, true);
  assert.equal(setup.controller.getSnapshot().selectedId, 'work');
  setup.controller.select('home');
  const makingDefault = setup.controller.makeDefault('work');
  await flush();
  assert.deepEqual(JSON.parse(JSON.stringify(setup.calls.update[1].input)), { isDefault: true });
  assert.equal(setup.controller.getSnapshot().addresses[0].isDefault, true);
  setup.calls.update[1].resolve([address('home'), address('work', { isDefault: true })]);
  assert.equal(await makingDefault, true);
  assert.equal(setup.controller.getSnapshot().selectedId, 'home');
  assert.equal(setup.controller.getSnapshot().feedback, 'Dirección principal actualizada');
  assert.equal(await setup.controller.makeDefault('work'), false);
  assert.equal(setup.calls.update.length, 2);
});

test('deleting a selected address uses surviving principal and deleting the last leaves no selection', async context => {
  const setup = fixture(context);
  await ready(setup, [address('home', { isDefault: true }), address('work')]);
  setup.controller.select('work');
  const deleting = setup.controller.remove('work');
  await flush();
  setup.calls.remove[0].resolve([address('home', { isDefault: true })]);
  assert.equal(await deleting, true);
  assert.equal(setup.controller.getSnapshot().selectedId, 'home');
  const deletingLast = setup.controller.remove('home');
  await flush();
  setup.calls.remove[1].resolve([]);
  assert.equal(await deletingLast, true);
  assert.equal(setup.controller.getSnapshot().selectedId, null);
  assert.equal(setup.controller.getSnapshot().status, 'empty');
  assert.equal(setup.controller.getSnapshot().feedback, 'Dirección eliminada');
});

test('required values, phone and postal code validate before any request', async context => {
  const setup = fixture(context);
  await ready(setup);
  for (const invalid of [input({ street: '' }), input({ phone: '+52 5512345678' }), input({ postalCode: '1234' }), input({ recipientName: 'A' })]) {
    assert.equal(await setup.controller.save(invalid), false);
    assert.match(setup.controller.getSnapshot().actionError, /Revisa los campos/);
    assert.equal(setup.controller.getSnapshot().pending, false);
    assert.equal(setup.controller.getSnapshot().canMutate, true);
  }
  assert.equal(setup.calls.create.length, 0);
});

test('the five-address limit blocks create while an existing address can still be edited', async context => {
  const setup = fixture(context);
  const full = Array.from({ length: 5 }, (_, index) => address(`a${index}`, { isDefault: index === 0 }));
  await ready(setup, full);
  assert.equal(await setup.controller.save(input()), false);
  assert.match(setup.controller.getSnapshot().actionError, /hasta 5 direcciones/);
  assert.equal(setup.calls.create.length, 0);
  const editing = setup.controller.save(input({ label: 'Nuevo nombre' }), 'a1');
  await flush();
  setup.calls.update[0].resolve(full.map(value => value.id === 'a1' ? { ...value, label: 'Nuevo nombre' } : value));
  assert.equal(await editing, true);
});

test('an existing principal cannot be silently unset by a full form save', async context => {
  const setup = fixture(context);
  await ready(setup, [address('home', { isDefault: true })]);
  assert.equal(await setup.controller.save(input({ isDefault: false }), 'home'), false);
  assert.match(setup.controller.getSnapshot().actionError, /elige otra dirección/);
  assert.equal(setup.calls.update.length, 0);
  assert.equal(setup.controller.getSnapshot().canMutate, true);
});

test('duplicate taps and concurrent different writes are rejected until the pending change settles', async context => {
  const setup = fixture(context);
  await ready(setup, [address('home', { isDefault: true })]);
  const saving = setup.controller.save(input());
  assert.equal(await setup.controller.save(input()), false);
  assert.equal(await setup.controller.remove('home'), false);
  assert.equal(await setup.controller.makeDefault('home'), false);
  await flush();
  assert.equal(setup.calls.create.length, 1);
  assert.equal(setup.calls.remove.length, 0);
  setup.calls.create[0].resolve([address('home', { isDefault: true }), address('work')]);
  await saving;
  assert.equal(setup.controller.getSnapshot().pending, false);
});

test('refresh blocks writes until the authoritative list has returned', async context => {
  const setup = fixture(context);
  await ready(setup);
  const refresh = setup.controller.refresh();
  assert.equal(setup.controller.getSnapshot().refreshing, true);
  assert.equal(setup.controller.getSnapshot().canMutate, false);
  assert.equal(await setup.controller.save(input()), false);
  await flush();
  setup.calls.list[1].resolve([address('server')]);
  await refresh;
  assert.equal(setup.controller.getSnapshot().canMutate, true);
  assert.equal(setup.controller.getSnapshot().refreshing, false);
});

test('a refresh requested during a write waits and cannot overwrite its result with an older read', async context => {
  const setup = fixture(context);
  await ready(setup);
  const saving = setup.controller.save(input());
  await flush();
  const refresh = setup.controller.refresh();
  await flush();
  assert.equal(setup.calls.list.length, 1);
  setup.calls.create[0].resolve([address('created', { isDefault: true })]);
  assert.equal(await saving, true);
  await flush();
  assert.deepEqual(setup.order, ['list', 'create', 'list']);
  assert.equal(setup.controller.getSnapshot().addresses[0].id, 'created');
  assert.equal(setup.controller.getSnapshot().canMutate, false);
  setup.calls.list[1].resolve([address('created', { isDefault: true, label: 'Nombre del servidor' })]);
  await refresh;
  assert.equal(setup.controller.getSnapshot().addresses[0].label, 'Nombre del servidor');
  assert.equal(setup.controller.getSnapshot().canMutate, true);
});

test('network and 5xx mutation failures preserve the list and require explicit GET reconciliation', async context => {
  for (const kind of ['network', 'server']) {
    const setup = fixture(context);
    const before = [address('home', { isDefault: true })];
    await ready(setup, before);
    const saving = setup.controller.save(input());
    await flush();
    setup.calls.create[0].reject(kind === 'network' ? new Error('Lost response after server saved') : new setup.ApiError('Internal stack', 503));
    assert.equal(await saving, false);
    assert.equal(setup.controller.getSnapshot().addresses, before);
    assert.equal(setup.controller.getSnapshot().canMutate, false);
    assert.match(setup.controller.getSnapshot().actionError, /Actualiza tus direcciones/);
    assert.equal(setup.calls.list.length, 1);
    assert.equal(await setup.controller.save(input()), false);
    assert.equal(await setup.controller.remove('home'), false);
    const refresh = setup.controller.refresh();
    await flush();
    setup.calls.list[1].resolve([address('home', { isDefault: true }), address('already-created')]);
    await refresh;
    assert.equal(setup.controller.getSnapshot().canMutate, true);
    assert.equal(setup.controller.getSnapshot().actionError, null);
    assert.equal(setup.calls.create.length, 1);
  }
});

test('malformed mutation success is treated as uncertain and cannot publish a false success', async context => {
  for (const malformed of [null, [{ id: 'broken' }], [address('duplicate'), address('duplicate')]]) {
    const setup = fixture(context);
    const before = [address('home', { isDefault: true })];
    await ready(setup, before);
    const changing = setup.controller.remove('home');
    await flush();
    setup.calls.remove[0].resolve(malformed);
    assert.equal(await changing, false);
    assert.equal(setup.controller.getSnapshot().addresses, before);
    assert.equal(setup.controller.getSnapshot().feedback, null);
    assert.equal(setup.controller.getSnapshot().canMutate, false);
  }
});

test('an unsuccessful reconciliation keeps all writes blocked and leaves the draft retry to the user', async context => {
  const setup = fixture(context);
  await ready(setup);
  const saving = setup.controller.save(input());
  await flush();
  setup.calls.create[0].reject(new Error('offline'));
  await saving;
  const refresh = setup.controller.refresh();
  await flush();
  setup.calls.list[1].reject(new Error('still offline'));
  await refresh;
  assert.equal(setup.controller.getSnapshot().canMutate, false);
  assert.match(setup.controller.getSnapshot().errorMessage, /Revisa tu conexión/);
  assert.equal(await setup.controller.save(input()), false);
  assert.equal(setup.calls.create.length, 1);
});

test('a known 400 rejection shows controlled validation copy while remaining available to correct data', async context => {
  const setup = fixture(context);
  await ready(setup);
  const saving = setup.controller.save(input());
  await flush();
  setup.calls.create[0].reject(new setup.ApiError('Raw DTO internals', 400));
  assert.equal(await saving, false);
  assert.equal(setup.controller.getSnapshot().actionError, 'No pudimos guardar el cambio. Revisa los datos de la dirección.');
  assert.equal(setup.controller.getSnapshot().canMutate, true);
  assert.equal(setup.controller.getSnapshot().pending, false);
});

test('401 and 403 responses from reads or writes disable further writes and hide private errors', async context => {
  for (const status of [401, 403]) {
    const setup = fixture(context);
    await ready(setup, [address('home', { isDefault: true })]);
    const refreshing = setup.controller.refresh();
    await flush();
    setup.calls.list[1].reject(new setup.ApiError('Private auth metadata', status));
    await refreshing;
    assert.equal(setup.controller.getSnapshot().errorMessage, 'Tu sesión venció. Inicia sesión de nuevo.');
    assert.equal(setup.controller.getSnapshot().canMutate, false);
    const recovered = setup.controller.refresh();
    await flush();
    setup.calls.list[2].resolve([address('home', { isDefault: true })]);
    await recovered;
    const deleting = setup.controller.remove('home');
    await flush();
    setup.calls.remove[0].reject(new setup.ApiError('Private auth metadata', status));
    await deleting;
    assert.equal(setup.controller.getSnapshot().actionError, 'Tu sesión venció. Inicia sesión de nuevo.');
    assert.equal(setup.controller.getSnapshot().canMutate, false);
    assert.equal(await setup.controller.save(input()), false);
  }
});

test('a stale 404 reconciles once, updates selection and avoids retrying the missing write', async context => {
  const setup = fixture(context);
  await ready(setup, [address('home', { isDefault: true }), address('work')]);
  setup.controller.select('work');
  const deleting = setup.controller.remove('work');
  await flush();
  setup.calls.remove[0].reject(new setup.ApiError('Not found', 404));
  await flush();
  assert.equal(setup.calls.list.length, 2);
  assert.equal(setup.controller.getSnapshot().pending, true);
  setup.calls.list[1].resolve([address('home', { isDefault: true })]);
  assert.equal(await deleting, false);
  assert.equal(setup.controller.getSnapshot().selectedId, 'home');
  assert.equal(setup.controller.getSnapshot().canMutate, true);
  assert.match(setup.controller.getSnapshot().actionError, /Actualizamos tus direcciones/);
  assert.equal(setup.calls.remove.length, 1);
});

test('a failed stale-address reconciliation remains locked', async context => {
  const setup = fixture(context);
  await ready(setup, [address('home', { isDefault: true })]);
  const changing = setup.controller.makeDefault('missing');
  assert.equal(await changing, false);
  assert.equal(setup.calls.update.length, 0);
  const deleting = setup.controller.remove('home');
  await flush();
  setup.calls.remove[0].reject(new setup.ApiError('Not found', 404));
  await flush();
  setup.calls.list[1].reject(new Error('offline'));
  assert.equal(await deleting, false);
  assert.equal(setup.controller.getSnapshot().canMutate, false);
  assert.match(setup.controller.getSnapshot().actionError, /Actualiza tus direcciones/);
});

test('initial read errors block saves and allow a refresh retry', async context => {
  const setup = fixture(context);
  const starting = setup.controller.start();
  await flush();
  setup.calls.list[0].reject(new Error('offline'));
  await starting;
  assert.equal(setup.controller.getSnapshot().status, 'error');
  assert.equal(setup.controller.getSnapshot().canMutate, false);
  assert.equal(await setup.controller.save(input()), false);
  const refresh = setup.controller.refresh();
  await flush();
  setup.calls.list[1].resolve([]);
  await refresh;
  assert.equal(setup.controller.getSnapshot().status, 'empty');
  assert.equal(setup.controller.getSnapshot().canMutate, true);
});

test('normal refresh failure preserves confirmed rows, selection and mutation availability', async context => {
  const setup = fixture(context);
  const before = [address('home', { isDefault: true }), address('work')];
  await ready(setup, before);
  setup.controller.select('work');
  const refresh = setup.controller.refresh();
  await flush();
  setup.calls.list[1].reject(new Error('offline'));
  await refresh;
  assert.equal(setup.controller.getSnapshot().addresses, before);
  assert.equal(setup.controller.getSnapshot().selectedId, 'work');
  assert.equal(setup.controller.getSnapshot().status, 'ready');
  assert.equal(setup.controller.getSnapshot().canMutate, true);
});

test('overlapping refresh requests run in sequence and the refreshing flag covers both', async context => {
  const setup = fixture(context);
  await ready(setup);
  const first = setup.controller.refresh();
  const second = setup.controller.refresh();
  await flush();
  assert.equal(setup.calls.list.length, 2);
  setup.calls.list[1].resolve([address('first')]);
  await first;
  await flush();
  assert.equal(setup.controller.getSnapshot().refreshing, true);
  assert.equal(setup.controller.getSnapshot().canMutate, false);
  setup.calls.list[2].resolve([address('latest')]);
  await second;
  assert.equal(setup.controller.getSnapshot().addresses[0].id, 'latest');
  assert.equal(setup.controller.getSnapshot().refreshing, false);
  assert.equal(setup.controller.getSnapshot().canMutate, true);
});

test('stop invalidates guards, ignores late success/error and makes all actions inert', async context => {
  for (const fail of [false, true]) {
    const setup = fixture(context);
    await ready(setup);
    const saving = setup.controller.save(input());
    await flush();
    const guard = setup.calls.create[0].guard;
    assert.equal(guard(), true);
    setup.controller.stop();
    assert.equal(guard(), false);
    assert.equal(setup.calls.list[0].guard(), false);
    const stopped = setup.controller.getSnapshot();
    let updates = 0;
    const unsubscribe = setup.controller.subscribe(() => { updates += 1; });
    if (fail) setup.calls.create[0].reject(new Error('late failure'));
    else setup.calls.create[0].resolve([address('old-user-private')]);
    assert.equal(await saving, false);
    assert.equal(setup.controller.getSnapshot(), stopped);
    assert.equal(updates, 0);
    await setup.controller.refresh();
    await setup.controller.save(input());
    setup.controller.select('old-user-private');
    assert.equal(setup.calls.list.length, 1);
    assert.equal(setup.calls.create.length, 1);
    unsubscribe();
  }
});

test('Strict Mode restart waits for a sent mutation then reloads without taking its late snapshot', async context => {
  const setup = fixture(context);
  await ready(setup);
  const saving = setup.controller.save(input());
  await flush();
  const queuedRefresh = setup.controller.refresh();
  setup.controller.stop();
  const restarted = setup.controller.start();
  await flush();
  assert.equal(setup.calls.list.length, 1);
  setup.calls.create[0].resolve([address('created')]);
  assert.equal(await saving, false);
  await queuedRefresh;
  await flush();
  assert.equal(setup.calls.list.length, 2);
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  assert.equal(setup.controller.getSnapshot().addresses.length, 0);
  setup.calls.list[1].resolve([address('created')]);
  await restarted;
  assert.equal(setup.controller.getSnapshot().selectedId, 'created');
  assert.equal(setup.controller.getSnapshot().canMutate, true);
  assert.equal(setup.controller.getSnapshot().feedback, null);
});

test('validation and selection also remain inert after a healthy controller has stopped', async context => {
  const setup = fixture(context);
  await ready(setup, [address('home', { isDefault: true }), address('work')]);
  setup.controller.stop();
  const stopped = setup.controller.getSnapshot();
  assert.equal(await setup.controller.save(input({ label: '' })), false);
  assert.equal(await setup.controller.remove('home'), false);
  assert.equal(await setup.controller.makeDefault('work'), false);
  setup.controller.select('work');
  assert.equal(setup.controller.getSnapshot(), stopped);
  assert.equal(setup.calls.create.length, 0);
  assert.equal(setup.calls.update.length, 0);
  assert.equal(setup.calls.remove.length, 0);
});

test('operation guards prevent network dispatch if a session stops during asynchronous token lookup', async context => {
  const { AddressesController } = loadProduction();
  const token = deferred();
  let networkRequests = 0;
  const controller = new AddressesController({
    async list(guard) {
      await token.promise;
      if (!guard()) throw new Error('Session changed before dispatch');
      networkRequests += 1;
      return [];
    },
  });
  context.after(() => controller.stop());
  const starting = controller.start();
  await flush();
  controller.stop();
  token.resolve('new-account-token');
  await starting;
  assert.equal(networkRequests, 0);
});

test('another account controller never receives the previous account late addresses', async context => {
  const oldAccount = fixture(context);
  await ready(oldAccount);
  const saving = oldAccount.controller.save(input());
  await flush();
  oldAccount.controller.stop();
  const currentAccount = fixture(context);
  await ready(currentAccount, [address('new-account-home', { isDefault: true })]);
  oldAccount.calls.create[0].resolve([address('old-account-private')]);
  await saving;
  assert.equal(currentAccount.controller.getSnapshot().selectedId, 'new-account-home');
  assert.equal(currentAccount.controller.getSnapshot().addresses[0].id, 'new-account-home');
  assert.equal(currentAccount.controller.getSnapshot().feedback, null);
});
