import type { CatalogProduct } from '../../../catalog/domain/entities/CatalogProduct';

export interface CartItem {
  productId: string;
  quantity: number;
  /** Prices in the cart are confirmed by the server, including promotions. */
  subtotal: number;
  unitPrice: number;
  product: CatalogProduct;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  currency: string;
}

export const MAX_CART_QUANTITY = 25;

export function createEmptyCart(): Cart {
  return { items: [], totalItems: 0, subtotal: 0, currency: 'MXN' };
}

export function getCartQuantityLimit(product: CatalogProduct): number {
  if (product.allowBackorder) return MAX_CART_QUANTITY;
  if (!product.inStock) return 0;
  if (typeof product.stockAvailable === 'number' && Number.isFinite(product.stockAvailable)) {
    return Math.max(0, Math.min(MAX_CART_QUANTITY, Math.floor(product.stockAvailable)));
  }
  return MAX_CART_QUANTITY;
}
