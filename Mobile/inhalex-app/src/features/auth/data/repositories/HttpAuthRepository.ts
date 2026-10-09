import { HttpClient } from '@/core/network/HttpClient';
import type { AuthSession, LoginInput, RegisterInput } from '../../domain/entities/AuthCredentials';
import type { AuthUser } from '../../domain/entities/AuthUser';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { AuthResponseDto, AuthUserDto } from '../dto/authDtos';
import { mapAuthSession, mapAuthUser } from '../mappers/authMapper';

export class HttpAuthRepository implements AuthRepository {
  constructor(private readonly httpClient: HttpClient) {}

  async login(input: LoginInput): Promise<AuthSession> {
    const response = await this.httpClient.request<AuthResponseDto>('/auth/login', {
      method: 'POST',
      body: input,
    });
    return mapAuthSession(response);
  }

  async register(input: RegisterInput): Promise<AuthSession> {
    const response = await this.httpClient.request<AuthResponseDto>('/auth/register', {
      method: 'POST',
      body: input,
    });
    return mapAuthSession(response);
  }

  async getProfile(accessToken: string): Promise<AuthUser> {
    const response = await this.httpClient.request<AuthUserDto>('/auth/me', {
      token: accessToken,
    });
    return mapAuthUser(response);
  }

  logout(): Promise<void> {
    return this.httpClient.request<void>('/auth/logout', { method: 'POST' });
  }
}
