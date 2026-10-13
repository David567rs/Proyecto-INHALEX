/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const USER_ID = '68ed00000000000000000001';
const OTHER_ID = '68ed00000000000000000002';

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
    ...load(path.join(projectRoot, 'src/features/profile/presentation/viewModels/ProfileController.ts')),
    ...load(path.join(projectRoot, 'src/core/network/ApiError.ts')),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function user(overrides = {}) {
  return {
    id: USER_ID, name: 'David Resendez', firstName: 'David', lastName: 'Resendez',
    email: 'david@example.test', phone: '5512345678', role: 'user', status: 'active', ...overrides,
  };
}

function fixture(context, expectedUserId = USER_ID) {
  const { ProfileController, ApiError } = loadProduction();
  const calls = [];
  const accepted = [];
  const repository = {
    get(guard) {
      const request = { kind: 'read', guard, ...deferred() };
      calls.push(request);
      return request.promise;
    },
    update(input, guard) {
      const request = { kind: 'save', input, guard, ...deferred() };
      calls.push(request);
      return request.promise;
    },
  };
  const controller = new ProfileController(repository, expectedUserId, profile => accepted.push(profile));
  context.after(() => controller.stop());
  return { controller, calls, accepted, ApiError };
}

async function ready(setup, profile = user()) {
  const started = setup.controller.start();
  setup.calls.at(-1).resolve(profile);
  await started;
}

function edit(setup, firstName = 'Diana') {
  setup.controller.setField('firstName', firstName);
}

test('startup loads once and duplicate reads share one promise', async context => {
  const setup = fixture(context);
  assert.equal(setup.controller.getSnapshot().status, 'idle');
  const loading = setup.controller.start();
  assert.equal(setup.controller.start(), loading);
  assert.equal(setup.controller.refresh(), loading);
  assert.equal(setup.calls.length, 1);
  assert.equal(setup.controller.getSnapshot().status, 'loading');
  setup.calls[0].resolve(user());
  await loading;
  assert.equal(setup.controller.getSnapshot().profile.id, USER_ID);
  assert.equal(setup.controller.getSnapshot().form.firstName, 'David');
  assert.equal(setup.controller.getSnapshot().dirty, false);
  assert.equal(setup.controller.getSnapshot().status, 'ready');
  assert.equal(setup.accepted.length, 1);
});

test('idle actions cannot create an unauthenticated request or draft', async context => {
  const setup = fixture(context);
  await setup.controller.refresh();
  await setup.controller.save();
  setup.controller.setField('firstName', 'Diana');
  setup.controller.discard();
  assert.equal(setup.calls.length, 0);
  assert.equal(setup.controller.getSnapshot().form.firstName, '');
});

test('stable snapshots only notify subscribed listeners while subscribed', async context => {
  const setup = fixture(context);
  assert.equal(setup.controller.getSnapshot(), setup.controller.getSnapshot());
  let changes = 0;
  const unsubscribe = setup.controller.subscribe(() => { changes += 1; });
  await ready(setup);
  assert.ok(changes > 0);
  unsubscribe();
  const before = changes;
  edit(setup);
  assert.equal(changes, before);
});

test('initial read failure supports a successful retry', async context => {
  const setup = fixture(context);
  const loading = setup.controller.start();
  setup.calls[0].reject(new setup.ApiError('Connection failed'));
  await loading;
  assert.equal(setup.controller.getSnapshot().status, 'error');
  assert.equal(setup.controller.getSnapshot().profile, null);
  const retry = setup.controller.refresh();
  setup.calls[1].resolve(user());
  await retry;
  assert.equal(setup.controller.getSnapshot().status, 'ready');
  assert.equal(setup.controller.getSnapshot().errorMessage, null);
});

test('refresh failure retains last successful personal data', async context => {
  const setup = fixture(context);
  await ready(setup);
  const refresh = setup.controller.refresh();
  assert.equal(setup.controller.getSnapshot().refreshing, true);
  setup.calls[1].reject(new Error('offline'));
  await refresh;
  const result = setup.controller.getSnapshot();
  assert.equal(result.profile.name, 'David Resendez');
  assert.equal(result.form.phone, '5512345678');
  assert.equal(result.status, 'ready');
  assert.equal(result.refreshing, false);
  assert.match(result.errorMessage, /última información/);
});

