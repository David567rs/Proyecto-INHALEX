const Alexa = require('ask-sdk-core');
const util = require('./util');

const homeDocument = require('./apl/homeDocument.json');
const welcomeDocument = require('./apl/welcomeDocument.json');
const catalogDocument = require('./apl/catalogDocument.json');
const detailDocument = require('./apl/detailDocument.json');
const helpDocument = require('./apl/helpDocument.json');
const offersDocument = require('./apl/offersDocument.json');
const goodbyeDocument = require('./apl/goodbyeDocument.json');
const accountDocument = require('./apl/accountDocument.json');
const favoritesDocument = require('./apl/favoritesDocument.json');
const bagDocument = require('./apl/bagDocument.json');

const homeDataSource = require('./datasources/homeDataSource');
const welcomeDataSource = require('./datasources/welcomeDataSource');
const catalogDataSource = require('./datasources/catalogDataSource');
const detailDataSource = require('./datasources/detailDataSource');
const helpDataSource = require('./datasources/helpDataSource');
const offersDataSource = require('./datasources/offersDataSource');
const goodbyeDataSource = require('./datasources/goodbyeDataSource');
const accountDataSource = require('./datasources/accountDataSource');
const favoritesDataSource = require('./datasources/favoritesDataSource');
const bagDataSource = require('./datasources/bagDataSource');

/* =========================================================
   UTILIDADES GENERALES
========================================================= */

function supportsAPL(handlerInput) {
    const supportedInterfaces =
        handlerInput.requestEnvelope.context &&
        handlerInput.requestEnvelope.context.System &&
        handlerInput.requestEnvelope.context.System.device &&
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces;

    return Boolean(
        supportedInterfaces &&
        supportedInterfaces['Alexa.Presentation.APL']
    );
}

function getAlexaUserId(handlerInput) {
    return (
        handlerInput.requestEnvelope.context &&
        handlerInput.requestEnvelope.context.System &&
        handlerInput.requestEnvelope.context.System.user &&
        handlerInput.requestEnvelope.context.System.user.userId
    ) || '';
}

function getGuestAccount(handlerInput) {
    return {
        linked: false,
        alexaUserId: getAlexaUserId(handlerInput),
        userName: 'Invitado',
        accessToken: '',
        userId: ''
    };
}

function getSessionAccount(handlerInput) {
    const sessionAttributes =
        handlerInput.attributesManager.getSessionAttributes();

    const account =
        sessionAttributes.account &&
        typeof sessionAttributes.account === 'object'
            ? sessionAttributes.account
            : {};

    return Object.assign(
        getGuestAccount(handlerInput),
        account,
        {
            alexaUserId:
                account.alexaUserId ||
                getAlexaUserId(handlerInput)
        }
    );
}

function saveSessionAccount(handlerInput, account) {
    const sessionAttributes =
        handlerInput.attributesManager.getSessionAttributes();

    sessionAttributes.account = Object.assign(
        getGuestAccount(handlerInput),
        account || {},
        {
            alexaUserId: getAlexaUserId(handlerInput)
        }
    );

    handlerInput.attributesManager.setSessionAttributes(
        sessionAttributes
    );

    return sessionAttributes.account;
}

function clearSessionAccount(handlerInput) {
    const sessionAttributes =
        handlerInput.attributesManager.getSessionAttributes();

    sessionAttributes.account = getGuestAccount(handlerInput);
    sessionAttributes.awaitingLinkCode = false;
    sessionAttributes.accountSyncAttempted = true;

    handlerInput.attributesManager.setSessionAttributes(
        sessionAttributes
    );

    return sessionAttributes.account;
}

function setAwaitingLinkCode(handlerInput, awaiting) {
    const sessionAttributes =
        handlerInput.attributesManager.getSessionAttributes();

    sessionAttributes.awaitingLinkCode = Boolean(awaiting);
    handlerInput.attributesManager.setSessionAttributes(
        sessionAttributes
    );
}

function isAwaitingLinkCode(handlerInput) {
    const sessionAttributes =
        handlerInput.attributesManager.getSessionAttributes();

    return Boolean(sessionAttributes.awaitingLinkCode);
}

async function syncAccount(handlerInput, forceRefresh) {
    const sessionAttributes =
        handlerInput.attributesManager.getSessionAttributes();

    const sessionAccount = getSessionAccount(handlerInput);

    if (
        sessionAccount.linked &&
        !forceRefresh
    ) {
        return sessionAccount;
    }

    if (
        sessionAttributes.accountSyncAttempted &&
        !forceRefresh
    ) {
        return sessionAccount;
    }

    sessionAttributes.accountSyncAttempted = true;
    handlerInput.attributesManager.setSessionAttributes(
        sessionAttributes
    );

    try {
        const profile = await util.getAlexaProfile(sessionAccount);

        if (profile && profile.linked) {
            return saveSessionAccount(
                handlerInput,
                profile
            );
        }
    } catch (error) {
        console.log(
            'NO SE PUDO SINCRONIZAR CUENTA:',
            error.message
        );
    }

    return sessionAccount;
}

function decorateDataSources(handlerInput, datasources) {
    const account = getSessionAccount(handlerInput);
    const decorated = Object.assign({}, datasources || {});

    Object.keys(decorated).forEach(function(key) {
        if (
            decorated[key] &&
            typeof decorated[key] === 'object'
        ) {
            decorated[key] = Object.assign(
                {},
                decorated[key],
                {
                    isLinked: Boolean(account.linked),
                    userName: account.userName || 'Invitado',
                    userBadgeText: account.linked
                        ? 'Hola, ' + (account.userName || 'usuario')
                        : 'Sin vincular'
                }
            );
        }
    });

    return decorated;
}

function renderDocument(
    handlerInput,
    token,
    document,
    datasources
) {
    if (!supportsAPL(handlerInput)) {
        return;
    }

    handlerInput.responseBuilder.addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: token + '-' + Date.now(),
        document: document,
        datasources: decorateDataSources(
            handlerInput,
            datasources
        )
    });
}

