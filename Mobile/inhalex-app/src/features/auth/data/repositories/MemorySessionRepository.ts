import type { SessionRepository } from '../../domain/repositories/SessionRepository';

/** Sesión temporal para la vista web de desarrollo; nunca persiste el token en el navegador. */
export class MemorySessionRepository implements SessionRepository {
  private accessToken: string | null = null;

  async getAccessToken(): Promise<string | null> {
    return this.accessToken;
  }

  async saveAccessToken(accessToken: string): Promise<void> {
    this.accessToken = accessToken;
  }

  async clear(): Promise<void> {
    this.accessToken = null;
  }
}
