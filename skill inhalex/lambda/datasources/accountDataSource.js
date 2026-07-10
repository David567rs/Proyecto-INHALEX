const util = require('../util');

function accountDataSource(account, state) {
    const safeAccount =
        account && typeof account === 'object'
            ? account
            : {};

    const safeState =
        state && typeof state === 'object'
            ? state
            : {};

    const linked = Boolean(safeAccount.linked);
    const userName =
        safeAccount.userName ||
        'Invitado';

    return {
        accountData: {
            type: 'object',
            logo: util.LOGO_URL,
            isLinked: linked,
            userName: userName,
            userBadgeText: linked
                ? 'Hola, ' + userName
                : 'Sin vincular',
            title: linked
                ? 'Cuenta vinculada'
                : 'Vincula tu cuenta',
            subtitle: linked
                ? 'Tu perfil de INHALEX ya está conectado con Alexa.'
                : 'Di tu código temporal de 5 dígitos para conectar favoritos y bolsa.',
            codeHint:
                'Puedes decir: mi código es cinco dos cuatro cero uno',
            statusText:
                safeState.statusText ||
                (
                    linked
                        ? 'Listo para sincronizar favoritos y bolsa.'
                        : 'Genera el código en tu página de INHALEX y díselo a Alexa.'
                ),
            errorText:
                safeState.errorText || '',
            primaryButton:
                linked
                    ? 'Ver favoritos'
                    : 'Ya tengo un código',
            secondaryButton: 'Ver catálogo',
            footerText: util.WELLNESS_DISCLAIMER
        }
    };
}

module.exports = accountDataSource;
