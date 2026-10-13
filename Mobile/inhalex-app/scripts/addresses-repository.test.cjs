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

const { AddressApiAdapter } = load('src/features/addresses/data/adapters/AddressApiAdapter.ts');
const { HttpAddressRepository } = load('src/features/addresses/data/repositories/HttpAddressRepository.ts');
const { mapAddresses } = load('src/features/addresses/data/mappers/addressMapper.ts');
const { MAX_ADDRESSES, emptyAddressInput, validateAddressInput } = load('src/features/addresses/domain/entities/ShippingAddress.ts');
const { ApiError } = load('src/core/network/ApiError.ts');

const addressId = '69a7d21b350f57ff952f6e8f';
function input(overrides = {}) {
  return {
    label: 'Casa', recipientName: 'Persona Demo', phone: '5555555555',
    street: 'Calle Principal', exteriorNumber: '10', interiorNumber: '',
    neighborhood: 'Centro', municipality: 'Cuauhtémoc', state: 'Ciudad de México',
    postalCode: '06000', references: '', isDefault: false, ...overrides,
  };
}
function address(overrides = {}) {
  return { id: addressId, ...input(), interiorNumber: undefined, references: undefined, isDefault: true, ...overrides };
}
function setup(request = async () => [address()]) {
  let token = 'fixture-first-token';
  let reads = 0;
  const calls = [];
  const session = { getAccessToken: async () => { reads += 1; return token; } };
  const adapter = new AddressApiAdapter({
    request: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return request(endpoint, options);
    },
  }, session);
  return { adapter, repository: new HttpAddressRepository(adapter), session, calls,
    setToken(value) { token = value; }, get reads() { return reads; } };
}

test('address drafts are independent and blanks report every required field', () => {
  assert.equal(MAX_ADDRESSES, 5);
  const first = emptyAddressInput();
  const second = emptyAddressInput();
  first.label = 'Casa';
  assert.equal(second.label, '');
  const result = validateAddressInput(second);
  assert.equal(result.isValid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'label', 'recipientName', 'phone', 'street', 'exteriorNumber',
    'neighborhood', 'municipality', 'state', 'postalCode',
  ].sort());
});

test('valid input trims whitespace, keeps postal leading zeroes and supports absent optional text', () => {
  const draft = input(Object.fromEntries(Object.entries(input()).map(([key, value]) => [key, typeof value === 'string' ? `  ${value}  ` : value])));
  draft.interiorNumber = undefined;
  draft.references = undefined;
  const result = validateAddressInput(draft);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.value, input());
  assert.equal(result.value.postalCode, '06000');
  assert.equal(draft.label, '  Casa  ');
});

test('minimum and maximum text lengths follow the address DTO', () => {
  const fields = {
    label: [2, 40], recipientName: [2, 120], street: [2, 120], exteriorNumber: [1, 20],
    interiorNumber: [0, 20], neighborhood: [2, 100], municipality: [2, 100],
    state: [2, 100], references: [0, 300],
  };
  for (const [field, [minimum, maximum]] of Object.entries(fields)) {
    for (const length of [minimum, maximum]) assert.equal(validateAddressInput(input({ [field]: 'x'.repeat(length) })).isValid, true, `${field}: ${length}`);
    assert.ok(validateAddressInput(input({ [field]: 'x'.repeat(maximum + 1) })).errors[field]);
    if (minimum) assert.ok(validateAddressInput(input({ [field]: 'x'.repeat(minimum - 1) })).errors[field]);
    for (const bad of [null, 123, false, {}, []]) assert.ok(validateAddressInput(input({ [field]: bad })).errors[field]);
  }
});

test('phone and postal validation rejects signs, spaces, fractions and numeric coercion', () => {
  for (const phone of ['555555555', '5'.repeat(16), '+525555555555', '555 555 5555', '555555555x', '5555555555.0', 5555555555, null]) {
    assert.ok(validateAddressInput(input({ phone })).errors.phone);
  }
  for (const phone of ['5'.repeat(10), '5'.repeat(15)]) assert.equal(validateAddressInput(input({ phone })).isValid, true);
  for (const postalCode of ['0600', '060000', '06 00', '0600x', 6000, null]) assert.ok(validateAddressInput(input({ postalCode })).errors.postalCode);
  for (const isDefault of ['true', 0, null]) assert.ok(validateAddressInput(input({ isDefault })).errors.isDefault);
  assert.equal(validateAddressInput(null).isValid, false);
});

