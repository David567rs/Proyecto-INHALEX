import type { ConfirmedOrder, ConfirmOrderInput, OrderItemInput, OrderPreview } from '../entities/Order';

export interface OrderRepository {
  preview(items: OrderItemInput[], isCurrent?: () => boolean): Promise<OrderPreview>;
  confirm(input: ConfirmOrderInput, idempotencyKey: string, isCurrent?: () => boolean): Promise<ConfirmedOrder>;
}
