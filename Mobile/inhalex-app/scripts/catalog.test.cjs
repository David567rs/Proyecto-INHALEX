const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

// Exercise the actual TypeScript data layer without an emulator or a test dependency.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};

const { mapCatalogProduct, resolveProductImageUrl } = require('../src/features/catalog/data/mappers/catalogMapper.ts');
const { ProductsApiAdapter } = require('../src/features/catalog/data/adapters/ProductsApiAdapter.ts');
const { HttpCatalogRepository } = require('../src/features/catalog/data/repositories/HttpCatalogRepository.ts');

const productDto = {
  _id: '69a7d21b350f57ff952f6e8f',
  name: 'Toronjil',
  slug: 'toronjil',
  description: 'Inhalador aromático personal de notas cítricas y herbales.',
  longDescription: 'Este inhalador aromático de Toronjil, también conocido como melisa.',
  price: 60,
  currency: 'MXN',
  image: '/products/toronjil.jpg',
  category: 'linea-insomnio',
  benefits: ['Sensación de calma'],
  presentation: '10ml',
  origin: '100% Natural',
  inStock: true,
  stockAvailable: 16,
};

test('DTO mapper preserves API product identity and normalizes optional fields', () => {
  const product = mapCatalogProduct(productDto);
  assert.equal(product.id, productDto._id);
  assert.equal(product.longDescription, productDto.longDescription);
  assert.equal(product.image, '/products/toronjil.jpg');
  assert.equal(product.imageUrl, null);
  assert.equal(product.effectivePrice, 60);
  assert.equal(product.stockAvailable, 16);
  assert.deepEqual(product.aromas, []);
  assert.deepEqual(product.benefits, ['Sensación de calma']);
  assert.equal(product.allowBackorder, false);
});

test('only a current, valid discount changes the displayed price', () => {
  const now = Date.parse('2026-10-05T12:00:00Z');
  const offer = { ...productDto, promoActive: true, promoPrice: 45, promoEndsAt: '2026-10-06T00:00:00Z' };
  assert.equal(mapCatalogProduct(offer, undefined, now).effectivePrice, 45);
  assert.equal(mapCatalogProduct({ ...offer, promoEndsAt: '2026-10-04T00:00:00Z' }, undefined, now).effectivePrice, 60);
  assert.equal(mapCatalogProduct({ ...offer, promoEndsAt: 'invalid date' }, undefined, now).promoActive, false);
  assert.equal(mapCatalogProduct({ ...offer, promoPrice: 90 }, undefined, now).promoActive, false);
  assert.equal(mapCatalogProduct({ ...offer, promoActive: false }, undefined, now).effectivePrice, 60);
});

test('remote images require HTTPS and web paths resolve only against an explicit asset host', () => {
  assert.equal(resolveProductImageUrl('/products/toronjil.jpg'), null);
  assert.equal(resolveProductImageUrl('/products/toronjil.jpg', 'https://assets.example.test'), 'https://assets.example.test/products/toronjil.jpg');
  assert.equal(resolveProductImageUrl('https://cdn.example.test/aroma.jpg'), 'https://cdn.example.test/aroma.jpg');
  for (const unsafe of ['http://cdn.example.test/a.jpg', 'file:///secret.png', 'javascript:alert(1)', '//cdn.example.test/a.jpg', 'https://user:password@cdn.example.test/a.jpg']) {
    assert.equal(resolveProductImageUrl(unsafe, 'https://assets.example.test'), null);
  }
});

test('Adapter safely translates literal search, category and slug into public API routes', async () => {
  const paths = [];
  const adapter = new ProductsApiAdapter({ request: async (path) => { paths.push(path); return {}; } });
  await adapter.listProducts({ search: '  menta [a+b]  ', categoryId: 'linea-verde', page: 0, limit: 200 });
  const query = new URL(`https://api.example.test${paths[0]}`).searchParams;
  assert.equal(query.get('search'), 'menta \\[a\\+b\\]');
  assert.equal(query.get('category'), 'linea-verde');
  assert.equal(query.get('page'), '1');
  assert.equal(query.get('limit'), '100');
  await adapter.listProducts({ categoryId: 'all' });
  assert.equal(new URL(`https://api.example.test${paths[1]}`).searchParams.has('category'), false);
  await adapter.findProduct('aroma/menta?query');
  assert.equal(paths[2], '/products/aroma%2Fmenta%3Fquery');
});

test('every regular-expression metacharacter is sent as literal search text', async () => {
  let requestedPath;
  const adapter = new ProductsApiAdapter({ request: async (path) => { requestedPath = path; return {}; } });
  for (const character of '.*+?^${}()|[]\\') {
    const term = `aroma${character}verde`;
    await adapter.listProducts({ search: term });
    const encodedSearch = new URL(`https://api.example.test${requestedPath}`).searchParams.get('search');
    // Simulate only the API's RegExp(search, 'i') contract, not a live database request.
    const expression = new RegExp(encodedSearch, 'i');
    assert.equal(expression.test(`El ${term} natural`), true, `literal ${character}`);
    assert.equal(expression.test('aroma verde'), false, `does not interpret ${character}`);
    assert.equal(expression.test('aromaverde'), false, `does not omit ${character}`);
    assert.equal(expression.test('otra selección'), false, `does not broaden ${character}`);
  }
});

