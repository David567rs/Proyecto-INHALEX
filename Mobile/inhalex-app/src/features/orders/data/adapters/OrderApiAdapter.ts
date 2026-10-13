import { ApiError } from '@/core/network/ApiError';
import type { HttpRequestOptions } from '@/core/network/HttpClient';
import type { SessionRepository } from '../../../auth/domain/repositories/SessionRepository';
import type { ConfirmOrderInput, OrderItemInput } from '../../domain/entities/Order';

export interface OrderHttpTransport {
  request<T>(path: string, options?: HttpRequestOptions): Promise<T>;
}

export interface OrderApi {
  preview(items: OrderItemInput[], isCurrent?: () => boolean): Promise<unknown>;
  confirm(input: ConfirmOrderInput, idempotencyKey: string, isCurrent?: () => boolean): Promise<unknown>;
}

export class OrderApiAdapter implements OrderApi {
  constructor(
    private readonly httpClient: OrderHttpTransport,
    private readonly session: Pick<SessionRepository, 'getAccessToken'>,
  ) {}

  preview(items: OrderItemInput[], isCurrent?: () => boolean): Promise<unknown> {
    return this.request('/orders/draft/preview', {
      method: 'POST', body: { items: items.map(({ productId, quantity }) => ({ productId, quantity })) },
    }, isCurrent);
  }

  confirm(input: ConfirmOrderInput, idempotencyKey: string, isCurrent?: () => boolean): Promise<unknown> {
    return this.request('/orders/confirm', {
      method: 'POST', idempotencyKey,
      body: {
        items: input.items.map(({ productId, quantity }) => ({ productId, quantity })),
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        shippingAddressId: input.shippingAddressId,
        previewSignature: input.previewSignature,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    }, isCurrent);
  }

  private async request(path: string, options: HttpRequestOptions, isCurrent?: () => boolean): Promise<unknown> {
    this.assertCurrent(isCurrent);
    const token = await this.session.getAccessToken();
    this.assertCurrent(isCurrent);
    if (!token?.trim()) throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    return this.httpClient.request<unknown>(path, { ...options, token });
  }

  private assertCurrent(isCurrent?: () => boolean): void {
    if (isCurrent && !isCurrent()) throw new ApiError('La sesión cambió. Vuelve a intentarlo.', 401);
  }
}
