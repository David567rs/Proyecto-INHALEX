import { resolveProductImageUrl } from '../../../catalog/data/mappers/catalogMapper';
import type { ConfirmedOrder, OrderIssue, OrderItemFulfillment, OrderPreview, OrderPreviewItem, OrderStatus } from '../../domain/entities/Order';

const invalidOrder = () => new Error('No se pudo confirmar la información del pedido. Intenta de nuevo con el mismo pedido.');
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const money = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const equalMoney = (a: number, b: number) => Math.abs(a - b) <= Number.EPSILON * Math.max(1, a, b) * 16;
function text(value: unknown, optional = false): string {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || (!optional && !value.trim())) throw invalidOrder();
  return value.trim();
}
function currency(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value)) throw invalidOrder();
  return value.toUpperCase();
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) throw invalidOrder();
  return value.toLowerCase();
}

function mapItem(value: unknown, expectedCurrency: string, assetBaseUrl?: string): OrderPreviewItem {
  if (!isRecord(value) || !integer(value.quantity, 1, 25) || !integer(value.requestedQuantity, 1, 25) ||
    value.quantity > value.requestedQuantity || !money(value.unitPrice) || !money(value.subtotal) ||
    !equalMoney(value.quantity * value.unitPrice, value.subtotal) ||
    !integer(value.reservedQuantity, 0, value.quantity) || !integer(value.backorderQuantity, 0, value.quantity) ||
    typeof value.inventoryTracked !== 'boolean' || typeof value.allowBackorder !== 'boolean' ||
    !['available', 'adjusted', 'backorder', 'manual'].includes(value.fulfillment as string) ||
    (value.stockAvailable !== undefined && value.stockAvailable !== null && !integer(value.stockAvailable)) ||
    currency(value.currency) !== expectedCurrency) throw invalidOrder();
  const image = text(value.image, true);
  return {
    productId: id(value.productId), productName: text(value.productName), productSlug: text(value.productSlug, true),
    image, imageUrl: resolveProductImageUrl(image, assetBaseUrl),
    category: text(value.category, true), presentation: text(value.presentation, true), origin: text(value.origin, true),
    unitPrice: value.unitPrice, currency: expectedCurrency, requestedQuantity: value.requestedQuantity,
    quantity: value.quantity, subtotal: value.subtotal, fulfillment: value.fulfillment as OrderItemFulfillment,
    stockAvailable: value.stockAvailable as number | null | undefined,
    reservedQuantity: value.reservedQuantity, backorderQuantity: value.backorderQuantity,
    inventoryTracked: value.inventoryTracked, allowBackorder: value.allowBackorder,
    message: text(value.message, true) || undefined,
  };
}

function mapIssue(value: unknown): OrderIssue {
  if (!isRecord(value) || !['info', 'warning', 'error'].includes(value.severity as string)) throw invalidOrder();
  return {
    code: text(value.code), severity: value.severity as OrderIssue['severity'],
    productId: value.productId === undefined ? undefined : id(value.productId),
    productName: text(value.productName, true) || undefined,
    title: text(value.title), description: text(value.description),
  };
}

/** Reject a partial or inconsistent summary so only server-confirmed totals can be accepted. */
export function mapOrderPreview(value: unknown, assetBaseUrl?: string): OrderPreview {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > 20 || !Array.isArray(value.issues) ||
    !money(value.subtotal) || !integer(value.totalItems, 0, 500) ||
    typeof value.canCreateDraft !== 'boolean' || typeof value.canConfirmOrder !== 'boolean' ||
    typeof value.needsManualReview !== 'boolean' || typeof value.signature !== 'string' || !/^[a-f0-9]{64}$/.test(value.signature)) throw invalidOrder();
  const code = currency(value.currency);
  const items = value.items.map(item => mapItem(item, code, assetBaseUrl));
  const ids = new Set(items.map(item => item.productId));
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  if (ids.size !== items.length || !money(subtotal) || !equalMoney(subtotal, value.subtotal) ||
    items.reduce((sum, item) => sum + item.quantity, 0) !== value.totalItems ||
    (value.canConfirmOrder && !items.length)) throw invalidOrder();
  return {
    items, issues: value.issues.map(mapIssue), subtotal: value.subtotal, totalItems: value.totalItems,
    currency: code, canCreateDraft: value.canCreateDraft, canConfirmOrder: value.canConfirmOrder,
    needsManualReview: value.needsManualReview, signature: value.signature,
  };
}

export function mapConfirmedOrder(value: unknown, assetBaseUrl?: string): ConfirmedOrder {
  if (!isRecord(value) || !['pending_review', 'confirmed', 'cancelled', 'completed'].includes(value.status as string) ||
    (value.createdAt !== undefined && (typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))))) throw invalidOrder();
  const preview = mapOrderPreview(value, assetBaseUrl);
  if (!preview.items.length || !preview.canConfirmOrder) throw invalidOrder();
  return {
    ...preview, orderId: id(value.orderId), reference: text(value.reference),
    status: value.status as OrderStatus, createdAt: value.createdAt as string | undefined,
  };
}
