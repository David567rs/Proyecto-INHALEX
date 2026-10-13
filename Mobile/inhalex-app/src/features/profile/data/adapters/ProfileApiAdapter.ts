import { ApiError } from '@/core/network/ApiError';
import type { HttpRequestOptions } from '@/core/network/HttpClient';
import type { SessionRepository } from '../../../auth/domain/repositories/SessionRepository';
import type { ProfileInput } from '../../domain/entities/Profile';

export interface ProfileHttpTransport {
  request<T>(path: string, options?: HttpRequestOptions): Promise<T>;
}

export interface ProfileApi {
  get(isCurrent?: () => boolean): Promise<unknown>;
  update(input: ProfileInput, isCurrent?: () => boolean): Promise<unknown>;
}

export class ProfileApiAdapter implements ProfileApi {
  constructor(
    private readonly httpClient: ProfileHttpTransport,
    private readonly session: Pick<SessionRepository, 'getAccessToken'>,
  ) {}

  get(isCurrent?: () => boolean): Promise<unknown> {
    return this.request({ method: 'GET' }, isCurrent);
  }

  update(input: ProfileInput, isCurrent?: () => boolean): Promise<unknown> {
    const { firstName, lastName, phone } = input;
    return this.request({ method: 'PATCH', body: { firstName, lastName, phone } }, isCurrent);
  }

  private async request(options: HttpRequestOptions, isCurrent?: () => boolean): Promise<unknown> {
    this.assertCurrent(isCurrent);
    const token = await this.session.getAccessToken();
    this.assertCurrent(isCurrent);
    if (!token?.trim()) throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    const response = await this.httpClient.request<unknown>('/auth/me', { ...options, token });
    this.assertCurrent(isCurrent);
    return response;
  }

  private assertCurrent(isCurrent?: () => boolean): void {
    if (isCurrent && !isCurrent()) throw new ApiError('La sesión cambió. Vuelve a intentarlo.', 401);
  }
}
