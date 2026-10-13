import { HttpClient } from '@/core/network/HttpClient';
import { sessionRepository } from '../../auth/data/repositories/sessionRepository';
import type { SessionRepository } from '../../auth/domain/repositories/SessionRepository';
import type { OrderHistoryRepository } from '../domain/repositories/OrderHistoryRepository';
import { OrderHistoryApiAdapter, type OrderHistoryHttpTransport } from './adapters/OrderHistoryApiAdapter';
import { HttpOrderHistoryRepository } from './repositories/HttpOrderHistoryRepository';

export function createOrderHistoryRepository(
  httpClient: OrderHistoryHttpTransport = new HttpClient(),
  session: Pick<SessionRepository, 'getAccessToken'> = sessionRepository,
  assetBaseUrl = process.env.EXPO_PUBLIC_ASSET_URL,
): OrderHistoryRepository {
  return new HttpOrderHistoryRepository(new OrderHistoryApiAdapter(httpClient, session), assetBaseUrl);
}

export const orderHistoryRepository = createOrderHistoryRepository();
