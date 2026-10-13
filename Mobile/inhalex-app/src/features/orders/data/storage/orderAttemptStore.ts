import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { ChunkedOrderAttemptStore } from './ChunkedOrderAttemptStore';

const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export function createOrderAttemptStore(userId: string) {
  return new ChunkedOrderAttemptStore(userId, {
    get: key => SecureStore.getItemAsync(key, options),
    set: (key, value) => SecureStore.setItemAsync(key, value, options),
    remove: key => SecureStore.deleteItemAsync(key, options),
  }, randomUUID);
}