test('URL-reserved characters cannot introduce extra search parameters', async () => {
  let requestedPath;
  const adapter = new ProductsApiAdapter({ request: async (path) => { requestedPath = path; return {}; } });
  const term = 'Menta &category=otra #1 50% + calma?/verano=Sí';
  await adapter.listProducts({ search: term, categoryId: 'linea-verde' });
  const url = new URL(`https://api.example.test${requestedPath}`);
  assert.equal(url.pathname, '/products');
  assert.equal(url.hash, '');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['category', 'limit', 'page', 'search']);
  assert.equal(url.searchParams.get('category'), 'linea-verde');
  assert.equal(url.searchParams.getAll('category').length, 1);
  assert.equal(new RegExp(`^${url.searchParams.get('search')}$`, 'i').test(term), true);
});

test('blank search text is omitted while an active category is preserved', async () => {
  const paths = [];
  const adapter = new ProductsApiAdapter({ request: async (path) => { paths.push(path); return {}; } });
  for (const search of [undefined, '', '   ', '\t\n\u00a0']) {
    await adapter.listProducts({ search, categoryId: 'linea-insomnio' });
  }
  for (const path of paths) {
    const query = new URL(`https://api.example.test${path}`).searchParams;
    assert.equal(query.has('search'), false);
    assert.equal(query.get('category'), 'linea-insomnio');
  }
});

test('search retains accents and internal phrase spacing after trimming the edges', async () => {
  let requestedPath;
  const adapter = new ProductsApiAdapter({ request: async (path) => { requestedPath = path; return {}; } });
  await adapter.listProducts({ search: '  CÍTRICO  limón 🌿  ' });
  const query = new URL(`https://api.example.test${requestedPath}`).searchParams;
  assert.equal(query.get('search'), 'CÍTRICO  limón 🌿');
});

test('adapter terms follow the simulated API contract for partial, uppercase, accented and phrase searches', async () => {
  const products = [
    { ...productDto, aromas: ['Limón'] },
    { ...productDto, _id: 'verde', slug: 'toronjil-verde', category: 'linea-verde', aromas: ['Limón'] },
  ];
  // Contract simulation: the service uses a case-insensitive regular expression over
  // name, description, longDescription and aromas, together with the category filter.
  // These assertions verify the adapter/repository round trip, not MongoDB integration.
  const transport = {
    request: async (path) => {
      const query = new URL(`https://api.example.test${path}`).searchParams;
      const expression = query.has('search') ? new RegExp(query.get('search'), 'i') : null;
      const category = query.get('category');
      const items = products.filter((product) => {
        const fields = [product.name, product.description, product.longDescription, ...product.aromas];
        return (!category || product.category === category)
          && (!expression || fields.some((field) => expression.test(field)));
      });
      return { items, total: items.length, page: 1, limit: 100, totalPages: 1 };
    },
  };
  const repository = new HttpCatalogRepository(new ProductsApiAdapter(transport));
  for (const search of ['TORON', 'cítricas', 'MELISA', 'LIMÓN', 'notas cítricas']) {
    const result = await repository.listProducts({ search, categoryId: 'linea-insomnio' });
    assert.deepEqual(result.products.map((product) => product.id), [productDto._id], search);
    assert.equal(result.total, 1, search);
  }
  for (const search of ['citricas', 'notas  cítricas', 'cítricas notas', 'calma', 'inexistente', '.*']) {
    const result = await repository.listProducts({ search });
    assert.deepEqual(result.products, [], search);
    assert.equal(result.total, 0, search);
  }
  assert.equal((await repository.listProducts({ search: 'toron', categoryId: 'all' })).total, 2);
  assert.equal((await repository.listProducts({ search: 'toron', categoryId: 'linea-roja' })).total, 0);
});

test('Repository uses injected Adapter and the same mapping for lists and product details', async () => {
  const paths = [];
  const transport = {
    request: async (path) => {
      paths.push(path);
      if (path === '/products/categories') return [{ id: 'linea-insomnio', name: 'Línea insomnio', count: 2 }];
      if (path.startsWith('/products?')) return { items: [productDto], total: 1, page: 1, limit: 100, totalPages: 1 };
      return productDto;
    },
  };
  const repository = new HttpCatalogRepository(new ProductsApiAdapter(transport), 'https://assets.example.test');
  const page = await repository.listProducts({ search: 'Toronjil' });
  assert.equal(page.total, 1);
  assert.equal(page.products[0].imageUrl, 'https://assets.example.test/products/toronjil.jpg');
  assert.deepEqual(await repository.findProduct('toronjil'), page.products[0]);
  assert.deepEqual(await repository.listCategories(), [{ id: 'linea-insomnio', name: 'Línea insomnio', count: 2 }]);
  assert.deepEqual(paths.slice(1), ['/products/toronjil', '/products/categories']);
});

test('malformed API data and connection failures reach the ViewModel without invented products', async () => {
  assert.throws(() => mapCatalogProduct({ ...productDto, price: NaN }), /datos incompletos/);
  const malformed = new HttpCatalogRepository({ listProducts: async () => ({ items: null }) });
  await assert.rejects(malformed.listProducts(), /leer el catálogo/);
  const connectionError = new Error('Sin conexión');
  const offline = new HttpCatalogRepository({ listProducts: async () => { throw connectionError; } });
  await assert.rejects(offline.listProducts(), connectionError);
});
