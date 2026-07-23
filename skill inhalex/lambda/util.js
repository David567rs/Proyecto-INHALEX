const https = require('https');

const API_URL = normalizeBaseApiUrl(
    process.env.INHALEX_API_URL ||
    'https://inhalex-backend.onrender.com'
);
const PRODUCTS_ENDPOINT = '/api/products';
const PRODUCTS_TIMEOUT_MS = Number(
    process.env.INHALEX_PRODUCTS_TIMEOUT_MS ||
    4000
);
const ACCOUNT_TIMEOUT_MS = Number(
    process.env.INHALEX_ACCOUNT_TIMEOUT_MS ||
    7000
);
const ACCESS_CODE_LENGTH = 5;

const LINK_ENDPOINTS = parseEndpointList(
    process.env.INHALEX_LINK_ENDPOINTS,
    [
        '/api/auth/alexa/exchange',
        '/api/alexa/link',
        '/api/alexa/verify',
        '/api/auth/alexa/link',
        '/api/auth/alexa/verify'
    ]
);

const PROFILE_ENDPOINTS = parseEndpointList(
    process.env.INHALEX_PROFILE_ENDPOINTS,
    [
        '/api/auth/alexa/profile',
        '/api/alexa/profile',
        '/api/alexa/me',
        '/api/auth/alexa/me',
        '/api/auth/me'
    ]
);

const FAVORITES_ENDPOINTS = parseEndpointList(
    process.env.INHALEX_FAVORITES_ENDPOINTS,
    [
        '/api/favorites',
        '/api/alexa/favorites',
        '/api/favoritos'
    ]
);

const BAG_ENDPOINTS = parseEndpointList(
    process.env.INHALEX_BAG_ENDPOINTS,
    [
        '/api/cart',
        '/api/alexa/bag',
        '/api/alexa/cart',
        '/api/bolsa'
    ]
);

const UNLINK_ENDPOINTS = parseEndpointList(
    process.env.INHALEX_UNLINK_ENDPOINTS,
    [
        '/api/auth/alexa/session'
    ]
);

const WELLNESS_DISCLAIMER =
    'La informacion de esta skill es de bienestar general y no sustituye consejo medico profesional.';

const LOGO_URL =
    'https://res.cloudinary.com/doetag8zp/image/upload/v1782984136/NuevoLogo_bjfy2e.png';

/*
 * Imágenes utilizadas en el carrusel principal de líneas.
 */
const LINE_IMAGE_MAP = {
    'linea-verde':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782984374/verde_n4urzy.png',

    'linea-resfriado':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782984346/resfriado_tgczl3.png',

    'linea-estimulante':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782984288/estimulante_els5ik.png',

    'linea-insomnio':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782984317/insomnio_pcavbr.png',

    'linea-ansiedad-estres':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782984257/ansiedad-estres_azclnf.png'
};

/*
 * Imágenes botánicas utilizadas en el catálogo.
 */
const AROMA_IMAGE_MAP = {
    vaporub:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985981/vaporub_fby6u2.jpg',

    toronjil:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985951/toronjil_ont2c9.jpg',

    'rosas-de-castilla':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985904/rosas-castilla_vauh6p.jpg',

    rosas:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985904/rosas-castilla_vauh6p.jpg',

    romero:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985830/romero_elvb4k.jpg',

    'mirra-y-azafran':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985750/mirra-azafran_ye9abl.jpg',

    menta:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985704/menta_k6kpo3.jpg',

    manzanilla:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985673/manzanilla_kjyfyx.jpg',

    lavanda:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985622/lavanda_msr2j1.jpg',

    jengibre:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985545/jengibre_vkes7x.jpg',

    hierbabuena:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985504/hierbabuena_rt6y4s.jpg',

    eucalipto:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985468/eucalipto_lvk0j4.jpg',

    copal:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985438/copal_nyjq2m.jpg',

    canela:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782985210/canela_y4oggq.jpg',

    cafe:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782984737/cafe_hgydee.jpg',

    bugambilia:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782984702/bugambilia_fw1ghz.jpg',

    'anis-estrella':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782984652/anis-estrella_yjbscf.jpg',

    anis:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782984652/anis-estrella_yjbscf.jpg'
};

/*
 * Imágenes de los frascos utilizadas solamente en la vista de detalle.
 * Romero usa temporalmente el logo porque todavía no tiene fotografía de frasco.
 */
const DETAIL_IMAGE_MAP = {
    vaporub:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782984001/vaporub_tzmuam.jpg',

    toronjil:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983971/toronjil_letkhu.jpg',

    'rosas-de-castilla':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983936/rosas_tronmf.jpg',

    rosas:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983936/rosas_tronmf.jpg',

    'mirra-y-azafran':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983902/mirra_nqbvk8.jpg',

    menta:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983874/menta_aw4q5g.jpg',

    manzanilla:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983837/manzanilla_sbilg9.jpg',

    lavanda:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983812/lavanda_lrqqex.jpg',

    jengibre:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983783/jengibre_o0juhi.jpg',

    hierbabuena:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983747/hierbabuena_jrxvax.jpg',

    eucalipto:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983711/eucalipto_tsfh18.jpg',

    copal:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983678/copal_inih7l.jpg',

    canela:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983645/canela_ir0nem.jpg',

    cafe:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983121/cafe_txsxck.jpg',

    bugambilia:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983090/bugambilia_spjlc7.jpg',

    'anis-estrella':
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983048/anis_gp1gnk.jpg',

    anis:
        'https://res.cloudinary.com/doetag8zp/image/upload/v1782983048/anis_gp1gnk.jpg'
};

