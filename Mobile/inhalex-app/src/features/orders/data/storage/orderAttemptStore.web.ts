import { randomUUID } from 'expo-crypto';
import { ChunkedOrderAttemptStore } from './ChunkedOrderAttemptStore';

/** Per-tab recovery across refreshes. Auth tokens are never stored here. */
export function createOrderAttemptStore(userId: string) {
  return new ChunkedOrderAttemptStore(userId, {
    get: async key => sessionStorage.getItem(key),
    set: async (key, value) => sessionStorage.setItem(key, value),
    remove: async key => sessionStorage.removeItem(key),
  }, randomUUID);
}