test('editing produces a dirty draft and blocks background refresh', async context => {
  const setup = fixture(context);
  await ready(setup);
  edit(setup);
  await setup.controller.refresh();
  assert.equal(setup.calls.length, 1);
  assert.equal(setup.controller.getSnapshot().dirty, true);
  assert.equal(setup.controller.getSnapshot().profile.firstName, 'David');
});

test('editing invalidates a refresh already in flight', async context => {
  const setup = fixture(context);
  await ready(setup);
  const refreshing = setup.controller.refresh();
  edit(setup);
  await refreshing;
  assert.equal(setup.calls[1].guard(), false);
  setup.calls[1].resolve(user({ firstName: 'Otro', name: 'Otro Resendez' }));
  await Promise.resolve();
  assert.equal(setup.controller.getSnapshot().form.firstName, 'Diana');
  assert.equal(setup.controller.getSnapshot().profile.firstName, 'David');
  assert.equal(setup.accepted.length, 1);
});

test('normalized whitespace alone does not require a write', async context => {
  const setup = fixture(context);
  await ready(setup);
  setup.controller.setField('firstName', '  David  ');
  assert.equal(setup.controller.getSnapshot().dirty, false);
  await setup.controller.save();
  assert.equal(setup.calls.length, 1);
});

test('invalid form shows field errors without sending a request', async context => {
  const setup = fixture(context);
  await ready(setup);
  setup.controller.setField('firstName', '');
  setup.controller.setField('lastName', 'R1');
  setup.controller.setField('phone', 'abc');
  await setup.controller.save();
  const result = setup.controller.getSnapshot();
  assert.ok(result.fieldErrors.firstName);
  assert.ok(result.fieldErrors.lastName);
  assert.ok(result.fieldErrors.phone);
  assert.equal(result.saving, false);
  assert.equal(setup.calls.length, 1);
});

test('correcting one field clears only its validation error', async context => {
  const setup = fixture(context);
  await ready(setup);
  setup.controller.setField('firstName', '');
  setup.controller.setField('phone', 'abc');
  await setup.controller.save();
  setup.controller.setField('firstName', 'Diana');
  assert.equal(setup.controller.getSnapshot().fieldErrors.firstName, undefined);
  assert.ok(setup.controller.getSnapshot().fieldErrors.phone);
});

test('save coalesces double taps and locks edits, discard and refresh until confirmed', async context => {
  const setup = fixture(context);
  await ready(setup);
  edit(setup, '  Diana  María ');
  const saved = setup.controller.save();
  assert.equal(setup.controller.save(), saved);
  setup.controller.setField('lastName', 'Cambio');
  setup.controller.discard();
  await setup.controller.refresh();
  assert.equal(setup.calls.length, 2);
  assert.equal(setup.calls[1].input.firstName, 'Diana María');
  assert.equal(setup.controller.getSnapshot().form.lastName, 'Resendez');
  assert.equal(setup.controller.getSnapshot().successMessage, null);
  assert.equal(setup.controller.getSnapshot().profile.firstName, 'David');
  setup.calls[1].resolve(user({ firstName: 'Diana María', name: 'Diana María Resendez' }));
  await saved;
  const result = setup.controller.getSnapshot();
  assert.equal(result.form.firstName, 'Diana María');
  assert.equal(result.profile.firstName, 'Diana María');
  assert.equal(result.dirty, false);
  assert.equal(result.saving, false);
  assert.ok(result.successMessage);
  assert.equal(setup.accepted.length, 2);
});

test('confirmed normalized data becomes the new discard baseline', async context => {
  const setup = fixture(context);
  await ready(setup);
  edit(setup);
  const saved = setup.controller.save();
  setup.calls[1].resolve(user({ firstName: 'Diana', name: 'Diana Resendez' }));
  await saved;
  edit(setup, 'María');
  assert.equal(setup.controller.getSnapshot().successMessage, null);
  setup.controller.discard();
  assert.equal(setup.controller.getSnapshot().form.firstName, 'Diana');
  assert.equal(setup.controller.getSnapshot().dirty, false);
});