test('all requests use a fresh token, encoded IDs and whitelisted body fields', async () => {
  const fixture = setup();
  const reference = 'office/?from=#perfil';
  await fixture.adapter.list();
  fixture.setToken('fixture-next-token');
  await fixture.adapter.create({ ...input(), id: 'forbidden', ownerId: 'forbidden' });
  await fixture.adapter.update(reference, { references: '', isDefault: true, id: 'forbidden', street: undefined });
  await fixture.adapter.remove(reference);
  assert.equal(fixture.reads, 4);
  assert.deepEqual(fixture.calls, [
    { endpoint: '/addresses', options: { method: 'GET', token: 'fixture-first-token' } },
    { endpoint: '/addresses', options: { method: 'POST', body: input(), token: 'fixture-next-token' } },
    { endpoint: '/addresses/office%2F%3Ffrom%3D%23perfil', options: { method: 'PATCH', body: { references: '', isDefault: true }, token: 'fixture-next-token' } },
    { endpoint: '/addresses/office%2F%3Ffrom%3D%23perfil', options: { method: 'DELETE', token: 'fixture-next-token' } },
  ]);
});

test('missing session or storage failure cannot send an unauthenticated request', async () => {
  const fixture = setup();
  for (const token of [null, '', '  ']) {
    fixture.setToken(token);
    for (const operation of [() => fixture.repository.list(), () => fixture.repository.create(input()), () => fixture.repository.update(addressId, { isDefault: true }), () => fixture.repository.remove(addressId)]) {
      await assert.rejects(operation(), error => error instanceof ApiError && error.status === 401);
    }
  }
  const failure = new Error('Storage unavailable');
  fixture.session.getAccessToken = async () => { throw failure; };
  await assert.rejects(fixture.repository.list(), error => error === failure);
  assert.equal(fixture.calls.length, 0);
});

test('session guards run before and after the token read for every operation', async () => {
  const stale = setup();
  await assert.rejects(stale.repository.list(() => false), error => error.status === 401);
  assert.equal(stale.reads, 0);
  for (const action of ['list', 'create', 'update', 'remove']) {
    const fixture = setup();
    let releaseToken;
    let active = true;
    fixture.session.getAccessToken = () => new Promise(resolve => { releaseToken = resolve; });
    const guard = () => active;
    const promise = action === 'list' ? fixture.repository.list(guard)
      : action === 'create' ? fixture.repository.create(input(), guard)
      : action === 'update' ? fixture.repository.update(addressId, { label: 'Casa' }, guard)
      : fixture.repository.remove(addressId, guard);
    active = false;
    releaseToken('fixture-replacement-account-token');
    await assert.rejects(promise, error => error.status === 401);
    assert.equal(fixture.calls.length, 0);
  }
});

test('mapping retains API order and default selection but excludes unknown response fields', () => {
  const response = [address({ recipientName: '  Persona Demo  ', extra: 'not part of the domain' }), address({ id: 'second', label: 'Oficina', isDefault: false })];
  const result = mapAddresses(response);
  assert.deepEqual(result.map(value => value.id), [addressId, 'second']);
  assert.equal(result[0].recipientName, 'Persona Demo');
  assert.equal(result[0].postalCode, '06000');
  assert.equal(result[0].extra, undefined);
  assert.equal(result[1].isDefault, false);
  assert.notEqual(result[0], response[0]);
  assert.deepEqual(mapAddresses([]), []);
});

test('malformed arrays, duplicate IDs, multiple defaults and incomplete rows fail', () => {
  const malformed = [undefined, null, {}, { addresses: [] }, '[]', [null], [{}],
    [address(), address()], [address(), address({ id: 'other' })],
    Array.from({ length: 6 }, (_, index) => address({ id: `${index}`, isDefault: index === 0 })),
  ];
  for (const response of malformed) assert.throws(() => mapAddresses(response), /confirmar la información/);
  for (const patch of [{ id: '' }, { id: ' padded ' }, { isDefault: undefined }, { isDefault: 'true' },
    { label: '' }, { street: 123 }, { phone: 'short' }, { postalCode: 6000 },
    { interiorNumber: null }, { references: 'x'.repeat(301) }, { state: undefined }]) {
    assert.throws(() => mapAddresses([address(patch)]), /confirmar la información/);
  }
  // A legacy nonempty list may have no default: consumers can choose its first address.
  assert.equal(mapAddresses([address({ isDefault: false })]).length, 1);
});

