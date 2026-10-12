import { mapCatalogProduct } from '../../../catalog/data/mappers/catalogMapper';
import { MAX_CART_QUANTITY, type Cart, type CartItem } from '../../domain/entities/Cart';
import type { CartDto } from '../dto/cartDtos';

const invalidCart = () => new Error('No se pudo confirmar la información de tu bolsa. Intenta de nuevo.');

function money(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

function currencyCode(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value)) throw invalidCart();
  return value.toUpperCase();
}

/** Validate the whole response so a broken total never appears as a successful empty cart. */
export function mapCart(dto: CartDto, assetBaseUrl?: string): Cart {
  if (!dto || !Array.isArray(dto.items) || !Number.isSafeInteger(dto.totalItems) || dto.totalItems < 0 || !money(dto.subtotal)) {
    throw invalidCart();
  }
  const currency = currencyCode(dto.currency);
  const ids = new Set<string>();
  const items: CartItem[] = dto.items.map((item) => {
    if (
      !item || typeof item.productId !== 'string' || !item.productId.trim() || item.productId !== item.productId.trim() ||
      ids.has(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_CART_QUANTITY ||
      !money(item.subtotal) || !item.product || item.product._id !== item.productId ||
      currencyCode(item.product.currency) !== currency
    ) throw invalidCart();
    ids.add(item.productId);
    const product = mapCatalogProduct(item.product, assetBaseUrl);
    return {
      productId: item.productId,
      quantity: item.quantity,
      subtotal: item.subtotal,
      // The API's promotion rules may differ from catalog display rules. Keep its price.
      unitPrice: item.subtotal / item.quantity,
      product,
    };
  });
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tolerance = Number.EPSILON * Math.max(1, subtotal, dto.subtotal) * 16;
  if (!money(subtotal) || totalItems !== dto.totalItems || Math.abs(subtotal - dto.subtotal) > tolerance) {
    throw invalidCart();
  }
  return { items, totalItems: dto.totalItems, subtotal: dto.subtotal, currency };
}