async function getProducts(handlerInput) {
    const sessionAttributes =
        handlerInput.attributesManager.getSessionAttributes();

    if (
        Array.isArray(sessionAttributes.products) &&
        sessionAttributes.products.length > 0
    ) {
        return sessionAttributes.products;
    }

    const products = await util.getProducts();

    const safeProducts =
        Array.isArray(products)
            ? products
            : [];

    if (safeProducts.length > 0) {
        sessionAttributes.products = safeProducts;

        handlerInput.attributesManager.setSessionAttributes(
            sessionAttributes
        );
    }

    return safeProducts;
}

function getIntentSlot(handlerInput, slotName) {
    const request =
        handlerInput.requestEnvelope.request || {};

    const intent = request.intent || {};
    const slots = intent.slots || {};

    return slots[slotName];
}

function getResolvedSlotValue(handlerInput, slotName) {
    const slot = getIntentSlot(handlerInput, slotName);

    if (!slot) {
        return '';
    }

    const resolutions =
        slot.resolutions &&
        slot.resolutions.resolutionsPerAuthority;

    if (Array.isArray(resolutions)) {
        for (const resolution of resolutions) {
            const statusCode =
                resolution.status &&
                resolution.status.code;

            if (
                statusCode === 'ER_SUCCESS_MATCH' &&
                Array.isArray(resolution.values) &&
                resolution.values.length > 0
            ) {
                const resolvedValue =
                    resolution.values[0].value || {};

                return (
                    resolvedValue.name ||
                    resolvedValue.id ||
                    slot.value ||
                    ''
                );
            }
        }
    }

    return slot.value || '';
}

function getQuantitySlotValue(handlerInput) {
    const rawQuantity =
        Alexa.getSlotValue(
            handlerInput.requestEnvelope,
            'quantity'
        ) ||
        getResolvedSlotValue(handlerInput, 'quantity');

    const quantity = Number(rawQuantity);

    return Number.isFinite(quantity) && quantity > 0
        ? Math.max(1, Math.round(quantity))
        : null;
}

function getRawRequestText(handlerInput) {
    const request =
        handlerInput.requestEnvelope.request || {};
    const intent = request.intent || {};
    const slots = intent.slots || {};
    const slotValues = Object.keys(slots)
        .map(function(slotName) {
            return slots[slotName] && slots[slotName].value;
        })
        .filter(Boolean);

    return [
        request.inputTranscript,
        intent.name,
        slotValues.join(' ')
    ]
        .filter(Boolean)
        .join(' ');
}

function getCodeSlotValue(handlerInput) {
    return (
        getResolvedSlotValue(
            handlerInput,
            'code'
        ) ||
        Alexa.getSlotValue(
            handlerInput.requestEnvelope,
            'code'
        ) ||
        getRawRequestText(handlerInput) ||
        ''
    );
}

async function getProductByInput(handlerInput, productInput) {
    let products = [];

    try {
        products = await getProducts(handlerInput);
    } catch (error) {
        console.log(
            'ERROR AL RESOLVER PRODUCTO:',
            error.message
        );

        products = util.getFallbackProducts();
    }

    return {
        products: products,
        product: util.findProduct(
            products,
            productInput
        )
    };
}

async function getSelectedProduct(handlerInput, productInput) {
    const sessionAttributes =
        handlerInput.attributesManager.getSessionAttributes();

    const fallbackProduct =
        productInput ||
        sessionAttributes.selectedProductSlug;

    return getProductByInput(
        handlerInput,
        fallbackProduct
    );
}

function getRemoteItemProduct(item, products) {
    const safeItem =
        item && typeof item === 'object'
            ? item
            : {};

    const embeddedProduct =
        safeItem.product ||
        safeItem.producto ||
        safeItem.item ||
        null;

    if (
        embeddedProduct &&
        typeof embeddedProduct === 'object' &&
        (
            embeddedProduct.name ||
            embeddedProduct.nombre ||
            embeddedProduct.slug
        )
    ) {
        return util.normalizeProduct(embeddedProduct);
    }

    const candidate =
        safeItem.productSlug ||
        safeItem.slug ||
        safeItem.productId ||
        safeItem.id ||
        safeItem.name ||
        safeItem.nombre ||
        '';

    const matchedProduct = util.findProduct(
        products,
        candidate
    );

    if (matchedProduct) {
        return matchedProduct;
    }

    if (
        safeItem.name ||
        safeItem.nombre ||
        safeItem.slug ||
        safeItem.productSlug
    ) {
        return util.normalizeProduct(safeItem);
    }

    return null;
}

function mapRemoteItemsToProducts(items, products) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map(function(item) {
            const product =
                getRemoteItemProduct(
                    item,
                    products
                );

            if (!product) {
                return null;
            }

            const quantity = Math.max(
                1,
                Math.round(
                    Number(
                        item.quantity ||
                        item.cantidad ||
                        item.qty ||
                        1
                    )
                )
            );

            return Object.assign(
                {},
                product,
                {
                    quantity: quantity,
                    priceText: '$' + Number(product.price || 0).toFixed(2)
                }
            );
        })
        .filter(Boolean);
}

async function loadRemoteFavorites(handlerInput, account) {
    if (!account || !account.linked) {
        return [];
    }

    try {
        const products = await getProducts(handlerInput);
        const remoteItems =
            await util.getRemoteFavorites(account);
        const favorites =
            mapRemoteItemsToProducts(
                remoteItems,
                products
            );

        console.log(
            'INHALEX_REMOTE_FAVORITES_LOADED',
            JSON.stringify({
                remoteCount: Array.isArray(remoteItems)
                    ? remoteItems.length
                    : 0,
                mappedCount: favorites.length
            })
        );

        return favorites;
    } catch (error) {
        console.log(
            'ERROR AL CARGAR FAVORITOS REMOTOS:',
            error.message
        );

        return [];
    }
}

