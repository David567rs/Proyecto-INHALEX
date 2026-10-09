export interface SessionRepository {
  getAccessToken(): Promise<string | null>;
  saveAccessToken(accessToken: string): Promise<void>;
  clear(): Promise<void>;
}
