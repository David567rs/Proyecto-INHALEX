/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const helperPath = path.resolve(__dirname, '../src/features/catalog/presentation/assets/aromaImages.ts');
const source = fs.readFileSync(helperPath, 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const context = {
  exports: {},
  require: (assetPath) => {
    assert.ok(fs.existsSync(path.resolve(path.dirname(helperPath), assetPath)), `Missing bundled photo: ${assetPath}`);
    return assetPath;
  },
};
vm.runInNewContext(outputText, context);
const { getAromaProductImage } = context.exports;

test('product identity selects the real bottle despite API ingredient imagery', () => {
  for (const [slug, name, filename] of [
    ['anis-estrella', 'Anís Estrella', 'anis'],
    ['mirra-y-azafran', 'Mirra y Azafrán', 'mirra'],
    ['rosas-de-castilla', 'Rosas de Castilla', 'rosas'],
    ['cafe', 'Café', 'cafe'],
  ]) {
    const image = getAromaProductImage({ slug, name, image: '/products/menta.jpg' });
    assert.ok(image.source.endsWith(`/aromas/${filename}.jpeg`));
    assert.equal(image.aspectRatio, 1024 / 1536);
  }
});

test('exact names and URL filenames support accents and query strings', () => {
  assert.ok(getAromaProductImage({ slug: '', name: ' Café ', image: '' }).source.endsWith('/aromas/cafe.jpeg'));
  assert.ok(getAromaProductImage({ slug: '', name: '', image: 'https://assets.example.test/aromas/An%C3%ADs-Estrella.jpeg?v=1#photo' }).source.endsWith('/aromas/anis.jpeg'));
});

test('missing bottles do not reuse another product because of shared aromatic notes', () => {
  assert.equal(getAromaProductImage({ slug: 'romero', name: 'Romero', image: '/products/romero.jpg', aromas: ['menta'] }), null);
  assert.equal(getAromaProductImage({ slug: 'aroma-nuevo', name: 'Mezcla de menta', image: '/products/%invalid.jpeg', aromas: ['menta'] }), null);
  assert.equal(getAromaProductImage({ slug: 'constructor', name: '__proto__', image: '' }), null);
});
