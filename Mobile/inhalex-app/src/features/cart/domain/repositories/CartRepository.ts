import type { Cart } from '../entities/Cart';

export interface CartOperation {
  /** A session can change while its access token is being read from storage. */
  isCurrent?: () => boolean;
}

export interface CartRepository {
  list(operation?: CartOperation): Promise<Cart>;
  add(productId: string, quantity: number, operation?: CartOperation): Promise<Cart>;
  updateQuantity(productId: string, quantity: number, operation?: CartOperation): Promise<Cart>;
  remove(productId: string, operation?: CartOperation): Promise<Cart>;
  clear(operation?: CartOperation): Promise<Cart>;
}
