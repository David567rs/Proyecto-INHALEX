const util = require('../util');

function helpDataSource() {
    return {
        helpData: {
            type: 'object',
            logo: util.LOGO_URL,
            title: '¿Cómo puedo ayudarte?',
            description:
                'Explora aromas, vincula tu cuenta con un código de 8 dígitos y sincroniza favoritos y bolsa.',
            commandTitle: 'Ejemplos de comandos',
            commandExamples:
                '• Muéstrame las líneas   • Línea verde\n' +
                '• Abre el catálogo   • Ver ofertas\n' +
                '• Muéstrame lavanda   • Agregar a favoritos\n' +
                '• Agregar a la bolsa   • Volver al catálogo',
            commandOne: 'Líneas: muéstrame las líneas',
            commandTwo: 'Catálogo: abre el catálogo',
            commandThree: 'Aroma: muéstrame lavanda',
            commandFour: 'Cuenta: vincular cuenta',
            commandFive: 'Favoritos: ver favoritos',
            commandSix: 'Bolsa: ver mi bolsa',
            loginNote:
                'También puedes decir: mi código es 12345678.',
            exploreButton: 'Explorar líneas',
            catalogButton: 'Ver catálogo',
            accountButton: 'Vincular cuenta',
            favoritesButton: 'Favoritos',
            offersButton: 'Ofertas',
            homeButton: 'Inicio',
            footerText: util.WELLNESS_DISCLAIMER
        }
    };
}

module.exports = helpDataSource;
