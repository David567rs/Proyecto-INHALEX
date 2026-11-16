import {
  createGmailRegistrationCodeSender,
  GmailRegistrationCodeSender,
} from './gmail-registration-code-sender';

const credentials = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  refreshToken: 'test-refresh-token',
  fromEmail: 'contacto@example.test',
};
const recipient = 'destino@example.test';

describe('GmailRegistrationCodeSender', () => {
  const fetchGoogle = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >();
  const sender = new GmailRegistrationCodeSender(credentials, fetchGoogle);

  beforeEach(() => fetchGoogle.mockReset());

  function mockDelivery() {
    fetchGoogle
      .mockResolvedValueOnce(
        Response.json({ access_token: 'test-access-token' }),
      )
      .mockResolvedValueOnce(Response.json({ id: 'test-message-id' }));
  }

  function deliveredMessage() {
    const body = fetchGoogle.mock.calls[1][1]?.body;
    if (typeof body !== 'string') throw new Error('Expected a Gmail message');
    const payload: unknown = JSON.parse(body);
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('raw' in payload) ||
      typeof payload.raw !== 'string'
    ) {
      throw new Error('Invalid simulated Gmail request');
    }
    return Buffer.from(payload.raw, 'base64url').toString('utf8');
  }

  it('refreshes authorization and submits a UTF-8 message for the configured sender', async () => {
    mockDelivery();
    await sender.send(recipient, '001246', 10);

    const [tokenUrl, tokenOptions] = fetchGoogle.mock.calls[0];
    expect(tokenUrl).toBe('https://oauth2.googleapis.com/token');
    expect(tokenOptions?.redirect).toBe('error');
    const tokenBody = tokenOptions?.body;
    if (!(tokenBody instanceof URLSearchParams)) {
      throw new Error('Expected a form-encoded token request');
    }
    expect(tokenBody.get('grant_type')).toBe('refresh_token');
    expect(tokenBody.get('refresh_token')).toBe(credentials.refreshToken);

    const [sendUrl, sendOptions] = fetchGoogle.mock.calls[1];
    expect(sendUrl).toBe(
      'https://gmail.googleapis.com/gmail/v1/users/contacto%40example.test/messages/send',
    );
    expect(new Headers(sendOptions?.headers).get('Authorization')).toBe(
      'Bearer test-access-token',
    );
    const [headers, content] = deliveredMessage().split('\r\n\r\n');
    expect(headers).toContain(`From: INHALEX <${credentials.fromEmail}>`);
    expect(headers).toContain(`To: <${recipient}>`);
    expect(headers).toContain('charset=UTF-8');
    expect(Buffer.from(content, 'base64').toString('utf8')).toContain('001246');
  });

  it('sends a clearly marked test message without issuing a code', async () => {
    mockDelivery();
    await sender.sendTest(recipient);
    const [headers, content] = deliveredMessage().split('\r\n\r\n');
    expect(headers).toContain(
      Buffer.from('Prueba de correo de INHALEX').toString('base64'),
    );
    expect(Buffer.from(content, 'base64').toString('utf8')).toContain(
      'Este es un correo de prueba',
    );
  });

  it('keeps mail disabled until a complete Gmail configuration is supplied', () => {
    const read = (key: string) =>
      key === 'REGISTRATION_EMAIL_PROVIDER' ? 'gmail' : undefined;
    expect(createGmailRegistrationCodeSender(read)).toBeNull();
  });

  it('rejects injected recipients before making a request', async () => {
    await expect(
      sender.sendTest(`${recipient}\r\nBcc: alguien@example.test`),
    ).rejects.toThrow('destinatario');
    expect(fetchGoogle).not.toHaveBeenCalled();
  });

  it('reports expired authorization without exposing Google response details', async () => {
    fetchGoogle.mockResolvedValueOnce(
      Response.json(
        {
          error: 'invalid_grant',
          error_description: 'private provider payload',
        },
        { status: 400 },
      ),
    );

    await expect(sender.sendTest(recipient)).rejects.toThrow(
      'Vuelve a autorizar',
    );
    expect(fetchGoogle).toHaveBeenCalledTimes(1);
  });

  it('leaves an uncertain send to the operator instead of retrying it automatically', async () => {
    fetchGoogle
      .mockResolvedValueOnce(
        Response.json({ access_token: 'test-access-token' }),
      )
      .mockRejectedValueOnce(new Error('connection interrupted'));

    await expect(sender.sendTest(recipient)).rejects.toThrow(
      'Revisa la conexión y el buzón',
    );
    expect(fetchGoogle).toHaveBeenCalledTimes(2);
  });
});
