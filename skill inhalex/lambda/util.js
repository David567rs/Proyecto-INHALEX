const https = require('https');

const API_URL =
    process.env.INHALEX_API_URL ||
    'https://inhalex-backend.onrender.com';
const PRODUCTS_ENDPOINT = '/api/products';
const PRODUCTS_TIMEOUT_MS = Number(
    process.env.INHALEX_PRODUCTS_TIMEOUT_MS ||
    4000
);
const ACCOUNT_TIMEOUT_MS = Number(
    process.env.INHALEX_ACCOUNT_TIMEOUT_MS ||
    4500
);

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
        '/api/auth/me',
        '/api/alexa/profile',
        '/api/alexa/me',
        '/api/auth/alexa/me'
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
            'Frescura citrica y herbacea que alivia el estres y proporciona serenidad.',
        category: 'linea-insomnio',
        benefits: [
            'Alivia el estres',
            'Promueve la calma',
            'Aroma refrescante'
        ],
        aromas: ['toronjil', 'melisa', 'citrico', 'herbaceo'],
        price: 60,
        stockAvailable: 16,
        rating: 4.8,
        reviews: 124
    },
    {
        id: 'fallback-mirra-y-azafran',
        name: 'Mirra y Azafran',
        slug: 'mirra-y-azafran',
        description:
            'Combinacion exotica y sofisticada que eleva el espiritu y proporciona bienestar.',
        category: 'linea-ansiedad-estres',
        benefits: ['Aroma exotico', 'Eleva el espiritu', 'Sofisticado'],
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
            'Esencia ancestral purificadora que limpia el ambiente y proporciona paz interior.',
        category: 'linea-estimulante',
        benefits: [
            'Purifica el ambiente',
            'Promueve la meditacion',
            'Conexion espiritual'
        ],
        aromas: ['copal', 'resina', 'amaderado', 'ritual'],
        price: 60,
        stockAvailable: 25,
        rating: 4.7,
        reviews: 156
    },
    {
        id: 'fallback-anis-estrella',
        name: 'Anis Estrella',
        slug: 'anis-estrella',
        description:
            'Dulzura especiada unica que reconforta y proporciona calidez aromatica.',
        category: 'linea-ansiedad-estres',
        benefits: [
            'Aroma reconfortante',
            'Proporciona calidez',
            'Dulce y especiado'
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
            'Frescura mentolada que despeja las vias respiratorias y revitaliza los sentidos.',
        category: 'linea-verde',
        benefits: [
            'Despeja vias respiratorias',
            'Alivia congestion',
            'Revitaliza'
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
            'Aroma floral relajante que calma la mente y favorece el descanso profundo.',
        category: 'linea-insomnio',
        benefits: [
            'Calma la mente',
            'Favorece el descanso',
            'Alivia tension'
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
            'Frescura intensa que activa la mente y proporciona energia instantanea.',
        category: 'linea-verde',
        benefits: [
            'Activa la mente',
            'Proporciona energia',
            'Alivia dolor de cabeza'
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
            'Esencia herbacea vigorizante que mejora la concentracion y la memoria.',
        category: 'linea-resfriado',
        benefits: [
            'Mejora concentracion',
            'Fortalece memoria',
            'Vigorizante'
        ],
        aromas: ['romero', 'herbaceo', 'verde', 'mediterraneo'],
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
            'Calidez especiada que reconforta el cuerpo y estimula la circulacion.',
        category: 'linea-resfriado',
        benefits: [
            'Reconforta el cuerpo',
            'Estimula circulacion',
            'Aroma calido'
        ],
        aromas: ['canela', 'especiado', 'calido', 'dulce'],
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
            'Energia picante y revitalizante que activa el cuerpo y despeja la mente.',
        category: 'linea-resfriado',
        benefits: [
            'Revitalizante',
            'Despeja vias respiratorias',
            'Mejora circulacion'
        ],
        aromas: ['jengibre', 'picante', 'calido', 'especiado'],
        price: 60,
        stockAvailable: 25,
        rating: 4.8,
        reviews: 98
    },
    {
        id: 'fallback-cafe',
        name: 'Cafe',
        slug: 'cafe',
        description:
            'Aroma intenso y estimulante que despierta los sentidos y activa la mente.',
        category: 'linea-estimulante',
        benefits: ['Estimulante', 'Combate fatiga', 'Despierta los sentidos'],
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
            'Frescura suave y digestiva que calma el estomago y refresca el aliento.',
        category: 'linea-verde',
        benefits: ['Digestiva', 'Refresca el aliento', 'Aroma suave'],
        aromas: ['hierbabuena', 'menta suave', 'fresco', 'digestivo'],
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
            'Planta aromatica descongestionante que alivia sintomas de gripe y resfriado.',
        category: 'linea-verde',
        benefits: ['Descongestionante', 'Alivia gripe', 'Alivio inmediato'],
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
            'Delicadeza floral romantica que calma emociones y nutre el espiritu.',
        category: 'linea-ansiedad-estres',
        benefits: ['Calma emociones', 'Aroma romantico', 'Nutre el espiritu'],
        aromas: ['rosa', 'floral', 'romantico', 'suave'],
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
            'Esencia floral vibrante que alivia la tos y fortalece el sistema respiratorio.',
        category: 'linea-resfriado',
        benefits: ['Alivia la tos', 'Expectorante', 'Fortalece inmunidad'],
        aromas: ['bugambilia', 'floral', 'expectorante', 'respiratorio'],
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
            'Suavidad calmante que relaja el cuerpo y promueve el sueno reparador.',
        category: 'linea-ansiedad-estres',
        benefits: [
            'Calmante natural',
            'Promueve el sueno',
            'Reduce ansiedad'
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
        .trim();
}

function makeSlug(value) {
    return normalizeText(value)
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

const PRODUCT_ALIAS_MAP = {
    'azafran': 'mirra-y-azafran',
    'mirra': 'mirra-y-azafran',
    'mirra-azafran': 'mirra-y-azafran',
    'mirra-con-azafran': 'mirra-y-azafran',

    'anis': 'anis-estrella',
    'anis-estrellado': 'anis-estrella',

    'cafe': 'cafe',
    'cafecito': 'cafe',

    'gingibre': 'jengibre',

    'hierba-buena': 'hierbabuena',

    'melisa': 'toronjil',

    'rosa-de-castilla': 'rosas-de-castilla',
    'rosas-castilla': 'rosas-de-castilla',
    'rosas': 'rosas-de-castilla',

    'vapo-rub': 'vaporub',
    'vapor-rub': 'vaporub',
    'vaporizante': 'vaporub'
};

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
            'aporta una sensacion fresca para respirar con mas comodidad'
        )
        .replace(
            /alivia congesti[oó]n/gi,
            'acompaña una sensacion de respiracion despejada'
        )
        .replace(
            /alivia s[ií]ntomas de gripe y resfriado/gi,
            'acompaña tu bienestar en temporada de gripe y resfriado'
        )
        .replace(
            /alivia la tos/gi,
            'aporta una sensacion herbal reconfortante'
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
            'ofrece una sensacion calida y reconfortante'
        )
        .replace(
            /mejora circulaci[oó]n/gi,
            'aporta una sensacion calida y revitalizante'
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
            'ofrece una sensacion digestiva suave'
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
    const searchValue = normalizeText(productName);
    const searchSlug = makeSlug(productName);
    const canonicalSearchSlug =
        PRODUCT_ALIAS_MAP[searchSlug] ||
        searchSlug;

    if (!searchValue || !Array.isArray(products)) {
        return null;
    }

    return products.find(function(product) {
        const normalizedName = normalizeText(product.name);
        const normalizedSlug = normalizeText(product.slug);
        const normalizedId = normalizeText(product.id);

        const productSlug = makeSlug(product.slug);
        const productIdSlug = makeSlug(product.id);

        const normalizedAromas = Array.isArray(product.aromas)
            ? product.aromas.map(normalizeText)
            : [];

        const aromaSlugs = Array.isArray(product.aromas)
            ? product.aromas.map(makeSlug)
            : [];

        return (
            normalizedName === searchValue ||
            normalizedSlug === searchValue ||
            normalizedId === searchValue ||
            productSlug === canonicalSearchSlug ||
            productIdSlug === canonicalSearchSlug ||
            normalizedName.includes(searchValue) ||
            searchValue.includes(normalizedName) ||
            normalizedSlug.includes(searchValue) ||
            searchValue.includes(normalizedSlug) ||
            productSlug.includes(canonicalSearchSlug) ||
            canonicalSearchSlug.includes(productSlug) ||
            normalizedAromas.includes(searchValue) ||
            aromaSlugs.includes(canonicalSearchSlug)
        );
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

function normalizeAccessCode(value) {
    return String(value || '')
        .replace(/\D/g, '')
        .slice(0, 8);
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

async function linkAlexaAccount(code, alexaUserId) {
    const cleanCode = normalizeAccessCode(code);

    if (cleanCode.length !== 8) {
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
                token: cleanCode,
                alexaCode: cleanCode,
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

    const data = await requestFirstAvailable(
        'GET',
        PROFILE_ENDPOINTS,
        {
            query: buildAccountQuery(safeAccount),
            accessToken: safeAccount.accessToken
        }
    );

    return normalizeAccountResponse(data);
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
                {
                    productId: product.id,
                    productSlug: product.slug,
                    slug: product.slug,
                    product: {
                        id: product.id,
                        slug: product.slug,
                        name: product.name,
                        price: product.price,
                        image: product.image
                    }
                }
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
                {
                    productId: product.id,
                    productSlug: product.slug,
                    slug: product.slug,
                    quantity: Math.max(
                        1,
                        Math.round(Number(quantity || 1))
                    ),
                    product: {
                        id: product.id,
                        slug: product.slug,
                        name: product.name,
                        price: product.price,
                        image: product.image
                    }
                }
            ),
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

    normalizeText,
    makeSlug,
    normalizeProduct,
    normalizeAccessCode,
    normalizeAccountResponse,
    normalizeLine,
    softenHealthClaims,

    getLineTitle,
    getLineDescription,
    getLineImage,

    buildLines,
    filterProductsByLine
};
