import type { OrderTracking } from '../entities/OrderTracking';

export interface OrderTrackingRepository {
  getById(id: string, isCurrent?: () => boolean): Promise<OrderTracking>;
}
