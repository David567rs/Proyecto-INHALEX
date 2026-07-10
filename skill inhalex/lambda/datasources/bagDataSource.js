const util = require('../util');

function bagDataSource(items, account) {
    const safeItems = Array.isArray(items)
        ? items
        : [];

    const safeAccount =
        account && typeof account === 'object'
            ? account
            : {};

    const linked = Boolean(safeAccount.linked);
    const userName =
        safeAccount.userName ||
        'Invitado';

    const total = safeItems.reduce(function(sum, item) {
        const price = Number(item.price || 0);
        const quantity = Math.max(
            1,
            Math.round(Number(item.quantity || 1))
        );

        return sum + price * quantity;
    }, 0);

    return {
        bagData: {
            type: 'object',
            logo: util.LOGO_URL,
            isLinked: linked,
            userName: userName,
            userBadgeText: linked
                ? 'Hola, ' + userName
                : 'Sin vincular',
            title: 'Mi bolsa',
            subtitle: linked
                ? 'Productos guardados en tu cuenta de INHALEX.'
                : 'Vincula tu cuenta para sincronizar tu bolsa.',
            emptyTitle: linked
                ? 'Tu bolsa está vacía'
                : 'Cuenta no vinculada',
            emptyText: linked
                ? 'Agrega aromas desde Alexa o desde la página.'
                : 'Usa tu código temporal de 8 dígitos para conectar tu cuenta.',
            totalText: '$' + total.toFixed(2) + ' MXN',
            items: safeItems.map(function(item) {
                const quantity = Math.max(
                    1,
                    Math.round(Number(item.quantity || 1))
                );

                return {
                    id: item.id,
                    slug: item.slug,
                    name: item.name,
                    image: item.image || util.LOGO_URL,
                    quantity: quantity,
                    quantityText: 'x' + quantity,
                    priceText:
                        item.priceText ||
                        '$' + Number(item.price || 0).toFixed(2),
                    currency:
                        item.currency ||
                        'MXN'
                };
            }),
            footerText: util.WELLNESS_DISCLAIMER
        }
    };
}

module.exports = bagDataSource;