const FALLBACK_PRODUCT_DATA = [
    {
        id: 'fallback-toronjil',
        name: 'Toronjil',
        slug: 'toronjil',
        description:
            'Inhalador aromático personal de notas cítricas y herbales, ideal para acompañar pausas de calma y relajación.',
        category: 'linea-insomnio',
        benefits: [
            'Sensación de calma',
            'Perfil cítrico y herbal',
            'Ideal para pausas de relajación'
        ],
        aromas: ['toronjil', 'melisa', 'cítrico', 'herbáceo'],
        price: 60,
        stockAvailable: 16,
        rating: 4.8,
        reviews: 124
    },
    {
        id: 'fallback-mirra-y-azafran',
        name: 'Mirra y Azafrán',
        slug: 'mirra-y-azafran',
        description:
            'Inhalador aromático personal de perfil resinoso y especiado, pensado para momentos de enfoque y bienestar.',
        category: 'linea-ansiedad-estres',
        benefits: [
            'Perfil resinoso y especiado',
            'Sensación envolvente',
            'Ideal para pausas conscientes'
        ],
        aromas: ['mirra', 'azafran', 'resina', 'especiado'],
        price: 60,
        stockAvailable: 23,
        rating: 4.9,
        reviews: 89
    },
    {
        id: 'fallback-copal',
        name: 'Copal',
        slug: 'copal',
        description:
            'Inhalador aromático personal de notas resinosas y amaderadas que acompaña momentos de pausa y concentración.',
        category: 'linea-estimulante',
        benefits: [
            'Perfil resinoso y amaderado',
            'Sensación de profundidad',
            'Acompaña momentos de introspección'
        ],
        aromas: ['copal', 'resina', 'amaderado', 'ritual'],
        price: 60,
        stockAvailable: 25,
        rating: 4.7,
        reviews: 156
    },
    {
        id: 'fallback-anis-estrella',
        name: 'Anís Estrella',
        slug: 'anis-estrella',
        description:
            'Inhalador aromático personal de notas dulces y especiadas, con una sensación cálida y reconfortante.',
        category: 'linea-ansiedad-estres',
        benefits: [
            'Perfil dulce y especiado',
            'Sensación cálida',
            'Acompaña la relajación'
        ],
        aromas: ['anis', 'especiado', 'dulce', 'estrella'],
        price: 60,
        stockAvailable: 25,
        rating: 4.6,
        reviews: 98
    },
    {
        id: 'fallback-eucalipto',
        name: 'Eucalipto',
        slug: 'eucalipto',
        description:
            'Inhalador aromático personal de perfil mentolado que brinda una sensación fresca al respirar.',
        category: 'linea-verde',
        benefits: [
            'Sensación de frescura',
            'Perfil mentolado',
            'Acompaña respiraciones conscientes'
        ],
        aromas: ['eucalipto', 'mentolado', 'fresco', 'respiratorio'],
        price: 60,
        stockAvailable: 25,
        rating: 4.9,
        reviews: 234
    },
    {
        id: 'fallback-lavanda',
        name: 'Lavanda',
        slug: 'lavanda',
        description:
            'Inhalador aromático personal de notas florales suaves, ideal para acompañar momentos de calma y descanso.',
        category: 'linea-insomnio',
        benefits: [
            'Sensación de calma',
            'Perfil floral suave',
            'Acompaña la rutina de descanso'
        ],
        aromas: ['lavanda', 'floral', 'calmante', 'suave'],
        price: 60,
        stockAvailable: 19,
        rating: 4.8,
        reviews: 187
    },
    {
        id: 'fallback-menta',
        name: 'Menta',
        slug: 'menta',
        description:
            'Inhalador aromático personal de frescura intensa, pensado para acompañar momentos de atención y energía.',
        category: 'linea-verde',
        benefits: [
            'Sensación refrescante',
            'Perfil mentolado intenso',
            'Acompaña momentos de enfoque'
        ],
        aromas: ['menta', 'fresco', 'mentolado', 'estimulante'],
        price: 60,
        stockAvailable: 25,
        rating: 4.7,
        reviews: 145
    },
    {
        id: 'fallback-romero',
        name: 'Romero',
        slug: 'romero',
        description:
            'Inhalador aromático personal de notas herbales y verdes, ideal para acompañar momentos de claridad y enfoque.',
        category: 'linea-resfriado',
        benefits: [
            'Perfil herbal y verde',
            'Sensación vigorizante',
            'Acompaña la concentración'
        ],
        aromas: ['romero', 'herbáceo', 'verde', 'mediterraneo'],
        price: 60,
        stockAvailable: 25,
        rating: 4.6,
        reviews: 112
    },
    {
        id: 'fallback-canela',
        name: 'Canela',
        slug: 'canela',
        description:
            'Inhalador aromático personal de notas calidas y especiadas que brinda una experiencia reconfortante.',
        category: 'linea-resfriado',
        benefits: [
            'Sensación cálida',
            'Perfil dulce y especiado',
            'Acompaña momentos de confort'
        ],
        aromas: ['canela', 'especiado', 'cálido', 'dulce'],
        price: 60,
        stockAvailable: 25,
        rating: 4.7,
        reviews: 134
    },
    {
        id: 'fallback-jengibre',
        name: 'Jengibre',
        slug: 'jengibre',
        description:
            'Inhalador aromático personal de perfil cálido y especiado, pensado para una experiencia vigorizante.',
        category: 'linea-resfriado',
        benefits: [
            'Sensación revitalizante',
            'Perfil cálido y especiado',
            'Acompaña momentos de actividad'
        ],
        aromas: ['jengibre', 'picante', 'cálido', 'especiado'],
        price: 60,
        stockAvailable: 25,
        rating: 4.8,
        reviews: 98
    },
    {
        id: 'fallback-cafe',
        name: 'Café',
        slug: 'cafe',
        description:
            'Inhalador aromático personal de notas tostadas e intensas, ideal para acompañar momentos de energía y atención.',
        category: 'linea-estimulante',
        benefits: [
            'Perfil tostado e intenso',
            'Sensación energica',
            'Acompaña momentos de enfoque'
        ],
        aromas: ['cafe', 'tostado', 'intenso', 'estimulante'],
        price: 60,
        stockAvailable: 21,
        rating: 5,
        reviews: 1
    },
    {
        id: 'fallback-hierbabuena',
        name: 'Hierbabuena',
        slug: 'hierbabuena',
        description:
            'Inhalador aromático personal de perfil verde y mentolado, con una sensación suave y refrescante.',
        category: 'linea-verde',
        benefits: [
            'Frescura suave',
            'Perfil herbal y mentolado',
            'Acompaña respiraciones pausadas'
        ],
        aromas: ['hierbabuena', 'menta suave', 'fresco', 'herbal'],
        price: 60,
        stockAvailable: 25,
        rating: 4.6,
        reviews: 89
    },
    {
        id: 'fallback-vaporub',
        name: 'Vaporub',
        slug: 'vaporub',
        description:
            'Inhalador aromático personal de perfil mentolado intenso, pensado para brindar una sensación fresca al respirar.',
        category: 'linea-verde',
        benefits: [
            'Frescura mentolada intensa',
            'Sensación fresca al inhalar',
            'Acompaña respiraciones conscientes'
        ],
        aromas: ['vaporub', 'mentolado', 'respiratorio', 'fresco'],
        price: 60,
        stockAvailable: 25,
        rating: 4.9,
        reviews: 278
    },
    {
        id: 'fallback-rosas-de-castilla',
        name: 'Rosas de Castilla',
        slug: 'rosas-de-castilla',
        description:
            'Inhalador aromático personal de notas florales suaves, ideal para acompañar respiraciones tranquilas y momentos de calma.',
        category: 'linea-ansiedad-estres',
        benefits: [
            'Perfil floral suave',
            'Sensación reconfortante',
            'Acompaña momentos de calma'
        ],
        aromas: ['rosa', 'floral', 'delicado', 'suave'],
        price: 60,
        stockAvailable: 5,
        rating: 4.5,
        reviews: 2
    },
    {
        id: 'fallback-bugambilia',
        name: 'Bugambilia',
        slug: 'bugambilia',
        description:
            'Inhalador aromático personal de perfil floral y verde, pensado para una sensación suave y fresca al respirar.',
        category: 'linea-resfriado',
        benefits: [
            'Perfil floral y verde',
            'Sensación fresca y ligera',
            'Acompaña respiraciones pausadas'
        ],
        aromas: ['bugambilia', 'floral', 'verde', 'suave'],
        price: 60,
        stockAvailable: 25,
        rating: 4.7,
        reviews: 123
    },
    {
        id: 'fallback-manzanilla',
        name: 'Manzanilla',
        slug: 'manzanilla',
        description:
            'Inhalador aromático personal de notas florales suaves, ideal para acompañar momentos de relajación y descanso.',
        category: 'linea-ansiedad-estres',
        benefits: [
            'Sensación de calma',
            'Perfil floral suave',
            'Acompaña la rutina de descanso'
        ],
        aromas: ['manzanilla', 'floral suave', 'calmante', 'dulce'],
        price: 60,
        stockAvailable: 25,
        rating: 4.8,
        reviews: 198
    }
];

