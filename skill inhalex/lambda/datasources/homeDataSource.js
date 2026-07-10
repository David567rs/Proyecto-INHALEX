const util = require('../util');

function homeDataSource() {
    return {
        homeData: {
            type: 'object',

            logo: util.LOGO_URL,

            videoUrl:
                'https://res.cloudinary.com/doetag8zp/video/upload/v1783172828/Aplicar_rt8hw5.mp4',

            badge: 'Productos 100% naturales',

            titleTop: 'El Respiro',
            titleMiddle: 'Que',
            titleBottom: 'Alivia',

            description:
                'Descubre aromas naturales pensados para acompañar tu bienestar diario. Explora las líneas de INHALEX y encuentra el aroma ideal para tu momento.',

            exploreButton: 'Explorar líneas',
            catalogButton: 'Ver catálogo',
            accountButton: 'Cuenta',
            helpButton: 'Ayuda',
            instruction:
                'Puedes decir: vincular cuenta, ver favoritos, ver mi bolsa o ayuda.',

            featureOne: '100% Natural',
            featureTwo: 'Esencias puras',
            featureThree: 'Bienestar natural',

            videoLabel: 'Aplica · Frota · Inhala'
        }
    };
}

module.exports = homeDataSource;
