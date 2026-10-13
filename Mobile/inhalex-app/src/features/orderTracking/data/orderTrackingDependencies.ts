import { HttpClient } from '@/core/network/HttpClient';
import { sessionRepository } from '../../auth/data/repositories/sessionRepository';
import type { SessionRepository } from '../../auth/domain/repositories/SessionRepository';
import type { OrderTrackingRepository } from '../domain/repositories/OrderTrackingRepository';
import { OrderTrackingApiAdapter, type OrderTrackingHttpTransport } from './adapters/OrderTrackingApiAdapter';
import { HttpOrderTrackingRepository } from './repositories/HttpOrderTrackingRepository';

export function createOrderTrackingRepository(
  httpClient: OrderTrackingHttpTransport = new HttpClient(),
  session: Pick<SessionRepository, 'getAccessToken'> = sessionRepository,
): OrderTrackingRepository {
  return new HttpOrderTrackingRepository(new OrderTrackingApiAdapter(httpClient, session));
}

export const orderTrackingRepository = createOrderTrackingRepository();
