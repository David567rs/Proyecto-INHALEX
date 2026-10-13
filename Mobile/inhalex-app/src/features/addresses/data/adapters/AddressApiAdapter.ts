import { ApiError } from '@/core/network/ApiError';
import type { HttpRequestOptions } from '@/core/network/HttpClient';
import type { SessionRepository } from '../../../auth/domain/repositories/SessionRepository';
import type { AddressInput } from '../../domain/entities/ShippingAddress';

export interface AddressHttpTransport {
  request<T>(path: string, options?: HttpRequestOptions): Promise<T>;
}

export interface AddressApi {
  list(isCurrent?: () => boolean): Promise<unknown>;
  create(input: AddressInput, isCurrent?: () => boolean): Promise<unknown>;
  update(id: string, input: Partial<AddressInput>, isCurrent?: () => boolean): Promise<unknown>;
  remove(id: string, isCurrent?: () => boolean): Promise<unknown>;
}

const inputFields: (keyof AddressInput)[] = [
  'label', 'recipientName', 'phone', 'street', 'exteriorNumber', 'interiorNumber',
  'neighborhood', 'municipality', 'state', 'postalCode', 'references', 'isDefault',
];

/** Never send an ID or other response-only fields back to the whitelisted DTO. */
function inputBody(input: Partial<AddressInput>): Partial<AddressInput> {
  const body: Record<string, unknown> = {};
  for (const field of inputFields) {
    if (Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined) {
      body[field] = input[field];
    }
  }
  return body;
}

export class AddressApiAdapter implements AddressApi {
  constructor(
    private readonly httpClient: AddressHttpTransport,
    private readonly session: Pick<SessionRepository, 'getAccessToken'>,
  ) {}

  list(isCurrent?: () => boolean): Promise<unknown> {
    return this.request('/addresses', { method: 'GET' }, isCurrent);
  }

  create(input: AddressInput, isCurrent?: () => boolean): Promise<unknown> {
    return this.request('/addresses', { method: 'POST', body: inputBody(input) }, isCurrent);
  }

  update(id: string, input: Partial<AddressInput>, isCurrent?: () => boolean): Promise<unknown> {
    return this.request(`/addresses/${encodeURIComponent(id)}`, { method: 'PATCH', body: inputBody(input) }, isCurrent);
  }

  remove(id: string, isCurrent?: () => boolean): Promise<unknown> {
    return this.request(`/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' }, isCurrent);
  }

  private async request(path: string, options: HttpRequestOptions, isCurrent?: () => boolean): Promise<unknown> {
    this.assertCurrent(isCurrent);
    const token = await this.session.getAccessToken();
    this.assertCurrent(isCurrent);
    if (!token?.trim()) {
      throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    }
    return this.httpClient.request<unknown>(path, { ...options, token });
  }

  private assertCurrent(isCurrent?: () => boolean): void {
    if (isCurrent && !isCurrent()) {
      throw new ApiError('La sesión cambió. Vuelve a intentarlo.', 401);
    }
  }
}