async function loadRemoteBag(handlerInput, account) {
    if (!account || !account.linked) {
        return [];
    }

    try {
        const products = await getProducts(handlerInput);
        const remoteItems =
            await util.getRemoteBag(account);
        const bagItems =
            mapRemoteItemsToProducts(
                remoteItems,
                products
            );

        console.log(
            'INHALEX_REMOTE_BAG_LOADED',
            JSON.stringify({
                remoteCount: Array.isArray(remoteItems)
                    ? remoteItems.length
                    : 0,
                mappedCount: bagItems.length
            })
        );

        return bagItems;
    } catch (error) {
        console.log(
            'ERROR AL CARGAR BOLSA REMOTA:',
            error.message
        );

        return [];
    }
}

/* =========================================================
   FUNCIONES PARA MOSTRAR LAS PANTALLAS
========================================================= */

async function showHome(handlerInput) {
    await syncAccount(handlerInput);

    renderDocument(
        handlerInput,
        'homeToken',
        homeDocument,
        homeDataSource()
    );

    return handlerInput.responseBuilder
        .speak(
            'Bienvenida a INHALEX Bienestar, el respiro que alivia. ' +
            'Puedes explorar nuestras líneas, ver el catálogo, vincular tu cuenta, ver favoritos, ver mi bolsa o pedir ayuda. ' +
            util.WELLNESS_DISCLAIMER
        )
        .reprompt(
            'Puedes decir explorar líneas, ver catálogo, vincular cuenta, ver favoritos o ayuda.'
        )
        .getResponse();
}

async function showLines(handlerInput) {
    let products = [];

    try {
        products = await getProducts(handlerInput);
    } catch (error) {
        console.log(
            'ERROR AL CARGAR LINEAS:',
            error.message
        );

        products = util.getFallbackProducts();
    }

    const lines = util.buildLines(products);

    renderDocument(
        handlerInput,
        'linesToken',
        welcomeDocument,
        welcomeDataSource(lines)
    );

    return handlerInput.responseBuilder
        .speak(
            'Estas son las líneas de INHALEX. ' +
            'Puedes tocar una línea o decir, por ejemplo, línea verde.'
        )
        .reprompt(
            'Puedes decir línea verde, línea resfriado, ver catálogo o salir.'
        )
        .getResponse();
}

async function showLineCatalog(handlerInput, lineValue) {
    if (!lineValue) {
        return handlerInput.responseBuilder
            .speak(
                'No alcancé a escuchar qué línea quieres ver. ' +
                'Puedes decir línea verde, línea insomnio o línea ansiedad y estrés.'
            )
            .reprompt(
                'Puedes decir línea verde, línea resfriado o ver catálogo.'
            )
            .getResponse();
    }

    let products = [];

    try {
        products = await getProducts(handlerInput);
    } catch (error) {
        console.log(
            'ERROR AL ABRIR LÍNEA POR VOZ:',
            error.message
        );

        products = util.getFallbackProducts();
    }

    const lineId = util.normalizeLine(lineValue);
    const filteredProducts =
        util.filterProductsByLine(
            products,
            lineId
        );

    return showCatalog(
        handlerInput,
        filteredProducts,
        util.getLineTitle(lineId),
        'Aromas disponibles en esta línea'
    );
}

async function showCatalog(
    handlerInput,
    products,
    title,
    subtitle,
    spokenMessage
) {
    await syncAccount(handlerInput);

    const safeProducts =
        Array.isArray(products)
            ? products
            : [];

    const catalogTitle =
        title || 'Catálogo INHALEX';

    const catalogSubtitle =
        safeProducts.length > 0
            ? (
                subtitle ||
                'Todos los aromas disponibles'
            )
            : 'No fue posible cargar los aromas. Intenta nuevamente.';

    renderDocument(
        handlerInput,
        'catalogToken',
        catalogDocument,
        catalogDataSource(
            safeProducts,
            catalogTitle,
            catalogSubtitle
        )
    );

    if (safeProducts.length === 0) {
        return handlerInput.responseBuilder
            .speak(
                'No pude cargar los productos en este momento. ' +
                'Puedes regresar al inicio, explorar las líneas o intentar nuevamente.'
            )
            .reprompt(
                'Puedes decir inicio, explorar líneas o ayuda.'
            )
            .getResponse();
    }

    return handlerInput.responseBuilder
        .speak(
            spokenMessage ||
            (
                catalogTitle === 'Catálogo INHALEX'
                    ? 'Aquí tienes el catálogo de INHALEX.'
                    : 'Estos son los productos de ' + catalogTitle + '.'
            )
        )
        .reprompt(
            'Puedes tocar un producto, decir el nombre de un aroma, pedir ofertas o volver al inicio.'
        )
        .getResponse();
}

async function showFullCatalog(handlerInput) {
    let products = [];

    try {
        products = await getProducts(handlerInput);
    } catch (error) {
        console.log(
            'ERROR AL CARGAR CATÁLOGO:',
            error.message
        );

        products = [];
    }

    return showCatalog(
        handlerInput,
        products,
        'Catálogo INHALEX',
        'Todos los aromas disponibles'
    );
}

async function showOffers(handlerInput) {
    let products = [];

    try {
        products = await getProducts(handlerInput);
    } catch (error) {
        console.log(
            'ERROR AL CARGAR OFERTAS:',
            error.message
        );

        products = util.getFallbackProducts();
    }

    const offerProducts = util.getOfferProducts(products);

    renderDocument(
        handlerInput,
        'offersToken',
        offersDocument,
        offersDataSource(offerProducts)
    );

    if (offerProducts.length === 0) {
        return handlerInput.responseBuilder
            .speak(
                'Por ahora no hay ofertas activas. ' +
                'Puedes ver el catálogo completo o explorar las líneas.'
            )
            .reprompt(
                'Puedes decir ver catálogo, explorar líneas o ayuda.'
            )
            .getResponse();
    }

    return handlerInput.responseBuilder
        .speak(
            'Estas son las ofertas activas de INHALEX. ' +
            'Puedes tocar un producto o decir el nombre del aroma.'
        )
        .reprompt(
            'Puedes decir el nombre de un aroma, volver al catálogo o pedir ayuda.'
        )
        .getResponse();
}

