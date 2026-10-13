import { ApiError } from '@/core/network/ApiError';
import type { OrderTracking } from '../../domain/entities/OrderTracking';
import type { OrderTrackingRepository } from '../../domain/repositories/OrderTrackingRepository';
import type { OrderTrackingApi } from '../adapters/OrderTrackingApiAdapter';
import { mapOrderTracking } from '../mappers/orderTrackingMapper';

export class HttpOrderTrackingRepository implements OrderTrackingRepository {
  constructor(private readonly api: OrderTrackingApi) {}

  async getById(orderId: string, isCurrent?: () => boolean): Promise<OrderTracking> {
    if (typeof orderId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(orderId)) {
      throw new ApiError('No encontramos este pedido en tu cuenta.', 404);
    }
    const id = orderId.toLowerCase();
    try {
      const tracking = mapOrderTracking(await this.api.getById(id, isCurrent));
      if (tracking.id !== id) throw new Error('La información recibida no corresponde al pedido seleccionado.');
      return tracking;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('No encontramos este pedido en tu cuenta.', 404, error);
      }
      throw error;
    }
  }
}
