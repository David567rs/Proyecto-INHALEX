const assert = require('assert');
const skill = require('../index');
const util = require('../util');

function buildIntentRequest(productName, intentName) {
    const application = {
        applicationId: 'amzn1.ask.skill.inhalex-test'
    };
    const user = {
        userId: 'amzn1.ask.account.inhalex-test-user'
    };

    return {
        version: '1.0',
        session: {
            new: false,
            sessionId: 'amzn1.echo-api.session.inhalex-test',
            application: application,
            user: user,
            attributes: {
                products: util.getFallbackProducts(),
                accountSyncAttempted: true,
                account: {
                    linked: false,
                    userName: 'Invitado'
                }
            }
        },
        context: {
            System: {
                application: application,
                user: user,
                device: {
                    deviceId: 'amzn1.ask.device.inhalex-test',
                    supportedInterfaces: {
                        'Alexa.Presentation.APL': {}
                    }
                },
                apiEndpoint: 'https://api.amazonalexa.com'
            }
        },
        request: {
            type: 'IntentRequest',
            requestId: 'amzn1.echo-api.request.inhalex-test',
            timestamp: '2026-07-21T12:00:00Z',
            locale: 'es-MX',
            intent: {
                name: intentName || 'ProductNameIntent',
                confirmationStatus: 'NONE',
                slots: {
                    product: {
                        name: 'product',
                        value: productName,
                        confirmationStatus: 'NONE'
                    }
                }
            }
        }
    };
}

function getRenderDirective(responseEnvelope) {
    return (responseEnvelope.response.directives || []).find(
        function(directive) {
            return directive.type === 'Alexa.Presentation.APL.RenderDocument';
        }
    );
}

function invokeSkill(requestEnvelope) {
    return new Promise(function(resolve, reject) {
        skill.handler(
            requestEnvelope,
            {},
            function(error, responseEnvelope) {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(responseEnvelope);
            }
        );
    });
}

(async function run() {
    const unavailableResponse = await invokeSkill(
        buildIntentRequest('naranja')
    );

    assert.match(
        unavailableResponse.response.outputSpeech.ssml,
        /el aroma de naranja no forma parte de nuestro catálogo/
    );
    assert.match(
        getRenderDirective(unavailableResponse).token,
        /^catalogToken-/
    );

    const unavailableDetailResponse = await invokeSkill(
        buildIntentRequest('naranja', 'ProductDetailIntent')
    );

    assert.match(
        unavailableDetailResponse.response.outputSpeech.ssml,
        /el aroma de naranja no forma parte de nuestro catálogo/
    );
    assert.match(
        getRenderDirective(unavailableDetailResponse).token,
        /^catalogToken-/
    );

    const availableResponse = await invokeSkill(
        buildIntentRequest('canela')
    );

    assert.match(
        availableResponse.response.outputSpeech.ssml,
        /Canela/
    );
    assert.match(
        getRenderDirective(availableResponse).token,
        /^detailToken-/
    );

    const lavandaResponse = await invokeSkill(
        buildIntentRequest('la banda')
    );

    assert.match(
        lavandaResponse.response.outputSpeech.ssml,
        /Lavanda/
    );
    assert.match(
        getRenderDirective(lavandaResponse).token,
        /^detailToken-/
    );

    const ambiguousResponse = await invokeSkill(
        buildIntentRequest('banda')
    );

    assert.match(
        ambiguousResponse.response.outputSpeech.ssml,
        /el aroma de banda no forma parte de nuestro catálogo/
    );
    assert.match(
        getRenderDirective(ambiguousResponse).token,
        /^catalogToken-/
    );

    console.log('handler.test.js OK');
})().catch(function(error) {
    console.error(error);
    process.exitCode = 1;
});
