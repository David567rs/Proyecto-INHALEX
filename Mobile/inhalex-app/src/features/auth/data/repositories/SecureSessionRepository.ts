import * as SecureStore from 'expo-secure-store';
import type { SessionRepository } from '../../domain/repositories/SessionRepository';

const ACCESS_TOKEN_KEY = 'inhalex.access_token';
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export class SecureSessionRepository implements SessionRepository {
  async getAccessToken(): Promise<string | null> {
    await this.ensureAvailable();
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS);
  }

  async saveAccessToken(accessToken: string): Promise<void> {
    await this.ensureAvailable();
    return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken, SECURE_STORE_OPTIONS);
  }

  async clear(): Promise<void> {
    await this.ensureAvailable();
    return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS);
  }

  private async ensureAvailable(): Promise<void> {
    if (!(await SecureStore.isAvailableAsync())) {
      throw new Error('El almacenamiento seguro no está disponible. Vuelve a abrir la app con una versión compatible de Expo Go o de la aplicación.');
    }
  }
}