async function showAccount(handlerInput, state) {
    const account =
        await syncAccount(handlerInput, true);

    renderDocument(
        handlerInput,
        'accountToken',
        accountDocument,
        accountDataSource(
            account,
            state
        )
    );

    return handlerInput.responseBuilder
        .speak(
            account.linked
                ? 'Tu cuenta de INHALEX ya está vinculada. Puedes decir ver favoritos o ver mi bolsa.'
                : 'Para vincular tu cuenta, genera un código temporal de cinco dígitos en tu página de INHALEX y di: mi código es, seguido del código.'
        )
        .reprompt(
            account.linked
                ? 'Puedes decir ver favoritos, ver mi bolsa o ver catálogo.'
                : 'Cuando tengas el código, di: mi código es, y después los cinco dígitos.'
        )
        .getResponse();
}

async function logoutAccount(handlerInput) {
    const account = await syncAccount(handlerInput, true);
    let remoteUnlinked = false;

    if (account.linked && account.accessToken) {
        try {
            await util.unlinkAlexaAccount(account);
            remoteUnlinked = true;
        } catch (error) {
            console.log(
                'ERROR AL CERRAR SESION ALEXA:',
                JSON.stringify({
                    message: error.message || '',
                    statusCode: error.statusCode || null,
                    endpoint: error.endpoint || '',
                    responseBody: error.responseBody || ''
                })
            );
        }
    }

    const guestAccount = clearSessionAccount(handlerInput);

    renderDocument(
        handlerInput,
        'accountLogoutToken',
        accountDocument,
        accountDataSource(
            guestAccount,
            {
                statusText:
                    remoteUnlinked || !account.linked
                        ? 'Sesion cerrada. Tus favoritos y tu bolsa siguen guardados.'
                        : 'Cerre la sesion local. Si la cuenta aparece de nuevo, vuelve a intentar cerrar sesion.'
            }
        )
    );

    return handlerInput.responseBuilder
        .speak(
            remoteUnlinked || !account.linked
                ? 'Listo, cerre la sesion de INHALEX en Alexa. Tus favoritos y tu bolsa no se borraron. Para volver a usarlos, vincula tu cuenta con un codigo nuevo.'
                : 'Cerre la sesion de esta conversacion, pero no pude desvincularla por completo del backend. Puedes intentarlo de nuevo en un momento.'
        )
        .reprompt(
            'Puedes decir vincular cuenta, ver catalogo o salir.'
        )
        .getResponse();
}

async function promptLinkToken(handlerInput) {
    setAwaitingLinkCode(handlerInput, true);

    const account =
        await syncAccount(handlerInput, true);

    renderDocument(
        handlerInput,
        'accountPromptToken',
        accountDocument,
        accountDataSource(
            account,
            {
                statusText:
                    'Estoy lista. Di tu código de 5 dígitos para vincular la skill.'
            }
        )
    );

    return handlerInput.responseBuilder
        .speak(
            'Claro. Dime el código de cinco dígitos que generaste en la página, separado número por número. Por ejemplo: mi código es cinco dos cuatro cero uno.'
        )
        .reprompt(
            'Di: mi código es, y después cada dígito por separado.'
        )
        .getResponse();
}

async function linkWithCode(handlerInput, codeInput) {
    const cleanCode =
        util.normalizeAccessCode(codeInput);

    if (cleanCode.length !== util.ACCESS_CODE_LENGTH) {
        setAwaitingLinkCode(handlerInput, true);

        renderDocument(
            handlerInput,
            'accountInvalidCodeToken',
            accountDocument,
            accountDataSource(
                getSessionAccount(handlerInput),
                {
                    errorText:
                        'El código debe tener 5 dígitos.',
                    statusText:
                        'Vuelve a decir el código que aparece en tu página.'
                }
            )
        );

        return handlerInput.responseBuilder
            .speak(
                'El código debe tener cinco dígitos. Intenta decirlo número por número, por ejemplo: mi código es cinco dos cuatro cero uno.'
            )
            .reprompt(
                'Di: mi código es, y después cada dígito por separado.'
            )
            .getResponse();
    }

    try {
        const linkedAccount =
            await util.linkAlexaAccount(
                cleanCode,
                getAlexaUserId(handlerInput)
            );

        if (!linkedAccount || !linkedAccount.linked) {
            throw new Error('El backend no confirmó la vinculación.');
        }

        const account =
            saveSessionAccount(
                handlerInput,
                linkedAccount
            );

        setAwaitingLinkCode(handlerInput, false);

        renderDocument(
            handlerInput,
            'accountLinkedToken',
            accountDocument,
            accountDataSource(
                account,
                {
                    statusText:
                        'Tu cuenta quedó vinculada correctamente.'
                }
            )
        );

        return handlerInput.responseBuilder
            .speak(
                'Listo, vinculé tu cuenta de INHALEX. Hola ' +
                (account.userName || 'usuario') +
                '. Ahora puedo sincronizar tus favoritos y tu bolsa.'
            )
            .reprompt(
                'Puedes decir ver favoritos, ver mi bolsa o ver catálogo.'
            )
            .getResponse();
    } catch (error) {
        setAwaitingLinkCode(handlerInput, true);

        console.log(
            'ERROR AL VINCULAR CUENTA:',
            JSON.stringify({
                message: error.message || '',
                statusCode: error.statusCode || null,
                endpoint: error.endpoint || '',
                responseBody: error.responseBody || '',
                codeMask: util.maskAccessCode(cleanCode)
            })
        );

        renderDocument(
            handlerInput,
            'accountLinkErrorToken',
            accountDocument,
            accountDataSource(
                getSessionAccount(handlerInput),
                {
                    errorText:
                        'No pude validar ese código.',
                    statusText:
                        'Genera uno nuevo o intenta decirlo otra vez.'
                }
            )
        );

        return handlerInput.responseBuilder
            .speak(
                'No pude validar ese código. Revisa que siga vigente o genera uno nuevo en la página de INHALEX.'
            )
            .reprompt(
                'Puedes decir otro código o pedir ver catálogo.'
            )
            .getResponse();
    }
}

