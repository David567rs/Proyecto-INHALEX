import { BadRequestException } from '@nestjs/common';
import { createHash, ECDH } from 'node:crypto';

/** No arbitrary fetch destination: only browser-owned push services over TLS. */
export function validatePushEndpoint(endpoint: string): string {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new BadRequestException(
      'El servicio de notificaciones no es válido.',
    );
  }
  const host = url.hostname.toLowerCase();
  const allowed =
    host === 'fcm.googleapis.com' ||
    host === 'updates.push.services.mozilla.com' ||
    host === 'web.push.apple.com' ||
    host.endsWith('.notify.windows.com');
  if (
    !allowed ||
    url.protocol !== 'https:' ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    url.hash ||
    url.pathname === '/' ||
    endpoint.length > 2048
  ) {
    throw new BadRequestException(
      'El servicio de notificaciones no es compatible.',
    );
  }
  return url.href;
}

export function pushEndpointHash(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}

export function validatePushKeys(keys: { p256dh: string; auth: string }): void {
  try {
    const key = Buffer.from(keys.p256dh, 'base64url');
    if (
      key.length !== 65 ||
      key[0] !== 4 ||
      Buffer.from(keys.auth, 'base64url').length !== 16
    ) {
      throw new Error('Invalid key size');
    }
    // Also reject points that are not on the P-256 curve.
    ECDH.convertKey(key, 'prime256v1');
  } catch {
    throw new BadRequestException(
      'La suscripción de este navegador no es válida.',
    );
  }
}
