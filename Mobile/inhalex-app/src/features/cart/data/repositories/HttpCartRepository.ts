import { MAX_CART_QUANTITY, type Cart } from '../../domain/entities/Cart';
import type { CartOperation, CartRepository } from '../../domain/repositories/CartRepository';
import type { CartApi } from '../adapters/CartApiAdapter';
import { mapCart } from '../mappers/cartMapper';

export class HttpCartRepository implements CartRepository {
  constructor(private readonly api: CartApi, private readonly assetBaseUrl?: string) {}

  async list(operation?: CartOperation): Promise<Cart> {
    return mapCart(await this.api.list(operation), this.assetBaseUrl);
  }

  async add(productId: string, quantity: number, operation?: CartOperation): Promise<Cart> {
    this.validateProductId(productId);
    this.validateQuantity(quantity);
    const cart = mapCart(await this.api.add(productId, quantity, operation), this.assetBaseUrl);
    if (!cart.items.some((item) => item.productId === productId && item.quantity >= quantity)) throw this.unconfirmed();
    return cart;
  }

  async updateQuantity(productId: string, quantity: number, operation?: CartOperation): Promise<Cart> {
    this.validateProductId(productId);
    this.validateQuantity(quantity);
    const cart = mapCart(await this.api.updateQuantity(productId, quantity, operation), this.assetBaseUrl);
    if (!cart.items.some((item) => item.productId === productId && item.quantity === quantity)) throw this.unconfirmed();
    return cart;
  }

  async remove(productId: string, operation?: CartOperation): Promise<Cart> {
    this.validateProductId(productId);
    const cart = mapCart(await this.api.remove(productId, operation), this.assetBaseUrl);
    if (cart.items.some((item) => item.productId === productId)) throw this.unconfirmed();
    return cart;
  }

  async clear(operation?: CartOperation): Promise<Cart> {
    const cart = mapCart(await this.api.clear(operation), this.assetBaseUrl);
    if (cart.items.length || cart.totalItems !== 0 || cart.subtotal !== 0) throw this.unconfirmed();
    return cart;
  }

  private validateProductId(productId: string): void {
    if (typeof productId !== 'string' || !productId.trim() || productId !== productId.trim()) {
      throw new Error('No se pudo identificar el producto. Intenta de nuevo.');
    }
  }

  private validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) {
      throw new Error(`Elige una cantidad entre 1 y ${MAX_CART_QUANTITY}.`);
    }
  }

  private unconfirmed(): Error {
    return new Error('No se pudo confirmar el cambio en tu bolsa. Actualiza e intenta de nuevo.');
  }
}
