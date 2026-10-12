import { ApiError } from '@/core/network/ApiError';
import type { HttpRequestOptions } from '@/core/network/HttpClient';
import type { SessionRepository } from '../../../auth/domain/repositories/SessionRepository';
import type { CartOperation } from '../../domain/repositories/CartRepository';
import type { CartDto } from '../dto/cartDtos';

export interface CartHttpTransport {
  request<T>(path: string, options?: HttpRequestOptions): Promise<T>;
}

export interface CartApi {
  list(operation?: CartOperation): Promise<CartDto>;
  add(productId: string, quantity: number, operation?: CartOperation): Promise<CartDto>;
  updateQuantity(productId: string, quantity: number, operation?: CartOperation): Promise<CartDto>;
  remove(productId: string, operation?: CartOperation): Promise<CartDto>;
}

export class CartApiAdapter implements CartApi {
  constructor(
    private readonly httpClient: CartHttpTransport,
    private readonly session: Pick<SessionRepository, 'getAccessToken'>,
  ) {}

  list(operation?: CartOperation): Promise<CartDto> {
    return this.request('/cart', { method: 'GET' }, operation);
  }

  add(productId: string, quantity: number, operation?: CartOperation): Promise<CartDto> {
    return this.request('/cart', { method: 'POST', body: { productId, quantity } }, operation);
  }

  updateQuantity(productId: string, quantity: number, operation?: CartOperation): Promise<CartDto> {
    return this.request(`/cart/${encodeURIComponent(productId)}`, { method: 'PATCH', body: { quantity } }, operation);
  }

  remove(productId: string, operation?: CartOperation): Promise<CartDto> {
    return this.request(`/cart/${encodeURIComponent(productId)}`, { method: 'DELETE' }, operation);
  }

  private async request(
    path: string,
    options: HttpRequestOptions,
    operation?: CartOperation,
  ): Promise<CartDto> {
    this.assertCurrent(operation);
    const token = await this.session.getAccessToken();
    this.assertCurrent(operation);
    if (!token?.trim()) {
      throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    }
    return this.httpClient.request<CartDto>(path, { ...options, token });
  }

  private assertCurrent(operation?: CartOperation): void {
    if (operation?.isCurrent && !operation.isCurrent()) {
      throw new ApiError('La sesión cambió. Vuelve a intentarlo.', 401);
    }
  }
}
