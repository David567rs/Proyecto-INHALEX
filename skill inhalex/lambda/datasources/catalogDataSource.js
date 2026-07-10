const util = require('../util');

function catalogDataSource(products, title, subtitle) {
    return {
        catalogData: {
            type: 'object',

            logo: util.LOGO_URL,

            title: title || 'Catálogo INHALEX',

            subtitle:
                subtitle ||
                'Aromas naturales para tu bienestar',

            instruction:
                'Toca un aroma para conocer sus beneficios y detalles.',

            products: Array.isArray(products)
                ? products.map(function(product) {
                    return {
                        id: product.id,
                        slug: product.slug,

                        name: product.name,

                        description:
                            product.description ||
                            'Producto natural de INHALEX.',

                        image:
                            product.image ||
                            util.LOGO_URL,

                        price: Number(product.price || 0).toFixed(2),

                        currency:
                            product.currency ||
                            'MXN',

                        stockAvailable:
                            Number(product.stockAvailable || 0),

                        category:
                            product.categoryTitle ||
                            util.getLineTitle(product.category)
                    };
                })
                : []
        }
    };
}

module.exports = catalogDataSource;