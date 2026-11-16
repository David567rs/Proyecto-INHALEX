import { isEmail } from 'class-validator';
import type { RegistrationCodeSender } from './registration-code-sender';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_USERS_URL = 'https://gmail.googleapis.com/gmail/v1/users';
const REQUEST_TIMEOUT_MS = 10_000;

interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fromEmail: string;
}

function isMailbox(value: string): boolean {
  return value.length <= 254 && !/[\r\n]/.test(value) && isEmail(value);
}

export function createGmailRegistrationCodeSender(
  read: (key: string) => string | undefined,
): GmailRegistrationCodeSender | null {
  if (read('REGISTRATION_EMAIL_PROVIDER') !== 'gmail') return null;

  const clientId = read('GMAIL_OAUTH_CLIENT_ID')?.trim();
  const clientSecret = read('GMAIL_OAUTH_CLIENT_SECRET')?.trim();
  const refreshToken = read('GMAIL_OAUTH_REFRESH_TOKEN')?.trim();
  const fromEmail = read('GMAIL_FROM_EMAIL')?.trim();
  if (
    !clientId ||
    !clientSecret ||
    !refreshToken ||
    !fromEmail ||
    !isMailbox(fromEmail)
  ) {
    return null;
  }

  return new GmailRegistrationCodeSender({
    clientId,
    clientSecret,
    refreshToken,
    fromEmail,
  });
}

export class GmailRegistrationCodeSender implements RegistrationCodeSender {
  readonly available = true;

  constructor(
    private readonly credentials: GmailCredentials,
    private readonly request: typeof fetch = fetch,
  ) {}

  async send(
    email: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    await this.deliver(
      email,
      'Tu código de verificación de INHALEX',
      [
        'Hola,',
        '',
        `Tu código para confirmar el correo de tu cuenta de INHALEX es ${code}.`,
        `Puedes usarlo una vez durante los próximos ${expiresInMinutes} minutos.`,
        '',
        'Si no solicitaste este código, puedes ignorar este correo.',
        '',
        'INHALEX',
      ].join('\n'),
    );
  }

  async sendTest(email: string): Promise<void> {
    await this.deliver(
      email,
      'Prueba de correo de INHALEX',
      [
        'Este es un correo de prueba enviado por el backend de INHALEX mediante Gmail API.',
        '',
        'Cuando se habilite el registro verificado, los códigos llegarán desde este remitente.',
        '',
        'INHALEX',
      ].join('\n'),
    );
  }

  private async deliver(
    email: string,
    subject: string,
    body: string,
  ): Promise<void> {
    const { fromEmail } = this.credentials;
    if (!isMailbox(email) || !isMailbox(fromEmail)) {
      throw new Error(
        'Revisa la dirección del remitente y la del destinatario.',
      );
    }

    const accessToken = await this.refreshAccess();
    const subjectHeader = Buffer.from(subject, 'utf8').toString('base64');
    const bodyLines =
      Buffer.from(body, 'utf8')
        .toString('base64')
        .match(/.{1,76}/g) ?? [];
    const message = [
      `From: INHALEX <${fromEmail}>`,
      `To: <${email}>`,
      `Subject: =?UTF-8?B?${subjectHeader}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      ...bodyLines,
      '',
    ].join('\r\n');

    const sendUrl = `${GMAIL_USERS_URL}/${encodeURIComponent(fromEmail)}/messages/send`;
    const response = await this.post(sendUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: Buffer.from(message, 'utf8').toString('base64url'),
      }),
    });
    if (!response.ok)
      throw new Error(`Gmail no aceptó el envío (HTTP ${response.status}).`);
  }

  private async refreshAccess(): Promise<string> {
    const { clientId, clientSecret, refreshToken } = this.credentials;
    const response = await this.post(TOKEN_URL, {
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        payload.error === 'invalid_grant'
      ) {
        throw new Error(
          'La autorización de Gmail venció o fue revocada. Vuelve a autorizar el remitente.',
        );
      }
      throw new Error(
        `Google no pudo renovar la autorización de Gmail (HTTP ${response.status}).`,
      );
    }
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('access_token' in payload) ||
      typeof payload.access_token !== 'string' ||
      !payload.access_token
    ) {
      throw new Error('Google devolvió una autorización de Gmail inválida.');
    }
    return payload.access_token;
  }

  private async post(url: string, options: RequestInit): Promise<Response> {
    try {
      return await this.request(url, {
        ...options,
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new Error(
        'No se pudo completar la conexión con Google. Revisa la conexión y el buzón antes de volver a enviar.',
      );
    }
  }
}
