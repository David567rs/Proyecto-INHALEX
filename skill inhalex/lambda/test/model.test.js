const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('../util');

const modelPath = path.join(
    __dirname,
    '..',
    '..',
    'interactionModels',
    'custom',
    'es-MX.json'
);

const model = JSON.parse(
    fs.readFileSync(modelPath, 'utf8')
);

const languageModel = model.interactionModel.languageModel;
const intents = languageModel.intents;
const types = languageModel.types;

function getIntent(name) {
    return intents.find(function(intent) {
        return intent.name === name;
    });
}

assert.strictEqual(
    languageModel.invocationName,
    'respiro que alivia'
);

const productNameIntent = getIntent('ProductNameIntent');

assert.ok(productNameIntent, 'Expected ProductNameIntent');
assert.deepStrictEqual(productNameIntent.samples, ['{product}']);
assert.deepStrictEqual(productNameIntent.slots, [
    {
        name: 'product',
        type: 'PRODUCTOS_INHALEX'
    }
]);

assert.ok(
    getIntent('ShowCatalogIntent').samples.includes('catálogo')
);
assert.ok(
    getIntent('ShowFavoritesIntent').samples.includes('favoritos')
);
assert.ok(
    getIntent('ShowBagIntent').samples.includes('bolsa')
);

const productDetailIntent = getIntent('ProductDetailIntent');

[
    'ver {product}',
    'ver aroma {product}',
    'buscar {product}',
    'buscar aroma {product}',
    'tienen aroma de {product}'
].forEach(function(sample) {
    assert.ok(
        productDetailIntent.samples.includes(sample),
        'Expected product-search sample "' + sample + '"'
    );
});

const productType = types.find(function(type) {
    return type.name === 'PRODUCTOS_INHALEX';
});

function getProductSynonyms(productName) {
    const productValue = productType.values.find(function(entry) {
        return entry.name.value === productName;
    });

    assert.ok(productValue, 'Expected slot value for ' + productName);
    return productValue.name.synonyms;
}

const expectedVoiceVariants = {
    toronjil: ['torongil'],
    'mirra y azafrán': ['mira y azafrán'],
    'anís estrella': ['anís de estrella'],
    eucalipto: ['eucalito'],
    lavanda: ['la banda', 'labanda'],
    jengibre: ['gingibre', 'gengibre', 'jenjibre'],
    hierbabuena: ['hierba buena', 'yerbabuena', 'yerba buena'],
    vaporub: ['vapo rub', 'vapor rub', 'vaporú'],
    'rosas de castilla': ['rosa de castilla', 'rosa castilla'],
    bugambilia: ['buganvilia', 'buganvilla']
};

Object.keys(expectedVoiceVariants).forEach(function(productName) {
    const synonyms = getProductSynonyms(productName);

    expectedVoiceVariants[productName].forEach(function(variant) {
        assert.ok(
            synonyms.includes(variant),
            'Expected synonym "' + variant + '" for ' + productName
        );
    });
});

const fallbackProducts = util.getFallbackProducts();

const unavailableTrainingValues = [
    'naranja',
    'manzana',
    'pino',
    'encino',
    'vainilla',
    'limón',
    'coco',
    'fresa',
    'jazmín',
    'sándalo'
];

unavailableTrainingValues.forEach(function(productName) {
    assert.ok(
        productType.values.some(function(entry) {
            return entry.name.value === productName;
        }),
        'Expected unavailable search-training value "' + productName + '"'
    );
    assert.strictEqual(
        util.findProduct(fallbackProducts, productName),
        null,
        'Unavailable training value must not become a catalog product'
    );
});

productType.values
    .filter(function(entry) {
        return !unavailableTrainingValues.includes(entry.name.value);
    })
    .forEach(function(entry) {
    const canonicalProductSlug = util.makeSlug(entry.name.value);
    const spokenForms = [
        entry.name.value
    ].concat(entry.name.synonyms || []);

    spokenForms.forEach(function(spokenForm) {
        const product = util.findProduct(
            fallbackProducts,
            spokenForm
        );

        assert.ok(
            product,
            'Expected product for slot form "' + spokenForm + '"'
        );
        assert.strictEqual(
            product.slug,
            canonicalProductSlug,
            'Unexpected product for slot form "' + spokenForm + '"'
        );
    });
    });

console.log('model.test.js OK');
