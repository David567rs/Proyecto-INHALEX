import { normalizeConfirmOrderInput, normalizeOrderItems, OrderInputError, type ConfirmedOrder, type ConfirmOrderInput, type OrderItemInput, type OrderPreview } from '../../domain/entities/Order';
import type { OrderRepository } from '../../domain/repositories/OrderRepository';
import type { OrderApi } from '../adapters/OrderApiAdapter';
import { mapConfirmedOrder, mapOrderPreview } from '../mappers/orderMapper';

export class HttpOrderRepository implements OrderRepository {
  constructor(private readonly api: OrderApi, private readonly assetBaseUrl?: string) {}

  async preview(items: OrderItemInput[], isCurrent?: () => boolean): Promise<OrderPreview> {
    const request = normalizeOrderItems(items);
    const preview = mapOrderPreview(await this.api.preview(request, isCurrent), this.assetBaseUrl);
    this.assertRequestedItems(preview, request);
    return preview;
  }

  async confirm(input: ConfirmOrderInput, idempotencyKey: string, isCurrent?: () => boolean): Promise<ConfirmedOrder> {
    const request = normalizeConfirmOrderInput(input);
    if (typeof idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) {
      throw new OrderInputError('No se pudo preparar la confirmación del pedido.');
    }
    const order = mapConfirmedOrder(await this.api.confirm(request, idempotencyKey, isCurrent), this.assetBaseUrl);
    this.assertRequestedItems(order, request.items);
    if (order.signature !== request.previewSignature) {
      throw new Error('La respuesta no corresponde al resumen confirmado. Reintenta con el mismo pedido.');
    }
    return order;
  }

  private assertRequestedItems(preview: OrderPreview, requested: OrderItemInput[]): void {
    const quantities = new Map(requested.map(item => [item.productId, item.quantity]));
    if (preview.items.some(item => quantities.get(item.productId) !== item.requestedQuantity)) {
      throw new Error('El resumen no corresponde a los productos solicitados. Reintenta con el mismo pedido.');
    }
  }
}
