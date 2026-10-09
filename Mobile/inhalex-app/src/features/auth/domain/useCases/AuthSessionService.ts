import { ApiError } from '@/core/network/ApiError';
import type { AuthSession, LoginInput, RegisterInput } from '../entities/AuthCredentials';
import type { AuthUser } from '../entities/AuthUser';
import type { AuthRepository } from '../repositories/AuthRepository';
import type { SessionRepository } from '../repositories/SessionRepository';

export type RestoreSessionResult =
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated' };

export class AuthSessionService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async login(input: LoginInput): Promise<AuthUser> {
    return this.persistAuthenticatedSession(await this.authRepository.login(input));
  }

  async register(input: RegisterInput): Promise<AuthUser> {
    return this.persistAuthenticatedSession(await this.authRepository.register(input));
  }

  async restore(): Promise<RestoreSessionResult> {
    const accessToken = await this.sessionRepository.getAccessToken();
    if (!accessToken) {
      return { status: 'unauthenticated' };
    }

    try {
      const user = await this.authRepository.getProfile(accessToken);
      return { status: 'authenticated', user };
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        await this.sessionRepository.clear();
        return { status: 'unauthenticated' };
      }

      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.sessionRepository.clear();
    void this.authRepository.logout().catch(() => {
      // El JWT del cliente ya fue eliminado. El endpoint remoto solo limpia la cookie web.
    });
  }

  private async persistAuthenticatedSession(session: AuthSession): Promise<AuthUser> {
    await this.sessionRepository.saveAccessToken(session.accessToken);
    return session.user;
  }
}