function parseEndpointList(value, fallback) {
    if (typeof value !== 'string' || !value.trim()) {
        return fallback;
    }

    return value
        .split(',')
        .map(function(endpoint) {
            return endpoint.trim();
        })
        .filter(Boolean);
}

function normalizeBaseApiUrl(value) {
    const rawValue = String(value || '').trim();
    const withoutTrailingSlash = rawValue.replace(/\/+$/, '');

    return withoutTrailingSlash.replace(/\/api$/i, '');
}

function normalizeEndpoint(endpoint) {
    const safeEndpoint = String(endpoint || '').trim();

    if (!safeEndpoint) {
        return '/';
    }

    if (safeEndpoint.startsWith('http')) {
        return safeEndpoint;
    }

    return safeEndpoint.startsWith('/')
        ? safeEndpoint
        : '/' + safeEndpoint;
}

function buildApiUrl(endpoint, query) {
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    const url = new URL(
        normalizedEndpoint.startsWith('http')
            ? normalizedEndpoint
            : API_URL + normalizedEndpoint
    );

    if (query && typeof query === 'object') {
        Object.keys(query).forEach(function(key) {
            const value = query[key];

            if (
                value !== undefined &&
                value !== null &&
                String(value) !== ''
            ) {
                url.searchParams.set(key, String(value));
            }
        });
    }

    return url.toString();
}

function maskAccessCode(code) {
    const cleanCode = normalizeAccessCode(code);

    if (!cleanCode) {
        return 'empty';
    }

    return '*'.repeat(Math.max(0, cleanCode.length - 2)) +
        cleanCode.slice(-2);
}

function requestJson(method, endpoint, options) {
    const requestOptions = options || {};
    const payload =
        requestOptions.body !== undefined
            ? JSON.stringify(requestOptions.body)
            : null;

    const url = buildApiUrl(
        endpoint,
        requestOptions.query
    );

    return new Promise(function(resolve, reject) {
        const headers = Object.assign(
            {
                Accept: 'application/json',
                'User-Agent': 'INHALEX-Alexa-Skill'
            },
            requestOptions.headers || {}
        );

        if (payload) {
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(payload);
        }

        if (requestOptions.accessToken) {
            headers.Authorization =
                'Bearer ' + requestOptions.accessToken;
        }

        const parsedUrl = new URL(url);
        const httpOptions = {
            method: method,
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            port: parsedUrl.port || 443,
            protocol: parsedUrl.protocol,
            headers: headers
        };

        const request = https.request(httpOptions, function(response) {
            let responseBody = '';

            if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {
                const redirectUrl = response.headers.location.startsWith('http')
                    ? response.headers.location
                    : API_URL + response.headers.location;

                response.resume();
                resolve(
                    requestJson(
                        method,
                        redirectUrl,
                        requestOptions
                    )
                );
                return;
            }

            response.on('data', function(chunk) {
                responseBody += chunk;
            });

            response.on('end', function() {
                if (
                    response.statusCode < 200 ||
                    response.statusCode >= 300
                ) {
                    const error = new Error(
                        'El backend respondió con código ' +
                        response.statusCode +
                        '.'
                    );
                    error.statusCode = response.statusCode;
                    error.responseBody = responseBody;
                    error.endpoint = endpoint;
                    error.url = url;
                    reject(error);
                    return;
                }

                if (!responseBody.trim()) {
                    resolve({});
                    return;
                }

                try {
                    resolve(JSON.parse(responseBody));
                } catch (error) {
                    reject(
                        new Error(
                            'La respuesta del backend no contiene JSON válido.'
                        )
                    );
                }
            });
        });

        request.setTimeout(
            requestOptions.timeoutMs || ACCOUNT_TIMEOUT_MS,
            function() {
                request.destroy(
                    new Error('El backend tardó demasiado en responder.')
                );
            }
        );

        request.on('error', function(error) {
            reject(error);
        });

        if (payload) {
            request.write(payload);
        }

        request.end();
    });
}