test('create and update normalize input while returning the full acknowledged array', async () => {
  const fixture = setup(async (_endpoint, options) => options.method === 'POST'
    ? [address()]
    : [address({ ...options.body }), address({ id: 'other', isDefault: false })]);
  const added = await fixture.repository.create(input({ label: '  Casa  ', phone: ' 5555555555 ', postalCode: ' 06000 ' }));
  assert.equal(added[0].isDefault, true); // The server promotes the first address even if the draft was false.
  assert.deepEqual(fixture.calls[0].options.body, input());
  const updated = await fixture.repository.update(addressId, { label: '  Oficina  ', references: '  ', isDefault: true, unknown: 'ignored' });
  assert.equal(updated.length, 2);
  assert.equal(updated[0].label, 'Oficina');
  assert.equal(updated[0].references, undefined);
  assert.deepEqual(fixture.calls[1].options.body, { label: 'Oficina', references: '', isDefault: true });
});

test('removal returns the new default assigned by the server', async () => {
  const remaining = address({ id: 'other', label: 'Oficina' });
  const fixture = setup(async () => [remaining]);
  assert.deepEqual(await fixture.repository.remove(addressId), [remaining]);
  assert.deepEqual(await setup(async () => []).repository.remove(addressId), []);
});

test('mutation acknowledgments must show the requested change', async () => {
  await assert.rejects(setup(async () => []).repository.create(input()), /confirmar el cambio/);
  await assert.rejects(setup().repository.create(input({ label: 'Oficina' })), /confirmar el cambio/);
  await assert.rejects(setup(async () => [address({ isDefault: false })]).repository.create(input({ isDefault: true })), /confirmar el cambio/);
  await assert.rejects(setup().repository.update(addressId, { label: 'Oficina' }), /confirmar el cambio/);
  await assert.rejects(setup().repository.update('missing', { label: 'Casa' }), /confirmar el cambio/);
  await assert.rejects(setup().repository.update(addressId, { isDefault: false }), /confirmar el cambio/);
  await assert.rejects(setup().repository.remove(addressId), /confirmar el cambio/);
  await assert.rejects(setup(async () => undefined).repository.remove(addressId), /confirmar la información/);
});

test('invalid outbound data fails before token or HTTP access', async () => {
  const fixture = setup();
  for (const draft of [emptyAddressInput(), input({ phone: '555 5555555' }), input({ postalCode: 6000 }), null]) {
    await assert.rejects(fixture.repository.create(draft));
  }
  for (const id of [null, undefined, '', ' ', ' padded ']) {
    await assert.rejects(fixture.repository.update(id, { isDefault: true }), /identificar la dirección/);
    await assert.rejects(fixture.repository.remove(id), /identificar la dirección/);
  }
  for (const patch of [{}, { street: undefined }, { other: 'ignored' }, null]) {
    await assert.rejects(fixture.repository.update(addressId, patch), /al menos un campo/);
  }
  for (const patch of [{ phone: '123' }, { label: ' ' }, { references: null }, { isDefault: 'true' }]) {
    await assert.rejects(fixture.repository.update(addressId, patch));
  }
  assert.equal(fixture.reads, 0);
  assert.equal(fixture.calls.length, 0);
});

test('server validation, missing address, session and ambiguous network errors propagate unchanged', async () => {
  for (const failure of [new ApiError('Unauthorized', 401), new ApiError('Address not found', 404), new ApiError('Solo puedes guardar hasta 5 direcciones', 400), new ApiError('Connection interrupted')]) {
    const fixture = setup(async () => { throw failure; });
    for (const operation of [() => fixture.repository.list(), () => fixture.repository.create(input()), () => fixture.repository.update(addressId, { isDefault: true }), () => fixture.repository.remove(addressId)]) {
      await assert.rejects(operation(), error => error === failure);
    }
  }
});
