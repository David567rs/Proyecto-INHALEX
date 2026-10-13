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
const { ProfileApiAdapter } = load('src/features/profile/data/adapters/ProfileApiAdapter.ts');
const { HttpProfileRepository } = load('src/features/profile/data/repositories/HttpProfileRepository.ts');
const { mapProfile } = load('src/features/profile/data/mappers/profileMapper.ts');
const { emptyProfileInput, profileInputFromUser, normalizeProfileInput, validateProfileInput } = load('src/features/profile/domain/entities/Profile.ts');
const userId = '69a7d21b350f57ff952f6e82';
const validInput = { firstName: 'María José', lastName: 'Pérez-Núñez', phone: '5512345678' };
function profile(patch = {}) {
  return { _id: userId, name: 'María José Pérez-Núñez', ...validInput,
    email: 'maria@example.test', role: 'user', status: 'active', ...patch };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { resolve, promise };
}
function setup(request = async () => profile()) {
  let token = 'fixture-first-token';
  let reads = 0;
  const calls = [];
  const session = { getAccessToken: async () => { reads += 1; return token; } };
  const adapter = new ProfileApiAdapter({ request: async (endpoint, options) => {
    calls.push({ endpoint, options });
    return request(endpoint, options);
  } }, session);
  return { repository: new HttpProfileRepository(adapter), adapter, session, calls,
    setToken(value) { token = value; }, get reads() { return reads; } };
}

test('GET and PATCH use only the authenticated profile endpoint with a fresh token each time', async () => {
  const fixture = setup();
  const result = await fixture.repository.get();
  fixture.setToken('fixture-next-token');
  await fixture.repository.update(validInput);
  assert.equal(result.id, userId);
  assert.equal(fixture.reads, 2);
  assert.deepEqual(fixture.calls, [
    { endpoint: '/auth/me', options: { method: 'GET', token: 'fixture-first-token' } },
    { endpoint: '/auth/me', options: { method: 'PATCH', body: validInput, token: 'fixture-next-token' } },
  ]);
});

test('updates normalize the three editable fields and never forward privilege or identity changes', async () => {
  const fixture = setup();
  await fixture.repository.update({ firstName: '  María   José ', lastName: ' Pérez-Núñez  ', phone: ' 5512345678 ',
    id: 'another-user', email: 'changed@example.test', password: 'fixture-password', role: 'admin', status: 'inactive', name: 'Override' });
  assert.deepEqual(fixture.calls[0].options.body, validInput);
});

test('the transport adapter also whitelists body fields and snapshots before credential lookup', async () => {
  const fixture = setup();
  const pending = deferred();
  fixture.session.getAccessToken = () => pending.promise;
  const input = { ...validInput, role: 'admin' };
  const result = fixture.adapter.update(input);
  input.firstName = 'Modified';
  input.phone = '0000000000';
  pending.resolve('fixture-token');
  await result;
  assert.deepEqual(fixture.calls[0].options.body, validInput);
});

test('invalid required values fail before reading tokens or contacting the API', async () => {
  const fixture = setup();
  for (const input of [undefined, null, {}, { ...validInput, firstName: '' }, { ...validInput, lastName: 123 },
    { ...validInput, phone: 5512345678 }, { ...validInput, role: 'admin', firstName: '---' }]) {
    await assert.rejects(fixture.repository.update(input), error => error instanceof ApiError && error.status === 400);
  }
  assert.equal(fixture.reads, 0);
  assert.equal(fixture.calls.length, 0);
});

test('names accept Spanish accents, hyphens and apostrophes, with normalized whitespace', () => {
  for (const firstName of ['María José', 'ÁÉÍÓÚáéíóúÑñÜü', 'Ana-María', "O'Neil"]) {
    assert.deepEqual(validateProfileInput({ ...validInput, firstName }), {});
  }
  const dirty = { firstName: ' María\t José  ', lastName: 'Pérez\n Núñez', phone: ' 5512345678 ' };
  assert.deepEqual(normalizeProfileInput(dirty), { firstName: 'María José', lastName: 'Pérez Núñez', phone: '5512345678' });
  assert.equal(dirty.firstName, ' María\t José  ');
});

test('name bounds, unsupported characters and punctuation-only names are rejected', () => {
  for (const field of ['firstName', 'lastName']) {
    for (const value of ['', 'A', 'A'.repeat(51), " -' ", 'Ana2', 'Ana<script>', 'Ana_Elena', 'Ana😀']) {
      assert.ok(validateProfileInput({ ...validInput, [field]: value })[field], `${field}: ${value}`);
    }
    assert.equal(validateProfileInput({ ...validInput, [field]: 'Ab' })[field], undefined);
    assert.equal(validateProfileInput({ ...validInput, [field]: 'A'.repeat(50) })[field], undefined);
  }
});

test('full name length includes the separating space and cannot exceed 100 characters', () => {
  assert.deepEqual(validateProfileInput({ ...validInput, firstName: 'A'.repeat(50), lastName: 'B'.repeat(49) }), {});
  assert.ok(validateProfileInput({ ...validInput, firstName: 'A'.repeat(50), lastName: 'B'.repeat(50) }).lastName);
});