async function requestFirstAvailable(method, endpoints, options) {
    let lastError = null;

    for (const endpoint of endpoints) {
        try {
            return await requestJson(
                method,
                endpoint,
                options
            );
        } catch (error) {
            lastError = error;

            console.log(
                'INHALEX_API_REQUEST_FAILED',
                JSON.stringify({
                    method: method,
                    endpoint: endpoint,
                    statusCode: error.statusCode || null,
                    message: error.message || '',
                    responseBody: error.responseBody || ''
                })
            );

            if (
                error.statusCode !== 404 &&
                error.statusCode !== 405
            ) {
                throw error;
            }
        }
    }

    throw (
        lastError ||
        new Error('No hay endpoints disponibles para esta acción.')
    );
}

function getJson(url) {
    return new Promise(function(resolve, reject) {
        const requestOptions = {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'INHALEX-Alexa-Skill'
            }
        };

        const request = https.get(url, requestOptions, function(response) {
            let responseBody = '';

            if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {
                const redirectUrl = response.headers.location.startsWith('http')
                    ? response.headers.location
                    : API_URL + response.headers.location;

                response.resume();
                resolve(getJson(redirectUrl));
                return;
            }

            response.on('data', function(chunk) {
                responseBody += chunk;
            });

            response.on('end', function() {
                if (
                    response.statusCode < 200 ||
                    response.statusCode >= 300
                ) {
                    reject(
                        new Error(
                            'El backend respondió con código ' +
                            response.statusCode +
                            '.'
                        )
                    );
                    return;
                }

                try {
                    resolve(JSON.parse(responseBody));
                } catch (error) {
                    reject(
                        new Error(
                            'La respuesta del backend no contiene JSON válido.'
                        )
                    );
                }
            });
        });

        request.setTimeout(PRODUCTS_TIMEOUT_MS, function() {
            request.destroy(
                new Error('El backend tardó demasiado en responder.')
            );
        });

        request.on('error', function(error) {
            reject(error);
        });
    });
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildUnavailableProductSpeech(productName) {
    const requestedProduct = String(productName || '')
        .trim()
        .replace(/^(?:el|la)\s+/i, '')
        .replace(/^(?:aroma|esencia)(?:\s+de)?\s+/i, '')
        .replace(/[.!?¡¿]+$/g, '')
        .trim();

    if (!requestedProduct) {
        return (
            'No pude identificar el aroma que solicitaste. ' +
            'Te mostraré los aromas que tenemos disponibles.'
        );
    }

    return (
        'Por el momento, el aroma de ' +
        requestedProduct +
        ' no forma parte de nuestro catálogo. ' +
        'Te mostraré los aromas que tenemos disponibles.'
    );
}

