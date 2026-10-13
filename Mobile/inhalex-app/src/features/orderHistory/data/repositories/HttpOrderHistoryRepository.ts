import { ApiError } from '@/core/network/ApiError';
import type { OrderHistoryDetail, OrderHistoryPage } from '../../domain/entities/OrderHistory';
import type { OrderHistoryRepository } from '../../domain/repositories/OrderHistoryRepository';
import type { OrderHistoryApi } from '../adapters/OrderHistoryApiAdapter';
import { isOrderHistoryCursor, mapOrderHistoryDetail, mapOrderHistoryPage } from '../mappers/orderHistoryMapper';

export class HttpOrderHistoryRepository implements OrderHistoryRepository {
  constructor(private readonly api: OrderHistoryApi, private readonly assetBaseUrl?: string) {}

  async list(cursor?: string, isCurrent?: () => boolean): Promise<OrderHistoryPage> {
    if (cursor !== undefined && !isOrderHistoryCursor(cursor)) {
      throw new Error('No pudimos continuar el historial. Actualiza tus pedidos.');
    }
    const page = mapOrderHistoryPage(await this.api.list(cursor, isCurrent));
    if (cursor !== undefined && page.nextCursor === cursor) {
      throw new Error('No pudimos avanzar en el historial. Actualiza tus pedidos.');
    }
    return page;
  }

  async getById(orderId: string, isCurrent?: () => boolean): Promise<OrderHistoryDetail> {
    if (typeof orderId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(orderId)) {
      throw new ApiError('No encontramos este pedido en tu cuenta.', 404);
    }
    const id = orderId.toLowerCase();
    try {
      const detail = mapOrderHistoryDetail(await this.api.getById(id, isCurrent), this.assetBaseUrl);
      if (detail.id !== id) throw new Error('La información recibida no corresponde al pedido seleccionado.');
      return detail;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('No encontramos este pedido en tu cuenta.', 404, error);
      }
      throw error;
    }
  }
}
