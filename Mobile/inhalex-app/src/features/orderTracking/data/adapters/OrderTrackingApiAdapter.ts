import { ApiError } from '@/core/network/ApiError';
import type { HttpRequestOptions } from '@/core/network/HttpClient';
import type { SessionRepository } from '../../../auth/domain/repositories/SessionRepository';

export interface OrderTrackingHttpTransport {
  request<T>(path: string, options?: HttpRequestOptions): Promise<T>;
}

export interface OrderTrackingApi {
  getById(id: string, isCurrent?: () => boolean): Promise<unknown>;
}

export class OrderTrackingApiAdapter implements OrderTrackingApi {
  constructor(
    private readonly httpClient: OrderTrackingHttpTransport,
    private readonly session: Pick<SessionRepository, 'getAccessToken'>,
  ) {}

  async getById(id: string, isCurrent?: () => boolean): Promise<unknown> {
    this.assertCurrent(isCurrent);
    const token = await this.session.getAccessToken();
    this.assertCurrent(isCurrent);
    if (!token?.trim()) throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    const response = await this.httpClient.request<unknown>(`/orders/me/${encodeURIComponent(id)}/tracking`, {
      method: 'GET', token,
    });
    this.assertCurrent(isCurrent);
    return response;
  }

  private assertCurrent(isCurrent?: () => boolean): void {
    if (isCurrent && !isCurrent()) throw new ApiError('La sesión cambió. Vuelve a intentarlo.', 401);
  }
}