async function showFavorites(handlerInput) {
    const account =
        await syncAccount(handlerInput, true);

    if (!account.linked) {
        renderDocument(
            handlerInput,
            'favoritesUnlinkedToken',
            favoritesDocument,
            favoritesDataSource(
                [],
                account
            )
        );

        return handlerInput.responseBuilder
            .speak(
                'Para ver tus favoritos primero necesitas vincular tu cuenta con un código temporal de cinco dígitos.'
            )
            .reprompt(
                'Puedes decir vincular cuenta o ver catálogo.'
            )
            .getResponse();
    }

    const favorites =
        await loadRemoteFavorites(
            handlerInput,
            account
        );

    renderDocument(
        handlerInput,
        'favoritesToken',
        favoritesDocument,
        favoritesDataSource(
            favorites,
            account
        )
    );

    return handlerInput.responseBuilder
        .speak(
            favorites.length > 0
                ? 'Estos son tus favoritos de INHALEX.'
                : 'Aún no tienes aromas favoritos guardados.'
        )
        .reprompt(
            'Puedes decir ver catálogo, ver mi bolsa o el nombre de un aroma.'
        )
        .getResponse();
}

async function showBag(handlerInput) {
    const account =
        await syncAccount(handlerInput, true);

    if (!account.linked) {
        renderDocument(
            handlerInput,
            'bagUnlinkedToken',
            bagDocument,
            bagDataSource(
                [],
                account
            )
        );

        return handlerInput.responseBuilder
            .speak(
                'Para sincronizar tu bolsa primero necesitas vincular tu cuenta con un código temporal de cinco dígitos.'
            )
            .reprompt(
                'Puedes decir vincular cuenta o ver catálogo.'
            )
            .getResponse();
    }

    const bagItems =
        await loadRemoteBag(
            handlerInput,
            account
        );

    renderDocument(
        handlerInput,
        'bagToken',
        bagDocument,
        bagDataSource(
            bagItems,
            account
        )
    );

    return handlerInput.responseBuilder
        .speak(
            bagItems.length > 0
                ? 'Esta es tu bolsa de INHALEX.'
                : 'Tu bolsa está vacía por ahora.'
        )
        .reprompt(
            'Puedes decir ver catálogo, ver favoritos o el nombre de un aroma.'
        )
        .getResponse();
}

async function showDetail(
    handlerInput,
    product,
    quantityOverride,
    silent
) {
    if (!product) {
        return handlerInput.responseBuilder
            .speak(
                'No encontré ese aroma. Puedes volver al catálogo.'
            )
            .reprompt(
                'Puedes decir ver catálogo o explorar líneas.'
            )
            .getResponse();
    }

    const sessionAttributes =
        handlerInput.attributesManager.getSessionAttributes();

    const previousProductSlug = sessionAttributes.selectedProductSlug;
    const requestedQuantity = Number(quantityOverride);
    const quantity =
        Number.isFinite(requestedQuantity) && requestedQuantity > 0
            ? Math.max(1, Math.round(requestedQuantity))
            : previousProductSlug === product.slug
                ? Math.max(
                    1,
                    Math.round(
                        Number(sessionAttributes.selectedQuantity || 1)
                    )
                )
                : 1;

    sessionAttributes.selectedProductSlug = product.slug;
    sessionAttributes.selectedLine = product.category;
    sessionAttributes.selectedQuantity = quantity;

    handlerInput.attributesManager.setSessionAttributes(
        sessionAttributes
    );

    renderDocument(
        handlerInput,
        'detailToken',
        detailDocument,
        detailDataSource(product, quantity)
    );

    if (silent) {
        return handlerInput.responseBuilder
            .getResponse();
    }

    const spokenDescription =
        String(product.description || '')
            .replace(/[.!?]\s*$/, '');

    return handlerInput.responseBuilder
        .speak(
            product.name +
            '. ' +
            spokenDescription +
            '. Su precio es de ' +
            product.price +
            ' pesos. ' +
            'Puedes agregarlo a la bolsa o guardarlo en favoritos si tu cuenta ya está vinculada.'
        )
        .reprompt(
            'Puedes decir agregar a la bolsa, agregar a favoritos, vincular cuenta o volver al catálogo.'
        )
        .getResponse();
}