test('network save failure keeps the exact draft without automatic replay', async context => {
  const setup = fixture(context);
  await ready(setup);
  edit(setup, ' Diana ');
  const saved = setup.controller.save();
  setup.calls[1].reject(new setup.ApiError('timeout'));
  await saved;
  const result = setup.controller.getSnapshot();
  assert.equal(result.form.firstName, ' Diana ');
  assert.equal(result.profile.firstName, 'David');
  assert.equal(result.dirty, true);
  assert.equal(result.saving, false);
  assert.equal(result.successMessage, null);
  assert.match(result.errorMessage, /confirmar/);
  await setup.controller.refresh();
  assert.equal(setup.calls.length, 2);
  const retry = setup.controller.save();
  assert.equal(setup.calls.length, 3);
  assert.equal(setup.calls[2].input.firstName, 'Diana');
  setup.calls[2].resolve(user({ firstName: 'Diana', name: 'Diana Resendez' }));
  await retry;
  assert.ok(setup.controller.getSnapshot().successMessage);
});

test('server validation failure preserves draft and avoids displaying raw server details', async context => {
  const setup = fixture(context);
  await ready(setup);
  edit(setup);
  const saved = setup.controller.save();
  setup.calls[1].reject(new setup.ApiError('internal private details', 400));
  await saved;
  assert.equal(setup.controller.getSnapshot().form.firstName, 'Diana');
  assert.match(setup.controller.getSnapshot().errorMessage, /Revisa los campos/);
  assert.doesNotMatch(setup.controller.getSnapshot().errorMessage, /private/);
});

test('a successful HTTP response with unchanged fields does not claim a confirmed save', async context => {
  const setup = fixture(context);
  await ready(setup);
  edit(setup);
  const saved = setup.controller.save();
  setup.calls[1].resolve(user());
  await saved;
  assert.equal(setup.controller.getSnapshot().form.firstName, 'Diana');
  assert.equal(setup.controller.getSnapshot().dirty, true);
  assert.equal(setup.controller.getSnapshot().successMessage, null);
  assert.match(setup.controller.getSnapshot().errorMessage, /confirmar/);
  assert.equal(setup.accepted.length, 1);
});

test('discard clears failed draft and validation then permits a fresh GET', async context => {
  const setup = fixture(context);
  await ready(setup);
  edit(setup, '');
  await setup.controller.save();
  setup.controller.discard();
  assert.equal(setup.controller.getSnapshot().form.firstName, 'David');
  assert.equal(Object.keys(setup.controller.getSnapshot().fieldErrors).length, 0);
  assert.equal(setup.controller.getSnapshot().dirty, false);
  const refreshed = setup.controller.refresh();
  setup.calls[1].resolve(user({ phone: '5598765432' }));
  await refreshed;
  assert.equal(setup.controller.getSnapshot().form.phone, '5598765432');
});

test('forbidden fields cannot be injected into the draft or save payload', async context => {
  const setup = fixture(context);
  await ready(setup);
  setup.controller.setField('email', 'other@example.test');
  setup.controller.setField('role', 'admin');
  setup.controller.setField('__proto__', 'bad');
  assert.equal(setup.controller.getSnapshot().dirty, false);
  edit(setup);
  const saved = setup.controller.save();
  assert.deepEqual(Object.keys(setup.calls[1].input).sort(), ['firstName', 'lastName', 'phone']);
  setup.calls[1].resolve(user({ firstName: 'Diana' }));
  await saved;
});

