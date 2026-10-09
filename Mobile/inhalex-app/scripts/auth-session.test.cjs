const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const credentials = { email: 'fixture@example.test', password: 'test-only-password' };
const userDto = { _id: 'fixture-user', name: 'Fixture User', email: credentials.email };
const token = 'test-only-access-token';

// Exercise the real repository, mapper and session service without network or device APIs.
function createSession(request) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, {
      exports,
      require(importPath) {
        if (importPath === '@/core/network/HttpClient') return { HttpClient: class HttpClient {} };
        if (importPath.startsWith('@/')) {
          return load(path.join(projectRoot, 'src', `${importPath.slice(2)}.ts`));
        }
        if (importPath.startsWith('.')) {
          return load(`${path.resolve(path.dirname(filename), importPath)}.ts`);
        }
        throw new Error(`Unexpected import: ${importPath}`);
      },
    }, { filename });
    return exports;
  }

  const { AuthSessionService } = load(path.join(projectRoot, 'src/features/auth/domain/useCases/AuthSessionService.ts'));
  const { HttpAuthRepository } = load(path.join(projectRoot, 'src/features/auth/data/repositories/HttpAuthRepository.ts'));
  const { MemorySessionRepository } = load(path.join(projectRoot, 'src/features/auth/data/repositories/MemorySessionRepository.ts'));
  const { ApiError } = load(path.join(projectRoot, 'src/core/network/ApiError.ts'));
  const sessionRepository = new MemorySessionRepository();
  const calls = [];
  const transport = {
    async request(endpoint, options) {
      calls.push({ endpoint, options });
      return request(endpoint, options, ApiError);
    },
  };
  const service = new AuthSessionService(new HttpAuthRepository(transport), sessionRepository);
  return { service, sessionRepository, calls, ApiError };
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('login waits for token persistence before exposing the mapped authenticated user', async () => {
  const { service, sessionRepository, calls } = createSession(() => ({ accessToken: token, user: userDto }));
  const writing = deferred();
  const allowWrite = deferred();
  const save = sessionRepository.saveAccessToken.bind(sessionRepository);
  sessionRepository.saveAccessToken = async value => {
    writing.resolve();
    await allowWrite.promise;
    await save(value);
  };
  let settled = false;
  const login = service.login(credentials).then(user => { settled = true; return user; });
  await writing.promise;
  assert.equal(settled, false);
  assert.equal(await sessionRepository.getAccessToken(), null);
  allowWrite.resolve();
  const user = await login;
  assert.equal(await sessionRepository.getAccessToken(), token);
  assert.equal(user.id, userDto._id);
  assert.equal(user.email, credentials.email);
  assert.equal(user.role, 'user');
  assert.equal(calls[0].endpoint, '/auth/login');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.body, credentials);
});

test('restoring a saved token requests the current profile with that token', async () => {
  const { service, sessionRepository, calls } = createSession(() => ({ ...userDto, _id: undefined, id: 'profile-id', role: 'admin' }));
  await sessionRepository.saveAccessToken(token);
  const restored = await service.restore();
  assert.equal(restored.status, 'authenticated');
  assert.equal(restored.user.id, 'profile-id');
  assert.equal(restored.user.role, 'admin');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].endpoint, '/auth/me');
  assert.equal(calls[0].options.token, token);
});

test('an empty session restores as unauthenticated without requesting a profile', async () => {
  const { service, calls } = createSession(() => { throw new Error('No request expected'); });
  assert.equal((await service.restore()).status, 'unauthenticated');
  assert.equal(calls.length, 0);
});

for (const status of [401, 403]) {
  test(`a ${status} profile response clears the rejected token`, async () => {
    const { service, sessionRepository, calls } = createSession((_endpoint, _options, ApiError) => {
      throw new ApiError('Session rejected', status);
    });
    await sessionRepository.saveAccessToken(token);
    assert.equal((await service.restore()).status, 'unauthenticated');
    assert.equal(await sessionRepository.getAccessToken(), null);
    assert.equal((await service.restore()).status, 'unauthenticated');
    assert.equal(calls.length, 1);
  });
}

test('a connection failure preserves the saved token so restoration can be retried', async () => {
  let online = false;
  const offline = new Error('Fixture connection unavailable');
  const { service, sessionRepository, calls } = createSession(() => {
    if (!online) throw offline;
    return userDto;
  });
  await sessionRepository.saveAccessToken(token);
  await assert.rejects(service.restore(), error => error === offline);
  assert.equal(await sessionRepository.getAccessToken(), token);
  online = true;
  assert.equal((await service.restore()).status, 'authenticated');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.token, token);
});

test('logout clears the local token before remote cleanup and tolerates remote failure', async () => {
  const operations = [];
  const { service, sessionRepository, calls } = createSession(endpoint => {
    operations.push(endpoint);
    throw new Error('Fixture remote cleanup unavailable');
  });
  await sessionRepository.saveAccessToken(token);
  const clear = sessionRepository.clear.bind(sessionRepository);
  sessionRepository.clear = async () => { operations.push('clear'); await clear(); };
  await service.logout();
  assert.equal(await sessionRepository.getAccessToken(), null);
  assert.deepEqual(operations, ['clear', '/auth/logout']);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal((await service.restore()).status, 'unauthenticated');
  assert.equal(calls.length, 1);
  // Flush remote rejection handling; node:test reports any unhandled rejection as a failure.
  await new Promise(resolve => setImmediate(resolve));
});

test('a persistence failure rejects login without exposing an authenticated session', async () => {
  const { service, sessionRepository } = createSession(() => ({ accessToken: token, user: userDto }));
  const writeFailure = new Error('Fixture secure storage write failed');
  sessionRepository.saveAccessToken = async () => { throw writeFailure; };
  await assert.rejects(service.login(credentials), error => error === writeFailure);
  assert.equal(await sessionRepository.getAccessToken(), null);
  assert.equal((await service.restore()).status, 'unauthenticated');
});

test('a malformed API session never stores a token', async () => {
  const { service, sessionRepository, ApiError } = createSession(() => ({ user: userDto }));
  await assert.rejects(service.login(credentials), error => error instanceof ApiError);
  assert.equal(await sessionRepository.getAccessToken(), null);
});