test('phone preserves leading zeroes, accepts 10 to 15 digits and never removes interior signs or spaces', () => {
  for (const phone of ['0012345678', '123456789012345', ' 5512345678 ']) {
    assert.equal(validateProfileInput({ ...validInput, phone }).phone, undefined);
  }
  for (const phone of ['123456789', '1234567890123456', '+525512345678', '55 12345678', '55-12345678', '５５１２３４５６７８']) {
    assert.ok(validateProfileInput({ ...validInput, phone }).phone);
  }
});

test('legacy users keep their display name but editable names remain empty until explicitly provided', () => {
  const legacy = mapProfile(profile({ firstName: undefined, lastName: undefined, phone: undefined, name: 'Nombre compuesto sin desglosar' }));
  assert.equal(legacy.name, 'Nombre compuesto sin desglosar');
  assert.deepEqual(profileInputFromUser(legacy), emptyProfileInput());
  assert.deepEqual(profileInputFromUser(mapProfile(profile())), validInput);
});

test('the profile mapper strips secrets, address data and unknown properties', () => {
  const result = mapProfile(profile({ _id: userId.toUpperCase(), id: userId, role: 'admin', passwordHash: 'private',
    shippingAddresses: ['private'], alexaLinkedAt: 'private', accessToken: 'private',
    createdAt: '2026-10-12T18:00:00.000Z', updatedAt: '2026-10-13T18:00:00.000Z' }));
  assert.deepEqual(result, { id: userId, name: 'María José Pérez-Núñez', ...validInput,
    email: 'maria@example.test', role: 'admin', status: 'active',
    createdAt: '2026-10-12T18:00:00.000Z', updatedAt: '2026-10-13T18:00:00.000Z' });
});

test('invalid response identities and malformed active profiles fail rather than replacing user data', () => {
  for (const value of [null, undefined, [], 'profile', {}]) assert.throws(() => mapProfile(value), /perfil/);
  for (const patch of [{ _id: 'not-an-id' }, { _id: null }, { id: '69a7d21b350f57ff952f6e81' }, { name: ' ' },
    { email: 'invalid' }, { email: 123 }, { role: 'owner' }, { role: undefined }, { status: 'unknown' }, { status: undefined },
    { firstName: [] }, { lastName: {} }, { phone: 5512345678 }, { createdAt: 'invalid' }, { updatedAt: '2026-02-30T18:00:00.000Z' }]) {
    assert.throws(() => mapProfile(profile(patch)), error => error instanceof ApiError && error.status === null);
  }
  assert.equal(mapProfile({ ...profile(), _id: undefined, id: userId }).id, userId);
});

test('inactive profiles force an authentication error for both reads and writes', async () => {
  const fixture = setup(async () => profile({ status: 'inactive' }));
  await assert.rejects(fixture.repository.get(), error => error.status === 401);
  await assert.rejects(fixture.repository.update(validInput), error => error.status === 401);
});

test('missing credentials and inactive operations never contact the API', async () => {
  const fixture = setup();
  for (const token of [null, '', ' ']) {
    fixture.setToken(token);
    await assert.rejects(fixture.repository.get(), error => error.status === 401);
    await assert.rejects(fixture.repository.update(validInput), error => error.status === 401);
  }
  const reads = fixture.reads;
  await assert.rejects(fixture.repository.get(() => false), error => error.status === 401);
  await assert.rejects(fixture.repository.update(validInput, () => false), error => error.status === 401);
  assert.equal(fixture.reads, reads);
  assert.equal(fixture.calls.length, 0);
});

for (const method of ['get', 'update']) {
  test(`${method}: changing accounts during token lookup prevents a request with another account token`, async () => {
    const fixture = setup();
    const pending = deferred();
    let current = true;
    fixture.session.getAccessToken = () => pending.promise;
    const result = method === 'get' ? fixture.repository.get(() => current) : fixture.repository.update(validInput, () => current);
    current = false;
    pending.resolve('fixture-another-account-token');
    await assert.rejects(result, error => error.status === 401);
    assert.equal(fixture.calls.length, 0);
  });

  test(`${method}: a response arriving after logout cannot repopulate the active profile`, async () => {
    const pending = deferred();
    const fixture = setup(() => pending.promise);
    let current = true;
    const result = method === 'get' ? fixture.repository.get(() => current) : fixture.repository.update(validInput, () => current);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(fixture.calls.length, 1);
    current = false;
    pending.resolve(profile());
    await assert.rejects(result, error => error.status === 401);
  });
}

test('network, authorization and storage errors propagate without being mistaken for successful updates', async () => {
  for (const failure of [new ApiError('Unauthorized', 401), new ApiError('Forbidden', 403),
    new ApiError('Server failure', 500), new ApiError('Connection unavailable')]) {
    const fixture = setup(async () => { throw failure; });
    await assert.rejects(fixture.repository.get(), error => error === failure);
    await assert.rejects(fixture.repository.update(validInput), error => error === failure);
  }
  const fixture = setup();
  const failure = new Error('Storage unavailable');
  fixture.session.getAccessToken = async () => { throw failure; };
  await assert.rejects(fixture.repository.get(), error => error === failure);
  await assert.rejects(fixture.repository.update(validInput), error => error === failure);
  assert.equal(fixture.calls.length, 0);
});
