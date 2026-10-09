import { environment } from '@/core/config/environment';
import { ApiError } from './ApiError';

interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const apiPayload = payload as ApiErrorPayload;
  if (Array.isArray(apiPayload.message)) {
    return apiPayload.message.join('. ');
  }

  if (typeof apiPayload.message === 'string') {
    return apiPayload.message;
  }

  if (typeof apiPayload.error === 'string') {
    return apiPayload.error;
  }

  return fallback;
}

export class HttpClient {
  constructor(private readonly baseUrl = environment.apiUrl) {}

  async request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), environment.requestTimeoutMs);
    const hasBody = options.body !== undefined;

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 204) {
        return undefined as T;
      }

      const contentType = response.headers.get('content-type') ?? '';
      const payload: unknown = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new ApiError(
          messageFromPayload(payload, 'No se pudo completar la solicitud.'),
          response.status,
        );
      }

      return payload as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('La solicitud tardo demasiado. Intenta de nuevo.', null, error);
      }

      throw new ApiError(
        environment.apiConnectionHint ?? 'No se pudo conectar con INHALEX. Revisa tu conexión e intenta de nuevo.',
        null,
        error,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
