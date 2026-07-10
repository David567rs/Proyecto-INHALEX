const util = require('../util');

function formatProduct(product) {
    const price = Number(product.price || 0);
    const offerPrice = Number(product.offerPrice || product.price || 0);

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
        price:
            Number.isFinite(price)
                ? price.toFixed(2)
                : '0.00',
        offerPrice:
            Number.isFinite(offerPrice)
                ? offerPrice.toFixed(2)
                : '0.00',
        currency:
            product.currency ||
            'MXN'
    };
}

function offersDataSource(products) {
    const safeProducts =
        Array.isArray(products)
            ? products.map(formatProduct)
            : [];

    return {
        offersData: {
            type: 'object',
            logo: util.LOGO_URL,
            title: 'Ofertas del día',
            subtitle: 'Promociones INHALEX Bienestar',
            instruction:
                'Toca un producto para conocer sus detalles.',
            emptyText:
                'No hay ofertas activas por ahora. Puedes explorar el catálogo completo.',
            products: safeProducts
        }
    };
}

module.exports = offersDataSource;