function makeSlug(value) {
    return normalizeText(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

const PRODUCT_ALIAS_MAP = {
    'torongil': 'toronjil',

    'azafran': 'mirra-y-azafran',
    'mirra': 'mirra-y-azafran',
    'mirra-azafran': 'mirra-y-azafran',
    'mirra-con-azafran': 'mirra-y-azafran',
    'mira-y-azafran': 'mirra-y-azafran',

    'resina-copal': 'copal',

    'anis': 'anis-estrella',
    'anis-estrellado': 'anis-estrella',
    'anis-de-estrella': 'anis-estrella',

    'eucalito': 'eucalipto',

    'labanda': 'lavanda',
    'la-banda': 'lavanda',
    'floral-lavanda': 'lavanda',

    'cafe': 'cafe',
    'cafecito': 'cafe',

    'gingibre': 'jengibre',
    'gengibre': 'jengibre',
    'jenjibre': 'jengibre',

    'hierba-buena': 'hierbabuena',
    'yerbabuena': 'hierbabuena',
    'yerba-buena': 'hierbabuena',

    'melisa': 'toronjil',

    'rosa-de-castilla': 'rosas-de-castilla',
    'rosa-castilla': 'rosas-de-castilla',
    'rosas-castilla': 'rosas-de-castilla',
    'rosas': 'rosas-de-castilla',

    'vapo-rub': 'vaporub',
    'vapor-rub': 'vaporub',
    'vaporu': 'vaporub',
    'vaporizante': 'vaporub',

    'buganvilia': 'bugambilia',
    'buganvilla': 'bugambilia',
    'bugambilias': 'bugambilia'
};

function normalizeProductQuery(value) {
    let querySlug = makeSlug(value);

    if (!querySlug) {
        return '';
    }

    for (let iteration = 0; iteration < 8; iteration += 1) {
        const aliasedSlug = PRODUCT_ALIAS_MAP[querySlug];

        if (aliasedSlug) {
            return aliasedSlug;
        }

        let nextSlug = querySlug;

        if (/(?:-natural|-fresco|-fresca|-por-favor)$/.test(nextSlug)) {
            nextSlug = nextSlug.replace(
                /(?:-natural|-fresco|-fresca|-por-favor)$/,
                ''
            );
        } else if (/^(?:aroma|esencia)(?:-de)?-/.test(nextSlug)) {
            nextSlug = nextSlug.replace(
                /^(?:aroma|esencia)(?:-de)?-/,
                ''
            );
        } else if (/^de-/.test(nextSlug)) {
            nextSlug = nextSlug.replace(/^de-/, '');
        } else if (/^(?:el|la|los|las|un|una)-/.test(nextSlug)) {
            nextSlug = nextSlug.replace(
                /^(?:el|la|los|las|un|una)-/,
                ''
            );
        }

        if (!nextSlug || nextSlug === querySlug) {
            break;
        }

        querySlug = nextSlug;
    }

    return PRODUCT_ALIAS_MAP[querySlug] || querySlug;
}

function normalizeBenefits(benefits) {
    if (Array.isArray(benefits)) {
        return benefits
            .map(function(benefit) {
                if (typeof benefit === 'string') {
                    return benefit.trim();
                }

                if (benefit && typeof benefit === 'object') {
                    return String(
                        benefit.text ||
                        benefit.name ||
                        benefit.nombre ||
                        ''
                    ).trim();
                }

                return '';
            })
            .filter(Boolean);
    }

    if (typeof benefits === 'string' && benefits.trim()) {
        return benefits
            .split(',')
            .map(function(benefit) {
                return benefit.trim();
            })
            .filter(Boolean);
    }

    return [];
}

function normalizeAromas(aromas) {
    if (Array.isArray(aromas)) {
        return aromas.map(String).filter(Boolean);
    }

    if (typeof aromas === 'string' && aromas.trim()) {
        return aromas
            .split(',')
            .map(function(aroma) {
                return aroma.trim();
            })
            .filter(Boolean);
    }

    return [];
}

function softenHealthClaims(value) {
    if (typeof value !== 'string' || !value.trim()) {
        return value;
    }

    return value
        .replace(
            /despeja (las )?v[ií]as respiratorias/gi,
            'aporta una sensación fresca para respirar con mas comodidad'
        )
        .replace(
            /alivia congesti[oó]n/gi,
            'acompaña una sensación de respiración despejada'
        )
        .replace(
            /alivia s[ií]ntomas de gripe y resfriado/gi,
            'acompaña tu bienestar en temporada de gripe y resfriado'
        )
        .replace(
            /alivia la tos/gi,
            'aporta una sensación herbal reconfortante'
        )
        .replace(
            /alivia gripe/gi,
            'acompaña temporadas de resfriado'
        )
        .replace(
            /alivia dolor de cabeza/gi,
            'acompaña momentos de tension cotidiana'
        )
        .replace(
            /alivia tensi[oó]n/gi,
            'Invita al descanso'
        )
        .replace(
            /alivia el estr[eé]s/gi,
            'acompaña momentos de estres'
        )
        .replace(
            /reduce ansiedad/gi,
            'acompaña momentos de calma'
        )
        .replace(
            /descongestionante/gi,
            'mentolada y reconfortante'
        )
        .replace(
            /expectorante/gi,
            'herbal tradicional'
        )
        .replace(
            /fortalece (el sistema respiratorio|inmunidad)/gi,
            'acompaña tu rutina de bienestar'
        )
        .replace(
            /estimula la circulaci[oó]n/gi,
            'ofrece una sensación cálida y reconfortante'
        )
        .replace(
            /mejora circulaci[oó]n/gi,
            'aporta una sensación cálida y revitalizante'
        )
        .replace(
            /mejora (la )?concentraci[oó]n( y la memoria)?/gi,
            'acompaña momentos de enfoque'
        )
        .replace(
            /fortalece memoria/gi,
            'acompaña momentos de enfoque'
        )
        .replace(
            /calma el est[oó]mago/gi,
            'ofrece una sensación digestiva suave'
        )
        .replace(
            /calma emociones/gi,
            'acompaña momentos emocionales con suavidad'
        );
}

function softenBenefits(benefits) {
    return normalizeBenefits(benefits)
        .map(softenHealthClaims)
        .filter(Boolean);
}

function normalizeLine(category) {
    const normalizedCategory = makeSlug(category);

    const aliases = {
        verde: 'linea-verde',
        'linea-verde': 'linea-verde',

        resfriado: 'linea-resfriado',
        'linea-resfriado': 'linea-resfriado',

        estimulante: 'linea-estimulante',
        'linea-estimulante': 'linea-estimulante',

        insomnio: 'linea-insomnio',
        'linea-insomnio': 'linea-insomnio',

        'ansiedad-estres': 'linea-ansiedad-estres',
        'ansiedad-y-estres': 'linea-ansiedad-estres',
        'linea-ansiedad-estres': 'linea-ansiedad-estres',
        'linea-ansiedad-y-estres': 'linea-ansiedad-estres'
    };

    return aliases[normalizedCategory] || normalizedCategory || 'linea-verde';
}

function getLineTitle(lineId) {
    const normalizedLine = normalizeLine(lineId);

    const titles = {
        'linea-verde': 'Línea Verde',
        'linea-resfriado': 'Línea Resfriado',
        'linea-estimulante': 'Línea Estimulante',
        'linea-insomnio': 'Línea Insomnio',
        'linea-ansiedad-estres': 'Línea Ansiedad y Estrés'
    };

    return titles[normalizedLine] || 'Línea INHALEX';
}

function getLineDescription(lineId) {
    const normalizedLine = normalizeLine(lineId);

    const descriptions = {
        'linea-verde':
            'Aromas herbales, frescos y naturales para tu bienestar diario.',

        'linea-resfriado':
            'Aromas mentolados y reconfortantes para apoyar tu respiración.',

        'linea-estimulante':
            'Aromas frescos y energizantes para activar tus sentidos.',

        'linea-insomnio':
            'Aromas suaves para favorecer el descanso y acompañar un sueño reparador.',

        'linea-ansiedad-estres':
            'Aromas naturales para relajarte, respirar mejor y sentir calma.'
    };

    return (
        descriptions[normalizedLine] ||
        'Explora los aromas naturales disponibles en esta línea.'
    );
}

function getLineImage(lineId) {
    const normalizedLine = normalizeLine(lineId);
    return LINE_IMAGE_MAP[normalizedLine] || LOGO_URL;
}

function getAromaImage(productSlug) {
    const normalizedSlug = makeSlug(productSlug);
    return AROMA_IMAGE_MAP[normalizedSlug] || LOGO_URL;
}

function getDetailImage(productSlug) {
    const normalizedSlug = makeSlug(productSlug);

    if (normalizedSlug === 'romero') {
        return LOGO_URL;
    }

    return DETAIL_IMAGE_MAP[normalizedSlug] || LOGO_URL;
}

function normalizeProduct(product) {
    const rawName =
        product.name ||
        product.nombre ||
        product.title ||
        'Producto INHALEX';

    const slug = makeSlug(product.slug || rawName);

    const lineId = normalizeLine(
        product.category ||
        product.categoria ||
        product.linea ||
        product.line ||
        ''
    );

    const price = Number(
        product.price ||
        product.precio ||
        product.cost ||
        0
    );

    const stock = Number(
        product.stockAvailable ??
        product.stock ??
        product.existencia ??
        product.cantidad ??
        0
    );

    const rating = Number(product.rating || product.calificacion || 4.8);
    const reviews = Number(product.reviews || product.resenas || 0);
    const rawDescription =
        product.description ||
        product.descripcion ||
        'Producto natural de INHALEX.';

    const rawLongDescription =
        product.longDescription ||
        product.descripcionLarga ||
        rawDescription;

    const offerPriceValue = Number(
        product.offerPrice ??
        product.precioOferta ??
        product.salePrice ??
        product.discountPrice ??
        product.promoPrice ??
        0
    );

    const promoActive =
        Boolean(
            product.promoActive ||
            product.promocionActiva ||
            product.onSale ||
            product.enOferta
        ) ||
        (
            Number.isFinite(offerPriceValue) &&
            offerPriceValue > 0 &&
            offerPriceValue < price
        );

    return {
        id: product._id || product.id || slug,

        name: rawName,
        slug: slug,

        description: softenHealthClaims(rawDescription),

        longDescription: softenHealthClaims(rawLongDescription),

        price: price,
        offerPrice:
            Number.isFinite(offerPriceValue) && offerPriceValue > 0
                ? offerPriceValue
                : price,
        currency: product.currency || product.moneda || 'MXN',
        promoActive: promoActive,

        category: lineId,
        categoryTitle: getLineTitle(lineId),

        benefits: softenBenefits(
            product.benefits || product.beneficios
        ),

        aromas: normalizeAromas(product.aromas),

        stockAvailable: stock,

        presentation:
            product.presentation ||
            product.presentacion ||
            '10 ml',

        origin:
            product.origin ||
            product.origen ||
            '100% natural',

        rating: Number.isFinite(rating) ? rating : 4.8,
        reviews: Number.isFinite(reviews) ? reviews : 0,

        /*
         * Imagen botánica para la vista catálogo.
         */
        image: getAromaImage(slug),

        /*
         * Imagen del frasco para la vista detalle.
         */
        detailImage: getDetailImage(slug)
    };
}

function getFallbackProducts() {
    return FALLBACK_PRODUCT_DATA.map(normalizeProduct);
}

async function getProducts() {
    try {
        const data = await getJson(API_URL + PRODUCTS_ENDPOINT);

        const products =
            data.items ||
            data.products ||
            data.productos ||
            data.data ||
            data.result ||
            data;

        if (!Array.isArray(products)) {
            console.log(
                'El backend respondió correctamente, pero no contiene un arreglo de productos.'
            );

            return getFallbackProducts();
        }

        if (products.length === 0) {
            console.log(
                'El backend respondio sin productos. Se usara el catalogo local de respaldo.'
            );

            return getFallbackProducts();
        }

        return products.map(normalizeProduct);
    } catch (error) {
        console.log(
            'Error al obtener los productos:',
            error.message
        );

        return getFallbackProducts();
    }
}

function findProduct(products, productName) {
    const querySlug = normalizeProductQuery(productName);

    if (!querySlug || !Array.isArray(products)) {
        return null;
    }

    return products.find(function(product) {
        if (!product || typeof product !== 'object') {
            return false;
        }

        return [
            product.name,
            product.slug,
            product.id
        ]
            .map(makeSlug)
            .filter(Boolean)
            .includes(querySlug);
    }) || null;
}

function getOfferProducts(products) {
    if (!Array.isArray(products)) {
        return [];
    }

    return products.filter(function(product) {
        const price = Number(product.price || 0);
        const offerPrice = Number(product.offerPrice || 0);

        return Boolean(product.promoActive) ||
            (
                Number.isFinite(price) &&
                Number.isFinite(offerPrice) &&
                offerPrice > 0 &&
                offerPrice < price
            );
    });
}

const DIGIT_WORDS = {
    cero: '0',
    zero: '0',
    oh: '0',
    uno: '1',
    un: '1',
    una: '1',
    dos: '2',
    tres: '3',
    cuatro: '4',
    cinco: '5',
    seis: '6',
    siete: '7',
    ocho: '8',
    nueve: '9'
};

const NUMBER_WORDS = {
    cero: 0,
    uno: 1,
    un: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    dieciseis: 16,
    diecisiete: 17,
    dieciocho: 18,
    diecinueve: 19,
    veinte: 20,
    veintiuno: 21,
    veintiun: 21,
    veintidos: 22,
    veintitres: 23,
    veinticuatro: 24,
    veinticinco: 25,
    veintiseis: 26,
    veintisiete: 27,
    veintiocho: 28,
    veintinueve: 29,
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    sesenta: 60,
    setenta: 70,
    ochenta: 80,
    noventa: 90,
    cien: 100,
    ciento: 100,
    doscientos: 200,
    trescientos: 300,
    cuatrocientos: 400,
    quinientos: 500,
    seiscientos: 600,
    setecientos: 700,
    ochocientos: 800,
    novecientos: 900
};

function tokenizeCodeInput(value) {
    return normalizeText(value)
        .replace(/[^a-z0-9]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function normalizeSpokenDigitSequence(value) {
    return tokenizeCodeInput(value)
        .map(function(token) {
            return DIGIT_WORDS[token] || '';
        })
        .join('')
        .slice(0, ACCESS_CODE_LENGTH);
}

function parseSpanishNumberCode(value) {
    const tokens = tokenizeCodeInput(value);
    let total = 0;
    let group = 0;
    let foundNumber = false;

    tokens.forEach(function(token) {
        if (token === 'y') {
            return;
        }

        if (token === 'millon' || token === 'millones') {
            total += (group || 1) * 1000000;
            group = 0;
            foundNumber = true;
            return;
        }

        if (token === 'mil') {
            total += (group || 1) * 1000;
            group = 0;
            foundNumber = true;
            return;
        }

        if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, token)) {
            group += NUMBER_WORDS[token];
            foundNumber = true;
        }
    });

    if (!foundNumber) {
        return '';
    }

    const digits = String(total + group);

    if (digits.length > ACCESS_CODE_LENGTH) {
        return digits.slice(0, ACCESS_CODE_LENGTH);
    }

    return digits.padStart(ACCESS_CODE_LENGTH, '0');
}

function normalizeAccessCode(value) {
    const rawValue = String(value || '');
    const directDigits = rawValue
        .replace(/\D/g, '')
        .slice(0, ACCESS_CODE_LENGTH);

    if (directDigits.length === ACCESS_CODE_LENGTH) {
        return directDigits;
    }

    const spokenDigits = normalizeSpokenDigitSequence(rawValue);

    if (spokenDigits.length === ACCESS_CODE_LENGTH) {
        return spokenDigits;
    }

    const parsedNumber = parseSpanishNumberCode(rawValue);

    if (parsedNumber.length === ACCESS_CODE_LENGTH) {
        return parsedNumber;
    }

    return directDigits || spokenDigits;
}

function getNestedValue(source, paths) {
    for (const path of paths) {
        const keys = path.split('.');
        let current = source;

        for (const key of keys) {
            if (
                !current ||
                typeof current !== 'object' ||
                current[key] === undefined
            ) {
                current = null;
                break;
            }

            current = current[key];
        }

        if (current !== null && current !== undefined) {
            return current;
        }
    }

    return undefined;
}

function normalizeAccountResponse(data) {
    const response = data && typeof data === 'object'
        ? data
        : {};

    const user =
        getNestedValue(
            response,
            [
                'user',
                'usuario',
                'profile',
                'perfil',
                'account',
                'cuenta',
                'data.user',
                'data.usuario',
                'data.profile',
                'result.user',
                'result.usuario'
            ]
        ) || {};

    const accessToken =
        getNestedValue(
            response,
            [
                'accessToken',
                'token',
                'sessionToken',
                'alexaToken',
                'data.accessToken',
                'data.token',
                'data.sessionToken',
                'result.accessToken',
                'result.token'
            ]
        ) || '';

    const userName =
        getNestedValue(
            user,
            [
                'name',
                'nombre',
                'fullName',
                'displayName',
                'username'
            ]
        ) ||
        getNestedValue(
            response,
            [
                'name',
                'nombre',
                'userName',
                'displayName',
                'data.name',
                'data.nombre'
            ]
        ) ||
        '';

    const userId =
        getNestedValue(
            user,
            [
                'id',
                '_id',
                'userId',
                'usuarioId'
            ]
        ) ||
        getNestedValue(
            response,
            [
                'userId',
                'usuarioId',
                'id',
                '_id',
                'data.userId',
                'data.usuarioId'
            ]
        ) ||
        '';

    const linked =
        Boolean(
            response.linked ||
            response.vinculado ||
            response.success ||
            response.ok ||
            accessToken ||
            userName ||
            userId
        );

    return {
        linked: linked,
        accessToken: String(accessToken || ''),
        userId: String(userId || ''),
        userName: String(userName || ''),
        raw: response
    };
}

function buildAccountPayload(account, extra) {
    const safeAccount =
        account && typeof account === 'object'
            ? account
            : {};

    return Object.assign(
        {
            alexaUserId: safeAccount.alexaUserId || '',
            userId: safeAccount.userId || '',
            source: 'alexa'
        },
        extra || {}
    );
}

function buildAccountQuery(account) {
    const safeAccount =
        account && typeof account === 'object'
            ? account
            : {};

    return {
        alexaUserId: safeAccount.alexaUserId || '',
        userId: safeAccount.userId || ''
    };
}

function isMongoObjectId(value) {
    return /^[a-f0-9]{24}$/i.test(String(value || '').trim());
}

function buildRemoteProductPayload(product, extra) {
    const safeProduct =
        product && typeof product === 'object'
            ? product
            : {};
    const slug = String(safeProduct.slug || '').trim();
    const id = String(safeProduct.id || safeProduct._id || '').trim();
    const payload = Object.assign(
        {
            productSlug: slug,
            slug: slug,
            product: {
                slug: slug,
                name: safeProduct.name,
                price: safeProduct.price,
                image: safeProduct.image
            }
        },
        extra || {}
    );

    if (isMongoObjectId(id)) {
        payload.productId = id;
        payload.product.id = id;
    }

    return payload;
}

async function linkAlexaAccount(code, alexaUserId) {
    const cleanCode = normalizeAccessCode(code);

    console.log(
        'INHALEX_ALEXA_LINK_ATTEMPT',
        JSON.stringify({
            apiUrl: API_URL,
            codeMask: maskAccessCode(cleanCode),
            codeLength: cleanCode.length,
            expectedLength: ACCESS_CODE_LENGTH,
            alexaUserIdPresent: Boolean(alexaUserId)
        })
    );

    if (cleanCode.length !== ACCESS_CODE_LENGTH) {
        return {
            linked: false,
            error: 'INVALID_CODE'
        };
    }

    const data = await requestFirstAvailable(
        'POST',
        LINK_ENDPOINTS,
        {
            body: {
                code: cleanCode,
                alexaUserId: alexaUserId || '',
                source: 'alexa'
            }
        }
    );

    return normalizeAccountResponse(data);
}

async function getAlexaProfile(account) {
    const safeAccount =
        account && typeof account === 'object'
            ? account
            : {};
    const profileEndpoints = PROFILE_ENDPOINTS.filter(function(endpoint) {
        return normalizeEndpoint(endpoint) !== '/api/auth/me';
    });

    if (safeAccount.accessToken) {
        try {
            const data = await requestJson(
                'GET',
                '/api/auth/me',
                {
                    query: buildAccountQuery(safeAccount),
                    accessToken: safeAccount.accessToken
                }
            );

            const profile = normalizeAccountResponse(data);

            return Object.assign(
                {},
                profile,
                {
                    accessToken:
                        profile.accessToken ||
                        safeAccount.accessToken ||
                        '',
                    alexaUserId: safeAccount.alexaUserId || ''
                }
            );
        } catch (error) {
            if (
                error.statusCode !== 401 &&
                error.statusCode !== 403
            ) {
                throw error;
            }

            console.log(
                'INHALEX_ALEXA_TOKEN_REFRESH_REQUIRED',
                JSON.stringify({
                    statusCode: error.statusCode || null,
                    alexaUserIdPresent: Boolean(safeAccount.alexaUserId)
                })
            );
        }
    }

    const data = await requestFirstAvailable(
        'GET',
        profileEndpoints,
        {
            query: buildAccountQuery(safeAccount),
            accessToken: ''
        }
    );

    const profile = normalizeAccountResponse(data);

    return Object.assign(
        {},
        profile,
        {
            accessToken:
                profile.accessToken ||
                safeAccount.accessToken ||
                '',
            alexaUserId: safeAccount.alexaUserId || ''
        }
    );
}

function extractRemoteItems(data, keys) {
    const response = data && typeof data === 'object'
        ? data
        : {};

    for (const key of keys) {
        const value = getNestedValue(response, [key]);

        if (Array.isArray(value)) {
            return value;
        }
    }

    if (Array.isArray(data)) {
        return data;
    }

    return [];
}

async function getRemoteFavorites(account) {
    const data = await requestFirstAvailable(
        'GET',
        FAVORITES_ENDPOINTS,
        {
            query: buildAccountQuery(account),
            accessToken: account && account.accessToken
        }
    );

    return extractRemoteItems(
        data,
        [
            'favorites',
            'favoritos',
            'items',
            'products',
            'productos',
            'data.favorites',
            'data.favoritos',
            'data.items',
            'result.favorites',
            'result.items'
        ]
    );
}

async function getRemoteBag(account) {
    const data = await requestFirstAvailable(
        'GET',
        BAG_ENDPOINTS,
        {
            query: buildAccountQuery(account),
            accessToken: account && account.accessToken
        }
    );

    return extractRemoteItems(
        data,
        [
            'bag',
            'cart',
            'bolsa',
            'items',
            'products',
            'productos',
            'data.bag',
            'data.cart',
            'data.bolsa',
            'data.items',
            'result.bag',
            'result.items'
        ]
    );
}

async function addRemoteFavorite(account, product) {
    return requestFirstAvailable(
        'POST',
        FAVORITES_ENDPOINTS,
        {
            body: buildAccountPayload(
                account,
                buildRemoteProductPayload(product)
            ),
            accessToken: account && account.accessToken
        }
    );
}

async function addRemoteBag(account, product, quantity) {
    return requestFirstAvailable(
        'POST',
        BAG_ENDPOINTS,
        {
            body: buildAccountPayload(
                account,
                buildRemoteProductPayload(
                    product,
                    {
                        quantity: Math.max(
                            1,
                            Math.round(Number(quantity || 1))
                        )
                    }
                )
            ),
            accessToken: account && account.accessToken
        }
    );
}

async function unlinkAlexaAccount(account) {
    return requestFirstAvailable(
        'DELETE',
        UNLINK_ENDPOINTS,
        {
            query: buildAccountQuery(account),
            accessToken: account && account.accessToken
        }
    );
}

function buildLines(products) {
    const lineIds = [
        'linea-verde',
        'linea-resfriado',
        'linea-estimulante',
        'linea-insomnio',
        'linea-ansiedad-estres'
    ];

    return lineIds.map(function(lineId) {
        const productCount = Array.isArray(products)
            ? products.filter(function(product) {
                return normalizeLine(product.category) === lineId;
            }).length
            : 0;

        const lineTitle = getLineTitle(lineId);

        return {
            id: lineId,
            name: lineTitle,
            lineTitle: lineTitle,
            description: getLineDescription(lineId),
            image: getLineImage(lineId),
            countText:
                productCount === 1
                    ? '1 aroma disponible'
                    : productCount > 1
                        ? productCount + ' aromas disponibles'
                        : 'Explorar aromas'
        };
    });
}

function filterProductsByLine(products, lineId) {
    if (!Array.isArray(products)) {
        return [];
    }

    const selectedLine = normalizeLine(lineId);

    return products.filter(function(product) {
        return normalizeLine(product.category) === selectedLine;
    });
}

module.exports = {
    API_URL,
    PRODUCTS_TIMEOUT_MS,
    ACCOUNT_TIMEOUT_MS,
    LOGO_URL,
    LINE_IMAGE_MAP,
    AROMA_IMAGE_MAP,
    DETAIL_IMAGE_MAP,
    PRODUCT_ALIAS_MAP,
    WELLNESS_DISCLAIMER,
    ACCESS_CODE_LENGTH,

    getProducts,
    getFallbackProducts,
    findProduct,
    getOfferProducts,
    getAlexaProfile,
    linkAlexaAccount,
    getRemoteFavorites,
    getRemoteBag,
    addRemoteFavorite,
    addRemoteBag,
    unlinkAlexaAccount,

    normalizeText,
    buildUnavailableProductSpeech,
    makeSlug,
    normalizeProductQuery,
    normalizeProduct,
    normalizeAccessCode,
    maskAccessCode,
    normalizeAccountResponse,
    normalizeLine,
    softenHealthClaims,

    getLineTitle,
    getLineDescription,
    getLineImage,

    buildLines,
    filterProductsByLine
};