for (const status of [401, 403]) {
  test(`HTTP ${status} on refresh clears all personal data`, async context => {
    const setup = fixture(context);
    await ready(setup);
    const refreshed = setup.controller.refresh();
    setup.calls[1].reject(new setup.ApiError('denied', status));
    await refreshed;
    const result = setup.controller.getSnapshot();
    assert.equal(result.profile, null);
    assert.equal(result.form.firstName, '');
    assert.equal(result.form.phone, '');
    assert.equal(result.status, 'error');
    assert.match(result.errorMessage, /sesión/);
  });

  test(`HTTP ${status} on save clears draft and never reports success`, async context => {
    const setup = fixture(context);
    await ready(setup);
    edit(setup);
    const saved = setup.controller.save();
    setup.calls[1].reject(new setup.ApiError('denied', status));
    await saved;
    const result = setup.controller.getSnapshot();
    assert.equal(result.profile, null);
    assert.equal(result.form.firstName, '');
    assert.equal(result.dirty, false);
    assert.equal(result.saving, false);
    assert.equal(result.successMessage, null);
    assert.equal(setup.accepted.length, 1);
  });
}

test('read for a different account is rejected before display or auth sync', async context => {
  const setup = fixture(context);
  await ready(setup, user({ id: OTHER_ID }));
  assert.equal(setup.controller.getSnapshot().profile, null);
  assert.equal(setup.controller.getSnapshot().form.firstName, '');
  assert.equal(setup.accepted.length, 0);
  assert.match(setup.controller.getSnapshot().errorMessage, /sesión/);
});

test('save response for a different account clears current personal data', async context => {
  const setup = fixture(context);
  await ready(setup);
  edit(setup);
  const saved = setup.controller.save();
  setup.calls[1].resolve(user({ id: OTHER_ID, firstName: 'Diana' }));
  await saved;
  assert.equal(setup.controller.getSnapshot().profile, null);
  assert.equal(setup.controller.getSnapshot().form.firstName, '');
  assert.equal(setup.accepted.length, 1);
});

test('an empty authenticated identity never accepts personal data', async context => {
  const setup = fixture(context, '');
  await ready(setup);
  assert.equal(setup.controller.getSnapshot().profile, null);
  assert.equal(setup.accepted.length, 0);
});

test('legacy missing names remain empty without inventing name components', async context => {
  const setup = fixture(context);
  await ready(setup, user({ firstName: undefined, lastName: undefined, phone: undefined }));
  const result = setup.controller.getSnapshot();
  assert.equal(result.profile.name, 'David Resendez');
  assert.equal(result.form.firstName, '');
  assert.equal(result.form.lastName, '');
  assert.equal(result.form.phone, '');
});

for (const operation of ['read', 'save']) {
  test(`stop invalidates pending ${operation} and prevents later account updates`, async context => {
    const setup = fixture(context);
    let pending;
    if (operation === 'read') pending = setup.controller.start();
    else {
      await ready(setup);
      edit(setup);
      pending = setup.controller.save();
    }
    const call = setup.calls.at(-1);
    const acceptedBefore = setup.accepted.length;
    setup.controller.stop();
    await pending;
    assert.equal(call.guard(), false);
    call.resolve(user({ firstName: 'Diana' }));
    await Promise.resolve();
    assert.equal(setup.controller.getSnapshot().status, 'idle');
    assert.equal(setup.controller.getSnapshot().profile, null);
    assert.equal(setup.controller.getSnapshot().form.firstName, '');
    assert.equal(setup.accepted.length, acceptedBefore);
  });
}

test('a Strict Mode restart ignores the previous lifecycle response', async context => {
  const setup = fixture(context);
  const old = setup.controller.start();
  setup.controller.stop();
  await old;
  const current = setup.controller.start();
  setup.calls[0].resolve(user({ firstName: 'Anterior' }));
  await Promise.resolve();
  assert.equal(setup.controller.getSnapshot().profile, null);
  assert.equal(setup.calls[0].guard(), false);
  assert.equal(setup.calls[1].guard(), true);
  setup.calls[1].resolve(user());
  await current;
  assert.equal(setup.controller.getSnapshot().form.firstName, 'David');
  assert.equal(setup.accepted.length, 1);
});

test('stale failures after a restart cannot erase new personal data', async context => {
  const setup = fixture(context);
  const old = setup.controller.start();
  setup.controller.stop();
  await old;
  await ready(setup);
  setup.calls[0].reject(new setup.ApiError('expired old token', 401));
  await Promise.resolve();
  assert.equal(setup.controller.getSnapshot().profile.id, USER_ID);
  assert.equal(setup.controller.getSnapshot().errorMessage, null);
});
