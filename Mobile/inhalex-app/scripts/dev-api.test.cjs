/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
function loadTypeScript(relativePath, globals = {}) {
  const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, URL, ...globals };
  vm.runInNewContext(outputText, context);
  return context.exports;
}

const helpers = loadTypeScript('src/core/config/resolveApiUrl.ts');
const context = {
  isDevelopment: true, platform: 'android', isExpoClient: true, hostUri: '172.20.10.3:8081',
};

test('Android Expo follows the Metro LAN host when the network changes', () => {
  for (const host of ['172.20.10.3', '192.168.1.71', '10.0.0.6']) {
    const result = helpers.resolveApiUrl('http://localhost:3200/api/', { ...context, hostUri: `${host}:8081` });
    assert.equal(result.apiUrl, `http://${host}:3200/api`);
    assert.equal(result.apiConnectionHint, null);
  }
});

test('loopback IPv4 and IPv6 keep the API port, prefix and query instead of using Metro port', () => {
  for (const localHost of ['localhost', '127.0.0.1', '[::1]']) {
    const result = helpers.resolveApiUrl(`http://${localHost}:3200/custom/api?v=1`, context);
    assert.equal(result.apiUrl, 'http://172.20.10.3:3200/custom/api?v=1');
  }
  assert.equal(helpers.resolveApiUrl('https://localhost:4443/api', context).apiUrl,
    'https://172.20.10.3:4443/api');
});

test('web, other platforms and non-Expo runtimes preserve configured localhost', () => {
  for (const override of [{ platform: 'web' }, { platform: 'ios' }, { isExpoClient: false }]) {
    assert.equal(helpers.resolveApiUrl('http://localhost:3200/api', { ...context, ...override }).apiUrl,
      'http://localhost:3200/api');
  }
});

test('explicit API hosts and remote HTTPS URLs never follow the Metro host', () => {
  for (const url of ['http://192.168.1.71:3200/api', 'http://10.0.2.2:3200/api',
    'https://inhalex-backend.onrender.com/api', 'https://api.example.test/api']) {
    assert.equal(helpers.resolveApiUrl(url, context).apiUrl, url);
    assert.equal(helpers.resolveApiUrl(url, context).apiConnectionHint, null);
  }
});

test('missing, malformed and remote tunnel hosts retain the configured API with a LAN hint', () => {
  for (const hostUri of [null, undefined, '', 'localhost:8081', '127.0.0.1:8081',
    'abcdef.exp.direct:80', 'https://abcdef.ngrok-free.app', '8.8.8.8:8081',
    '192.168.1.999:8081', '172.32.0.1:8081', 'ftp://192.168.1.71:8081',
    'http://user:password@192.168.1.71:8081', '172.20.10.3:8081/remote',
    '172.20.10.3:8081?host=remote', '[fe80::1]:8081', 'not a host']) {
    const result = helpers.resolveApiUrl('http://localhost:3200/api', { ...context, hostUri });
    assert.equal(result.apiUrl, 'http://localhost:3200/api');
    assert.match(result.apiConnectionHint, /LAN/);
  }
});

test('supported Metro schemes and unique local IPv6 preserve a trustworthy LAN address', () => {
  for (const hostUri of ['http://172.20.10.3:8081', 'exp://172.20.10.3:8081',
    'exps://172.20.10.3:8081', 'https://172.20.10.3:8081']) {
    assert.equal(helpers.resolveApiUrl('http://localhost:3200/api', { ...context, hostUri }).apiUrl,
      'http://172.20.10.3:3200/api');
  }
  assert.equal(helpers.resolveApiUrl('http://localhost:3200/api', {
    ...context, hostUri: '[fd12:3456:789a::1]:8081',
  }).apiUrl, 'http://[fd12:3456:789a::1]:3200/api');
});

test('release requires HTTPS and never rewrites even a loopback HTTPS API', () => {
  const release = { ...context, isDevelopment: false };
  assert.throws(() => helpers.resolveApiUrl('http://localhost:3200/api', release), /HTTPS/);
  assert.equal(helpers.resolveApiUrl('https://localhost:3200/api', release).apiUrl,
    'https://localhost:3200/api');
  for (const url of ['file:///data/token', 'javascript:alert(1)', 'not-a-url', 'http://']) {
    assert.throws(() => helpers.resolveApiUrl(url, context), /URL/);
  }
});

test('environment uses Constants only to resolve Android development API host', () => {
  const loadEnvironment = (platform, dev, hostUri, url = 'http://localhost:3200/api') =>
    loadTypeScript('src/core/config/environment.ts', {
      __DEV__: dev, process: { env: { EXPO_PUBLIC_API_URL: url } },
      require: (id) => {
        if (id === './resolveApiUrl') return helpers;
        if (id === 'react-native') return { Platform: { OS: platform } };
        if (id === 'expo-constants') return {
          __esModule: true,
          default: { executionEnvironment: 'storeClient', expoConfig: { hostUri } },
          ExecutionEnvironment: { StoreClient: 'storeClient' },
        };
        throw new Error(`Unexpected import: ${id}`);
      },
    }).environment;

  assert.equal(loadEnvironment('android', true, '172.20.10.3:8081').apiUrl,
    'http://172.20.10.3:3200/api');
  assert.equal(loadEnvironment('web', true, '172.20.10.3:8081').apiUrl,
    'http://localhost:3200/api');
  assert.equal(loadEnvironment('android', false, '172.20.10.3:8081', 'https://api.example.test/api').apiUrl,
    'https://api.example.test/api');
});

test('resolution also works with the WHATWG URL implementation installed by Expo on Android', () => {
  const nativeHelpers = loadTypeScript('src/core/config/resolveApiUrl.ts', {
    URL: require('whatwg-url-minimum').URL,
  });
  assert.equal(nativeHelpers.resolveApiUrl('http://localhost:3200/api', context).apiUrl,
    'http://172.20.10.3:3200/api');
  assert.equal(nativeHelpers.resolveApiUrl('http://[::1]:3200/api', context).apiUrl,
    'http://172.20.10.3:3200/api');
});
