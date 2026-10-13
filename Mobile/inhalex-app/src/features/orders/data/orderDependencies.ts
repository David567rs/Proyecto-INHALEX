import { HttpClient } from '@/core/network/HttpClient';
import { sessionRepository } from '../../auth/data/repositories/sessionRepository';
import type { SessionRepository } from '../../auth/domain/repositories/SessionRepository';
import type { OrderRepository } from '../domain/repositories/OrderRepository';
import { OrderApiAdapter, type OrderHttpTransport } from './adapters/OrderApiAdapter';
import { HttpOrderRepository } from './repositories/HttpOrderRepository';

export function createOrderRepository(
  httpClient: OrderHttpTransport = new HttpClient(),
  session: Pick<SessionRepository, 'getAccessToken'> = sessionRepository,
  assetBaseUrl = process.env.EXPO_PUBLIC_ASSET_URL,
): OrderRepository {
  return new HttpOrderRepository(new OrderApiAdapter(httpClient, session), assetBaseUrl);
}

export const orderRepository = createOrderRepository();
