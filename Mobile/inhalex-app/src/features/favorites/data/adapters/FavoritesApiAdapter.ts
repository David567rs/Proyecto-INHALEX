import { ApiError } from '@/core/network/ApiError';
import type { HttpRequestOptions } from '@/core/network/HttpClient';
import type { SessionRepository } from '../../../auth/domain/repositories/SessionRepository';
import type { ProductDto } from '../../../catalog/data/dto/catalogDtos';
import type { FavoritesOperation } from '../../domain/repositories/FavoritesRepository';

export interface FavoritesHttpTransport {
  request<T>(path: string, options?: HttpRequestOptions): Promise<T>;
}

export interface FavoriteMutationDto {
  productId: string;
}

export interface FavoritesApi {
  list(operation?: FavoritesOperation): Promise<ProductDto[]>;
  add(productId: string, operation?: FavoritesOperation): Promise<FavoriteMutationDto>;
  remove(productId: string, operation?: FavoritesOperation): Promise<FavoriteMutationDto>;
}

/** Authenticated adapter uses the current session for every request. */
export class FavoritesApiAdapter implements FavoritesApi {
  constructor(
    private readonly httpClient: FavoritesHttpTransport,
    private readonly session: Pick<SessionRepository, 'getAccessToken'>,
  ) {}

  list(operation?: FavoritesOperation): Promise<ProductDto[]> {
    return this.request('/favorites', 'GET', operation);
  }

  add(productId: string, operation?: FavoritesOperation): Promise<FavoriteMutationDto> {
    return this.request(`/favorites/${encodeURIComponent(productId)}`, 'PUT', operation);
  }

  remove(productId: string, operation?: FavoritesOperation): Promise<FavoriteMutationDto> {
    return this.request(`/favorites/${encodeURIComponent(productId)}`, 'DELETE', operation);
  }

  private async request<T>(
    path: string,
    method: HttpRequestOptions['method'],
    operation?: FavoritesOperation,
  ): Promise<T> {
    this.assertCurrent(operation);
    const token = await this.session.getAccessToken();
    // Never send an old screen's write with a replacement account's token.
    this.assertCurrent(operation);
    if (!token?.trim()) {
      throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    }
    return this.httpClient.request<T>(path, { method, token });
  }

  private assertCurrent(operation?: FavoritesOperation): void {
    if (operation?.isCurrent && !operation.isCurrent()) {
      throw new ApiError('La sesión cambió. Vuelve a intentarlo.', 401);
    }
  }
}
