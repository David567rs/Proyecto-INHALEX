import { HttpClient } from '@/core/network/HttpClient';
import { sessionRepository } from '../../auth/data/repositories/sessionRepository';
import type { SessionRepository } from '../../auth/domain/repositories/SessionRepository';
import type { CartRepository } from '../domain/repositories/CartRepository';
import { CartApiAdapter, type CartHttpTransport } from './adapters/CartApiAdapter';
import { HttpCartRepository } from './repositories/HttpCartRepository';

export function createCartRepository(
  httpClient: CartHttpTransport = new HttpClient(),
  session: Pick<SessionRepository, 'getAccessToken'> = sessionRepository,
  assetBaseUrl = process.env.EXPO_PUBLIC_ASSET_URL,
): CartRepository {
  return new HttpCartRepository(new CartApiAdapter(httpClient, session), assetBaseUrl);
}

export const cartRepository = createCartRepository();
