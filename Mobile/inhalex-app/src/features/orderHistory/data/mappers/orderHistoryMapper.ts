import { resolveProductImageUrl } from '../../../catalog/data/mappers/catalogMapper';
import type { OrderHistoryAddress, OrderHistoryDetail, OrderHistoryEntry, OrderHistoryItem, OrderHistoryPage, OrderHistoryStatus } from '../../domain/entities/OrderHistory';

const invalidHistory = () => new Error('No pudimos leer la información de tus pedidos. Vuelve a intentarlo.');
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const positiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const money = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const equalMoney = (a: number, b: number) => Math.abs(a - b) <= Number.EPSILON * Math.max(1, a, b) * 16;

export function isOrderHistoryCursor(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,256}$/.test(value);
}

function text(value: unknown, optional = false): string {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || (!optional && !value.trim())) throw invalidHistory();
  return value.trim();
}

function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) throw invalidHistory();
  return value.toLowerCase();
}

function currency(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value)) throw invalidHistory();
  return value.toUpperCase();
}

function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw invalidHistory();
  return value;
}

export function mapOrderHistoryEntry(value: unknown): OrderHistoryEntry {
  if (!isRecord(value) || !['pending_review', 'confirmed', 'cancelled', 'completed'].includes(value.status as string) ||
    !positiveInteger(value.totalItems) || !money(value.subtotal)) throw invalidHistory();
  return {
    id: id(value.id), reference: text(value.reference), status: value.status as OrderHistoryStatus,
    currency: currency(value.currency), totalItems: value.totalItems, subtotal: value.subtotal,
    createdAt: timestamp(value.createdAt),
  };
}

/** A malformed row fails the page, preserving a truthful empty state and pagination. */
export function mapOrderHistoryPage(value: unknown): OrderHistoryPage {
  if (!isRecord(value) || !Array.isArray(value.orders) || value.orders.length > 20 ||
    (value.nextCursor !== null && !isOrderHistoryCursor(value.nextCursor))) throw invalidHistory();
  const orders = value.orders.map(mapOrderHistoryEntry);
  if (new Set(orders.map(order => order.id)).size !== orders.length ||
    (!orders.length && value.nextCursor !== null)) throw invalidHistory();
  for (let index = 1; index < orders.length; index += 1) {
    const previous = orders[index - 1];
    const current = orders[index];
    if (current.createdAt > previous.createdAt ||
      (current.createdAt === previous.createdAt && current.id > previous.id)) throw invalidHistory();
  }
  return { orders, nextCursor: value.nextCursor as string | null };
}

function mapItem(value: unknown, expectedCurrency: string, assetBaseUrl?: string): OrderHistoryItem {
  if (!isRecord(value) || !positiveInteger(value.quantity) || !money(value.unitPrice) || !money(value.subtotal) ||
    !money(value.quantity * value.unitPrice) || !equalMoney(value.quantity * value.unitPrice, value.subtotal) ||
    currency(value.currency) !== expectedCurrency) throw invalidHistory();
  const image = text(value.image, true);
  return {
    productId: id(value.productId), productName: text(value.productName), presentation: text(value.presentation, true),
    image, imageUrl: resolveProductImageUrl(image, assetBaseUrl), quantity: value.quantity,
    unitPrice: value.unitPrice, subtotal: value.subtotal, currency: expectedCurrency,
  };
}

function mapAddress(value: unknown): OrderHistoryAddress | null {
  if (value === null) return null;
  if (!isRecord(value)) throw invalidHistory();
  return {
    label: text(value.label), recipientName: text(value.recipientName), phone: text(value.phone),
    street: text(value.street), exteriorNumber: text(value.exteriorNumber),
    interiorNumber: text(value.interiorNumber, true) || undefined,
    neighborhood: text(value.neighborhood), municipality: text(value.municipality), state: text(value.state),
    postalCode: text(value.postalCode), references: text(value.references, true) || undefined,
  };
}

export function mapOrderHistoryDetail(value: unknown, assetBaseUrl?: string): OrderHistoryDetail {
  const entry = mapOrderHistoryEntry(value);
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.length) throw invalidHistory();
  const items = value.items.map(item => mapItem(item, entry.currency, assetBaseUrl));
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  if (new Set(items.map(item => item.productId)).size !== items.length || !positiveInteger(totalItems) ||
    totalItems !== entry.totalItems || !money(subtotal) || !equalMoney(subtotal, entry.subtotal)) throw invalidHistory();
  return { ...entry, items, shippingAddress: mapAddress(value.shippingAddress) };
}
