const util = require('../util');

function favoritesDataSource(items, account) {
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

    return {
        favoritesData: {
            type: 'object',
            logo: util.LOGO_URL,
            isLinked: linked,
            userName: userName,
            userBadgeText: linked
                ? 'Hola, ' + userName
                : 'Sin vincular',
            title: 'Mis favoritos',
            subtitle: linked
                ? 'Aromas guardados en tu cuenta de INHALEX.'
                : 'Vincula tu cuenta para ver tus favoritos.',
            emptyTitle: linked
                ? 'Aún no tienes favoritos'
                : 'Cuenta no vinculada',
            emptyText: linked
                ? 'Cuando guardes aromas, aparecerán aquí.'
                : 'Genera un código de vinculación en la página y díselo a Alexa.',
            items: safeItems.map(function(item) {
                return {
                    id: item.id,
                    slug: item.slug,
                    name: item.name,
                    image: item.image || util.LOGO_URL,
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

module.exports = favoritesDataSource;
