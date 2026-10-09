import type { AuthSession, LoginInput, RegisterInput } from '../entities/AuthCredentials';
import type { AuthUser } from '../entities/AuthUser';

export interface AuthRepository {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  getProfile(accessToken: string): Promise<AuthUser>;
  logout(): Promise<void>;
}
