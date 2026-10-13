import type { OrderHistoryDetail, OrderHistoryPage } from '../entities/OrderHistory';

export interface OrderHistoryRepository {
  list(cursor?: string, isCurrent?: () => boolean): Promise<OrderHistoryPage>;
  getById(id: string, isCurrent?: () => boolean): Promise<OrderHistoryDetail>;
}
