import { ApiError } from '@/core/network/ApiError';
import type { HttpRequestOptions } from '@/core/network/HttpClient';
import type { SessionRepository } from '../../../auth/domain/repositories/SessionRepository';

export interface OrderHistoryHttpTransport {
  request<T>(path: string, options?: HttpRequestOptions): Promise<T>;
}

export interface OrderHistoryApi {
  list(cursor?: string, isCurrent?: () => boolean): Promise<unknown>;
  getById(id: string, isCurrent?: () => boolean): Promise<unknown>;
}

export class OrderHistoryApiAdapter implements OrderHistoryApi {
  constructor(
    private readonly httpClient: OrderHistoryHttpTransport,
    private readonly session: Pick<SessionRepository, 'getAccessToken'>,
  ) {}

  list(cursor?: string, isCurrent?: () => boolean): Promise<unknown> {
    return this.request(`/orders/me${cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`}`, isCurrent);
  }

  getById(id: string, isCurrent?: () => boolean): Promise<unknown> {
    return this.request(`/orders/me/${encodeURIComponent(id)}`, isCurrent);
  }

  private async request(path: string, isCurrent?: () => boolean): Promise<unknown> {
    this.assertCurrent(isCurrent);
    const token = await this.session.getAccessToken();
    this.assertCurrent(isCurrent);
    if (!token?.trim()) throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    const response = await this.httpClient.request<unknown>(path, { method: 'GET', token });
    this.assertCurrent(isCurrent);
    return response;
  }

  private assertCurrent(isCurrent?: () => boolean): void {
    if (isCurrent && !isCurrent()) throw new ApiError('La sesión cambió. Vuelve a intentarlo.', 401);
  }
}
