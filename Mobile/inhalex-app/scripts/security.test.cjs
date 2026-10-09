/* global __dirname */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
function loadTypeScript(relativePath, globals = {}) {
  const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const context = { exports: {}, ...globals };
  vm.runInNewContext(outputText, context);
  return context.exports;
}

test('release accepts HTTPS and rejects HTTP; development keeps the local API', () => {
  const configHelpers = loadTypeScript('src/core/config/resolveApiUrl.ts', { URL });
  const loadEnvironment = (url, dev) => loadTypeScript('src/core/config/environment.ts', {
    __DEV__: dev, process: { env: { EXPO_PUBLIC_API_URL: url } },
    require: (id) => {
      if (id === './resolveApiUrl') return configHelpers;
      if (id === 'react-native') return { Platform: { OS: 'android' } };
      if (id === 'expo-constants') return {
        __esModule: true,
        default: { executionEnvironment: 'storeClient', expoConfig: { hostUri: '172.20.10.3:8081' } },
        ExecutionEnvironment: { StoreClient: 'storeClient' },
      };
      throw new Error(`Unexpected import: ${id}`);
    },
  }).environment;
  assert.equal(loadEnvironment(' https://api.example.test/api/ ', false).apiUrl, 'https://api.example.test/api');
  assert.equal(loadEnvironment('http://10.0.2.2:3200/api', true).apiUrl, 'http://10.0.2.2:3200/api');
  assert.throws(() => loadEnvironment('http://10.0.2.2:3200/api', false), /HTTPS/);
  assert.throws(() => loadEnvironment('file:///data/token', true), /URL/);
  assert.match(loadEnvironment(undefined, false).apiUrl, /^https:\/\//);
});

test('Expo generates R8, resource shrinker, Hermes and secure Android backup rules', () => {
  const expoPackagePath = require.resolve('expo/package.json');
  const expoPackage = JSON.parse(fs.readFileSync(expoPackagePath, 'utf8'));
  const expoCli = path.join(path.dirname(expoPackagePath), expoPackage.bin.expo);
  const config = JSON.parse(execFileSync(process.execPath, [expoCli, 'config', '--type', 'introspect', '--json'], {
    cwd: projectRoot, encoding: 'utf8', timeout: 30_000,
  }));
  const android = config._internal.modResults.android;
  const properties = Object.fromEntries(android.gradleProperties.filter(p => p.type === 'property').map(p => [p.key, p.value]));
  assert.equal(properties['android.enableMinifyInReleaseBuilds'], 'true');
  assert.equal(properties['android.enableShrinkResourcesInReleaseBuilds'], 'true');
  assert.equal(properties.hermesV1Enabled, 'true');
  const application = android.manifest.manifest.application[0].$;
  assert.equal(application['android:usesCleartextTraffic'], 'false');
  assert.equal(application['android:fullBackupContent'], '@xml/secure_store_backup_rules');
  assert.equal(application['android:dataExtractionRules'], '@xml/secure_store_data_extraction_rules');
  const eas = JSON.parse(fs.readFileSync(path.join(projectRoot, 'eas.json'), 'utf8'));
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.build.preview.android.buildType, 'apk');
  for (const profile of Object.values(eas.build)) assert.match(profile.env.EXPO_PUBLIC_API_URL, /^https:\/\//);
});
