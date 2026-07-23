const assert = require('assert');
const util = require('../util');

const products = util.getFallbackProducts();

const productCases = [
    ['vapo rub', 'vaporub'],
    ['vapor rub', 'vaporub'],
    ['vaporizante', 'vaporub'],
    ['mirra con azafran', 'mirra-y-azafran'],
    ['azafrán', 'mirra-y-azafran'],
    ['rosa de castilla', 'rosas-de-castilla'],
    ['rosas castilla', 'rosas-de-castilla'],
    ['hierba buena', 'hierbabuena'],
    ['gingibre', 'jengibre'],
    ['gengibre', 'jengibre'],
    ['jenjibre', 'jengibre'],
    ['melisa', 'toronjil'],
    ['torongil', 'toronjil'],
    ['mira y azafrán', 'mirra-y-azafran'],
    ['anís de estrella', 'anis-estrella'],
    ['eucalito', 'eucalipto'],
    ['la banda', 'lavanda'],
    ['labanda', 'lavanda'],
    ['aroma de la banda', 'lavanda'],
    ['la lavanda natural', 'lavanda'],
    ['yerbabuena', 'hierbabuena'],
    ['yerba buena', 'hierbabuena'],
    ['vaporú', 'vaporub'],
    ['Vapo.Rub', 'vaporub'],
    ['rosa castilla', 'rosas-de-castilla'],
    ['buganvilia', 'bugambilia'],
    ['buganvilla', 'bugambilia'],
    ['bugambilias', 'bugambilia'],
    ['café', 'cafe'],
    ['anis estrella', 'anis-estrella'],
    ['canela', 'canela'],
    ['bugambilia', 'bugambilia']
];

for (const [query, expectedSlug] of productCases) {
    const product = util.findProduct(products, query);

    assert.ok(product, 'Expected product for "' + query + '"');
    assert.strictEqual(product.slug, expectedSlug);
}

for (const unavailableProduct of [
    'naranja',
    'manzana',
    'manzanita',
    'encino',
    'banda',
    'mira',
    'romeo',
    'meta',
    'venta',
    'candela',
    'copa',
    'floral',
    'fresco',
    'dulce'
]) {
    assert.strictEqual(
        util.findProduct(products, unavailableProduct),
        null,
        'Expected no product for "' + unavailableProduct + '"'
    );
}

assert.strictEqual(
    util.buildUnavailableProductSpeech('naranja'),
    'Por el momento, el aroma de naranja no forma parte de nuestro catálogo. ' +
    'Te mostraré los aromas que tenemos disponibles.'
);

assert.strictEqual(
    util.buildUnavailableProductSpeech('aroma de manzana'),
    'Por el momento, el aroma de manzana no forma parte de nuestro catálogo. ' +
    'Te mostraré los aromas que tenemos disponibles.'
);

assert.strictEqual(
    util.normalizeProductQuery('  LA   BÁNDA  '),
    'lavanda'
);

assert.strictEqual(
    util.normalizeLine('línea verde'),
    'linea-verde'
);

assert.strictEqual(
    util.normalizeLine('ansiedad y estrés'),
    'linea-ansiedad-estres'
);

assert.ok(
    util.filterProductsByLine(products, 'línea verde').length > 0,
    'Expected products in linea verde'
);

const fakeOffers = util.getOfferProducts([
    {
        slug: 'lavanda',
        price: 100,
        offerPrice: 80,
        promoActive: false
    },
    {
        slug: 'menta',
        price: 100,
        offerPrice: 100,
        promoActive: false
    }
]);

assert.deepStrictEqual(
    fakeOffers.map(function(product) {
        return product.slug;
    }),
    ['lavanda']
);

assert.strictEqual(
    util.normalizeAccessCode('12 34-5'),
    '12345'
);

assert.strictEqual(
    util.normalizeAccessCode('cinco dos cuatro cero uno'),
    '52401'
);

assert.strictEqual(
    util.normalizeAccessCode('mi código es cinco dos cuatro cero uno'),
    '52401'
);

assert.strictEqual(
    util.normalizeAccessCode('cincuenta y dos mil cuatrocientos uno'),
    '52401'
);

const account = util.normalizeAccountResponse({
    success: true,
    token: 'abc123',
    usuario: {
        id: 'user-1',
        nombre: 'David'
    }
});

assert.strictEqual(account.linked, true);
assert.strictEqual(account.accessToken, 'abc123');
assert.strictEqual(account.userName, 'David');

const eucalipto = util.findProduct(products, 'eucalipto');

assert.ok(eucalipto);
assert.ok(
    !/alivia congesti[oó]n|despeja (las )?v[ií]as respiratorias/i.test(
        eucalipto.description
    ),
    'Expected softer wellness wording for eucalipto'
);

console.log('util.test.js OK');