async function addFavorite(handlerInput, productInput) {
    const result =
        await getSelectedProduct(
            handlerInput,
            productInput
        );

    if (!result.product) {
        return handlerInput.responseBuilder
            .speak(
                'Primero abre el detalle de un aroma, por ejemplo, muéstrame lavanda. ' +
                'Para guardarlo en favoritos primero necesitas vincular tu cuenta.'
            )
            .reprompt(
                'Puedes decir muéstrame lavanda o ver catálogo.'
            )
            .getResponse();
    }

    const account =
        await syncAccount(handlerInput, true);

    if (!account.linked) {
        renderDocument(
            handlerInput,
            'accountFavoriteRequiredToken',
            accountDocument,
            accountDataSource(
                account,
                {
                    statusText:
                        'Vincula tu cuenta para guardar ' +
                        result.product.name +
                        ' en favoritos.'
                }
            )
        )

        return handlerInput.responseBuilder
            .speak(
                'Para guardar ' +
                result.product.name +
                ' en favoritos, primero vincula tu cuenta con el código temporal de cinco dígitos.'
            )
            .reprompt(
                'Puedes decir vincular cuenta o ver catálogo.'
            )
            .getResponse();
    }

    try {
        await util.addRemoteFavorite(
            account,
            result.product
        );

        return handlerInput.responseBuilder
            .speak(
                'Listo, guardé ' +
                result.product.name +
                ' en tus favoritos.'
            )
            .reprompt(
                'Puedes decir ver favoritos, agregar a la bolsa o volver al catálogo.'
            )
            .getResponse();
    } catch (error) {
        console.log(
            'ERROR AL GUARDAR FAVORITO:',
            JSON.stringify({
                message: error.message || '',
                statusCode: error.statusCode || null,
                endpoint: error.endpoint || '',
                responseBody: error.responseBody || '',
                productId: result.product.id || '',
                productSlug: result.product.slug || ''
            })
        );

        return handlerInput.responseBuilder
            .speak(
                'No pude guardar el favorito en este momento. Tu cuenta está vinculada, pero el backend no respondió correctamente.'
            )
            .reprompt(
                'Puedes intentar otra vez, ver catálogo o pedir ayuda.'
            )
            .getResponse();
    }
}

async function addToBag(handlerInput, productInput, quantityOverride) {
    const result =
        await getSelectedProduct(
            handlerInput,
            productInput
        );

    if (!result.product) {
        return handlerInput.responseBuilder
            .speak(
                'Primero elige un aroma, por ejemplo, muéstrame eucalipto. ' +
                'Después puedes decir agregar a la bolsa.'
            )
            .reprompt(
                'Puedes decir muéstrame eucalipto o ver catálogo.'
            )
            .getResponse();
    }

    const requestedQuantity =
        Number(quantityOverride);

    const quantity =
        Number.isFinite(requestedQuantity) &&
        requestedQuantity > 0
            ? Math.max(1, Math.round(requestedQuantity))
            : 1;

    const account =
        await syncAccount(handlerInput, true);

    if (!account.linked) {
        renderDocument(
            handlerInput,
            'accountBagRequiredToken',
            accountDocument,
            accountDataSource(
                account,
                {
                    statusText:
                        'Vincula tu cuenta para sincronizar la bolsa con tu página.'
                }
            )
        );

        return handlerInput.responseBuilder
            .speak(
                'Para agregar productos a tu bolsa y verlos también en la página, primero vincula tu cuenta con el código temporal de cinco dígitos.'
            )
            .reprompt(
                'Puedes decir vincular cuenta o ver catálogo.'
            )
            .getResponse();
    }

    try {
        await util.addRemoteBag(
            account,
            result.product,
            quantity
        );

        const bagItems =
            await loadRemoteBag(
                handlerInput,
                account
            );

        const visibleBagItems =
            bagItems.length > 0
                ? bagItems
                : [
                    Object.assign(
                        {},
                        result.product,
                        {
                            quantity: quantity,
                            priceText:
                                '$' +
                                Number(result.product.price || 0).toFixed(2)
                        }
                    )
                ];

        renderDocument(
            handlerInput,
            'bagAddedToken',
            bagDocument,
            bagDataSource(
                visibleBagItems,
                account
            )
        );

        return handlerInput.responseBuilder
            .speak(
                'Agregué ' +
                result.product.name +
                ' a tu bolsa. Ya debería reflejarse también en tu página.'
            )
            .reprompt(
                'Puedes decir ver mi bolsa, ver favoritos o volver al catálogo.'
            )
            .getResponse();
    } catch (error) {
        console.log(
            'ERROR AL AGREGAR A BOLSA:',
            JSON.stringify({
                message: error.message || '',
                statusCode: error.statusCode || null,
                endpoint: error.endpoint || '',
                responseBody: error.responseBody || '',
                productId: result.product.id || '',
                productSlug: result.product.slug || ''
            })
        );

        return handlerInput.responseBuilder
            .speak(
                'No pude agregar el producto a tu bolsa porque el backend no respondió correctamente. Intenta de nuevo en un momento.'
            )
            .reprompt(
                'Puedes intentar otra vez, ver catálogo o pedir ayuda.'
            )
            .getResponse();
    }
}

async function showHelp(handlerInput) {
    await syncAccount(handlerInput);

    renderDocument(
        handlerInput,
        'helpToken',
        helpDocument,
        helpDataSource()
    );

    return handlerInput.responseBuilder
        .speak(
            'Puedes explorar las líneas, abrir el catálogo, pedir ofertas, decir línea verde o decir el nombre de un aroma. ' +
            'También puedes vincular tu cuenta, ver favoritos o ver mi bolsa. ' +
            util.WELLNESS_DISCLAIMER
        )
        .reprompt(
            'Puedes decir explorar líneas, ver catálogo, vincular cuenta, ver favoritos o ver mi bolsa.'
        )
        .getResponse();
}

function showGoodbye(handlerInput) {
    renderDocument(
        handlerInput,
        'goodbyeToken',
        goodbyeDocument,
        goodbyeDataSource()
    );

    return handlerInput.responseBuilder
        .speak(
            'Gracias por visitar INHALEX Bienestar. Hasta pronto.'
        )
        .withShouldEndSession(true)
        .getResponse();
}

/* =========================================================
   HANDLERS DE VOZ
========================================================= */

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'LaunchRequest'
        );
    },

    async handle(handlerInput) {
        return showHome(handlerInput);
    }
};

const ExploreLinesIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'ExploreLinesIntent'
        );
    },

    async handle(handlerInput) {
        return showLines(handlerInput);
    }
};

const LineIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'LineIntent'
        );
    },

    async handle(handlerInput) {
        const lineValue =
            getResolvedSlotValue(
                handlerInput,
                'line'
            );

        return showLineCatalog(
            handlerInput,
            lineValue
        );
    }
};

const ShowCatalogIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'ShowCatalogIntent'
        );
    },

    async handle(handlerInput) {
        return showFullCatalog(handlerInput);
    }
};

const BackToCatalogIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'BackToCatalogIntent'
        );
    },

    async handle(handlerInput) {
        return showFullCatalog(handlerInput);
    }
};

const OffersIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'OffersIntent'
        );
    },

    async handle(handlerInput) {
        return showOffers(handlerInput);
    }
};

async function handleProductDetailRequest(handlerInput) {
    const productName =
        Alexa.getSlotValue(
            handlerInput.requestEnvelope,
            'product'
        ) ||
        getResolvedSlotValue(
            handlerInput,
            'product'
        ) || '';

    let products = [];

    try {
        products = await getProducts(handlerInput);
    } catch (error) {
        console.log(
            'ERROR AL BUSCAR PRODUCTO:',
            error.message
        );

        products = util.getFallbackProducts();
    }

    const product = util.findProduct(
        products,
        productName
    );

    if (!product) {
        return showCatalog(
            handlerInput,
            products,
            'Catálogo INHALEX',
            'Aromas disponibles actualmente',
            util.buildUnavailableProductSpeech(productName)
        );
    }

    return showDetail(
        handlerInput,
        product
    );
}

const ProductDetailIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'ProductDetailIntent'
        );
    },

    async handle(handlerInput) {
        return handleProductDetailRequest(handlerInput);
    }
};

const ProductNameIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'ProductNameIntent'
        );
    },

    async handle(handlerInput) {
        return handleProductDetailRequest(handlerInput);
    }
};

const AddFavoriteIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'AddFavoriteIntent'
        );
    },

    async handle(handlerInput) {
        const productName =
            getResolvedSlotValue(
                handlerInput,
                'product'
            );

        return addFavorite(
            handlerInput,
            productName
        );
    }
};

const AddToBagIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'AddToBagIntent'
        );
    },

    async handle(handlerInput) {
        const productName =
            getResolvedSlotValue(
                handlerInput,
                'product'
            );

        const quantity =
            getQuantitySlotValue(handlerInput);

        return addToBag(
            handlerInput,
            productName,
            quantity
        );
    }
};

const LinkAccountIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'LinkAccountIntent'
        );
    },

    async handle(handlerInput) {
        const code =
            getCodeSlotValue(handlerInput);

        if (util.normalizeAccessCode(code).length === util.ACCESS_CODE_LENGTH) {
            return linkWithCode(
                handlerInput,
                code
            );
        }

        return promptLinkToken(handlerInput);
    }
};

const ShowFavoritesIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'ShowFavoritesIntent'
        );
    },

    async handle(handlerInput) {
        return showFavorites(handlerInput);
    }
};

const ShowBagIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'ShowBagIntent'
        );
    },

    async handle(handlerInput) {
        return showBag(handlerInput);
    }
};

const LogoutAccountIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'LogoutAccountIntent'
        );
    },

    async handle(handlerInput) {
        return logoutAccount(handlerInput);
    }
};

const PauseIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'AMAZON.PauseIntent'
        );
    },

    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(
                'El video de bienvenida no necesita controles manuales.'
            )
            .reprompt(
                'Puedes explorar las líneas, ver el catálogo o pedir ayuda.'
            )
            .getResponse();
    }
};

const ResumeIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'AMAZON.ResumeIntent'
        );
    },

    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(
                'Puedes continuar explorando las líneas o el catálogo.'
            )
            .reprompt(
                'Puedes decir explorar líneas o ver catálogo.'
            )
            .getResponse();
    }
};

/* =========================================================
   HANDLER DE BOTONES APL
========================================================= */

const APLUserEventHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'Alexa.Presentation.APL.UserEvent'
        );
    },

    async handle(handlerInput) {
        const args =
            handlerInput.requestEnvelope.request.arguments || [];

        const action = args[0];
        const value = args[1];
        const label = args[2];

        console.log(
            'APL USER EVENT:',
            JSON.stringify({
                action: action,
                value: value,
                label: label,
                args: args
            })
        );

        if (
            action === 'openHome' ||
            action === 'goHome'
        ) {
            return showHome(handlerInput);
        }

        if (
            action === 'openLines' ||
            action === 'goLines'
        ) {
            return showLines(handlerInput);
        }

        if (
            action === 'openCatalog' ||
            action === 'goCatalog'
        ) {
            return showFullCatalog(handlerInput);
        }

        if (
            action === 'openOffers' ||
            action === 'goOffers'
        ) {
            return showOffers(handlerInput);
        }

        if (
            action === 'openAccount' ||
            action === 'goAccount' ||
            action === 'linkAccount'
        ) {
            return showAccount(handlerInput);
        }

        if (
            action === 'promptLinkToken' ||
            action === 'enterToken'
        ) {
            return promptLinkToken(handlerInput);
        }

        if (
            action === 'openFavorites' ||
            action === 'goFavorites'
        ) {
            return showFavorites(handlerInput);
        }

        if (
            action === 'openBag' ||
            action === 'goBag'
        ) {
            return showBag(handlerInput);
        }

        if (
            action === 'logoutAccount' ||
            action === 'unlinkAccount' ||
            action === 'closeAccountSession'
        ) {
            return logoutAccount(handlerInput);
        }

        if (
            action === 'openLine' ||
            action === 'goLine'
        ) {
            let products = [];

            try {
                products = await getProducts(handlerInput);
            } catch (error) {
                console.log(
                    'ERROR AL ABRIR UNA LÍNEA:',
                    error.message
                );

                products = [];
            }

            const filteredProducts =
                util.filterProductsByLine(
                    products,
                    value
                );

            return showCatalog(
                handlerInput,
                filteredProducts,
                label || util.getLineTitle(value),
                'Aromas disponibles en esta línea'
            );
        }

        if (
            action === 'openDetail' ||
            action === 'goDetail'
        ) {
            let products = [];

            try {
                products = await getProducts(handlerInput);
            } catch (error) {
                console.log(
                    'ERROR AL ABRIR DETALLE:',
                    error.message
                );

                products = [];
            }

            const product = util.findProduct(
                products,
                value
            );

            return showDetail(
                handlerInput,
                product
            );
        }

        if (action === 'changeQuantity') {
            const sessionAttributes =
                handlerInput.attributesManager.getSessionAttributes();

            const delta = Number(value || 0);
            const currentQuantity = Math.max(
                1,
                Math.round(
                    Number(sessionAttributes.selectedQuantity || 1)
                )
            );

            const nextQuantity = Math.max(
                1,
                currentQuantity + (
                    Number.isFinite(delta)
                        ? Math.round(delta)
                        : 0
                )
            );

            let products = [];

            try {
                products = await getProducts(handlerInput);
            } catch (error) {
                console.log(
                    'ERROR AL CAMBIAR CANTIDAD:',
                    error.message
                );

                products = [];
            }

            const product =
                util.findProduct(products, label) ||
                util.findProduct(
                    products,
                    sessionAttributes.selectedProductSlug
                );

            return showDetail(
                handlerInput,
                product,
                nextQuantity,
                true
            );
        }

        if (
            action === 'openHelp' ||
            action === 'goHelp'
        ) {
            return showHelp(handlerInput);
        }

        if (
            action === 'addFavorite' ||
            action === 'addToFavorites'
        ) {
            return addFavorite(
                handlerInput,
                value
            );
        }

        if (
            action === 'addToCart' ||
            action === 'addBag' ||
            action === 'addToBag'
        ) {
            return addToBag(
                handlerInput,
                value
            );
        }

        if (
            action === 'exit' ||
            action === 'close' ||
            action === 'stop'
        ) {
            return showGoodbye(handlerInput);
        }

        console.log(
            'ACCIÓN APL NO RECONOCIDA:',
            action
        );

        return handlerInput.responseBuilder
            .speak(
                'No pude realizar esa acción. ' +
                'Puedes explorar las líneas, ver el catálogo o pedir ayuda.'
            )
            .reprompt(
                'Puedes decir explorar líneas, ver catálogo o ayuda.'
            )
            .getResponse();
    }
};

/* =========================================================
   HANDLERS GENERALES
========================================================= */

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'AMAZON.HelpIntent'
        );
    },

    async handle(handlerInput) {
        return showHelp(handlerInput);
    }
};

const NavigateHomeIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'AMAZON.NavigateHomeIntent'
        );
    },

    async handle(handlerInput) {
        return showHome(handlerInput);
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        if (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) !== 'IntentRequest'
        ) {
            return false;
        }

        const intentName =
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            );

        return (
            intentName === 'AMAZON.CancelIntent' ||
            intentName === 'AMAZON.StopIntent'
        );
    },

    handle(handlerInput) {
        return showGoodbye(handlerInput);
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'IntentRequest' &&
            Alexa.getIntentName(
                handlerInput.requestEnvelope
            ) === 'AMAZON.FallbackIntent'
        );
    },

    async handle(handlerInput) {
        if (isAwaitingLinkCode(handlerInput)) {
            const possibleCode =
                getRawRequestText(handlerInput);

            if (util.normalizeAccessCode(possibleCode).length === util.ACCESS_CODE_LENGTH) {
                return linkWithCode(
                    handlerInput,
                    possibleCode
                );
            }

            return handlerInput.responseBuilder
                .speak(
                    'No pude leer el código completo. Dilo número por número, por ejemplo: mi código es cinco dos cuatro cero uno.'
                )
                .reprompt(
                    'Di: mi código es, y después cada dígito por separado.'
                )
                .getResponse();
        }

        return handlerInput.responseBuilder
            .speak(
                'No entendí eso. Puedes decir explorar líneas, línea verde, ver catálogo, vincular cuenta, ver favoritos, ver mi bolsa o ayuda.'
            )
            .reprompt(
                'Puedes decir explorar líneas, línea verde, ver catálogo, vincular cuenta o ver favoritos.'
            )
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return (
            Alexa.getRequestType(
                handlerInput.requestEnvelope
            ) === 'SessionEndedRequest'
        );
    },

    handle(handlerInput) {
        return handlerInput.responseBuilder
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },

    handle(handlerInput, error) {
        console.log(
            'ERROR INHALEX:',
            error.message
        );

        console.log(
            'STACK INHALEX:',
            error.stack
        );

        console.log(
            'REQUEST INHALEX:',
            JSON.stringify(
                handlerInput.requestEnvelope
            )
        );

        if (supportsAPL(handlerInput)) {
            renderDocument(
                handlerInput,
                'homeToken',
                homeDocument,
                homeDataSource()
            );
        }

        return handlerInput.responseBuilder
            .speak(
                'Ocurrió un problema en INHALEX Bienestar. ' +
                'Regresé al inicio para que puedas intentarlo nuevamente.'
            )
            .reprompt(
                'Puedes decir explorar líneas, ver catálogo, ofertas o ayuda.'
            )
            .getResponse();
    }
};

/* =========================================================
   EXPORTACIÓN DE LA SKILL
========================================================= */

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ExploreLinesIntentHandler,
        LineIntentHandler,
        ShowCatalogIntentHandler,
        BackToCatalogIntentHandler,
        OffersIntentHandler,
        ProductDetailIntentHandler,
        ProductNameIntentHandler,
        AddFavoriteIntentHandler,
        AddToBagIntentHandler,
        LinkAccountIntentHandler,
        ShowFavoritesIntentHandler,
        ShowBagIntentHandler,
        LogoutAccountIntentHandler,
        PauseIntentHandler,
        ResumeIntentHandler,
        APLUserEventHandler,
        HelpIntentHandler,
        NavigateHomeIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(
        ErrorHandler
    )
    .lambda();
