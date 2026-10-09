const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');

// Load the real TypeScript repositories with Metro's platform resolution and a native driver spy.
function createLoader(platform, secureStore) {
  const cache = new Map();
  const importedPackages = [];
  const stubs = {
    '@/core/network/HttpClient': { HttpClient: class HttpClient {} },
    '../domain/useCases/AuthSessionService': {
      AuthSessionService: class AuthSessionService {
        constructor(authRepository, sessionRepository) {
          this.authRepository = authRepository;
          this.sessionRepository = sessionRepository;
        }
      },
    },
    './repositories/HttpAuthRepository': { HttpAuthRepository: class HttpAuthRepository {} },
  };

  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const source = fs.readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, {
      exports,
      require(request) {
        if (stubs[request]) return stubs[request];
        if (request === 'expo-secure-store') {
          importedPackages.push(request);
          if (platform === 'web') throw new Error('Web must never import SecureStore');
          return secureStore;
        }
        if (!request.startsWith('.')) throw new Error(`Unexpected import: ${request}`);
        const base = path.resolve(path.dirname(filename), request);
        const webModule = `${base}.web.ts`;
        return load(platform === 'web' && fs.existsSync(webModule) ? webModule : `${base}.ts`);
      },
    }, { filename });
    return exports;
  }

  return {
    load: relativePath => load(path.join(projectRoot, relativePath)),
    importedPackages,
  };
}

function nativeDriver(available = true) {
  let token = null;
  const calls = [];
  return {
    calls,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 4,
    isAvailableAsync: async () => available,
    getItemAsync: async (key, options) => { calls.push(['get', key, options]); return token; },
    setItemAsync: async (key, value, options) => { calls.push(['set', key, options]); token = value; },
    deleteItemAsync: async (key, options) => { calls.push(['delete', key, options]); token = null; },
  };
}

test('web dependency injection uses a single memory repository without importing native storage', async () => {
  const loader = createLoader('web');
  const dependencies = loader.load('src/features/auth/data/authDependencies.ts');
  const repository = dependencies.authSessionService.sessionRepository;
  assert.equal(await repository.getAccessToken(), null);
  await repository.saveAccessToken('test-only-token');
  assert.equal(await repository.getAccessToken(), 'test-only-token');
  const again = loader.load('src/features/auth/data/authDependencies.ts').authSessionService;
  assert.equal(again.sessionRepository, repository);
  assert.equal(await again.sessionRepository.getAccessToken(), 'test-only-token');
  await repository.clear();
  await repository.clear();
  assert.equal(await repository.getAccessToken(), null);
  assert.deepEqual(loader.importedPackages, []);
});

test('a web reload starts without credentials and never reads browser persistence', async () => {
  const first = createLoader('web').load('src/features/auth/data/authDependencies.ts');
  await first.authSessionService.sessionRepository.saveAccessToken('test-only-token');
  const reloaded = createLoader('web').load('src/features/auth/data/authDependencies.ts');
  assert.equal(await reloaded.authSessionService.sessionRepository.getAccessToken(), null);
  // No window/storage APIs exist in this sandbox: every repository operation must still work.
  await reloaded.authSessionService.sessionRepository.saveAccessToken('new-test-token');
  await reloaded.authSessionService.sessionRepository.clear();
  assert.equal(await reloaded.authSessionService.sessionRepository.getAccessToken(), null);
});

test('Android dependency injection reads, writes and removes the same key using SecureStore', async () => {
  const driver = nativeDriver();
  const loader = createLoader('android', driver);
  const repository = loader.load('src/features/auth/data/authDependencies.ts').authSessionService.sessionRepository;
  assert.equal(await repository.getAccessToken(), null);
  await repository.saveAccessToken('test-only-token');
  assert.equal(await repository.getAccessToken(), 'test-only-token');
  await repository.clear();
  assert.equal(await repository.getAccessToken(), null);
  assert.deepEqual(loader.importedPackages, ['expo-secure-store']);
  assert.deepEqual(driver.calls.map(([operation]) => operation), ['get', 'set', 'get', 'delete', 'get']);
  for (const [, key, options] of driver.calls) {
    assert.equal(key, 'inhalex.access_token');
    assert.equal(options.keychainAccessible, driver.WHEN_UNLOCKED_THIS_DEVICE_ONLY);
  }
});

test('unavailable native storage rejects all operations instead of silently storing tokens elsewhere', async () => {
  const driver = nativeDriver(false);
  const loader = createLoader('android', driver);
  const repository = loader.load('src/features/auth/data/authDependencies.ts').authSessionService.sessionRepository;
  await assert.rejects(repository.getAccessToken(), /almacenamiento seguro no está disponible/);
  await assert.rejects(repository.saveAccessToken('test-only-token'), /almacenamiento seguro no está disponible/);
  await assert.rejects(repository.clear(), /almacenamiento seguro no está disponible/);
  assert.deepEqual(driver.calls, []);
});

test('native read, write and delete failures reach the session service without swallowing them', async () => {
  const driver = nativeDriver();
  const failures = { get: new Error('read failed'), set: new Error('write failed'), delete: new Error('delete failed') };
  driver.getItemAsync = async () => { throw failures.get; };
  driver.setItemAsync = async () => { throw failures.set; };
  driver.deleteItemAsync = async () => { throw failures.delete; };
  const loader = createLoader('android', driver);
  const repository = loader.load('src/features/auth/data/authDependencies.ts').authSessionService.sessionRepository;
  await assert.rejects(repository.getAccessToken(), error => error === failures.get);
  await assert.rejects(repository.saveAccessToken('test-only-token'), error => error === failures.set);
  await assert.rejects(repository.clear(), error => error === failures.delete);
});
