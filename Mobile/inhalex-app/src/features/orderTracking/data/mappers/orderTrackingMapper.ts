import { mapOrderHistoryEntry } from '../../../orderHistory/data/mappers/orderHistoryMapper';
import type { OrderTracking } from '../../domain/entities/OrderTracking';

const invalidTracking = () => new Error('No pudimos leer el seguimiento de este pedido. Vuelve a intentarlo.');

function eventDate(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw invalidTracking();
  return value;
}

export function mapOrderTracking(value: unknown): OrderTracking {
  try {
    const entry = mapOrderHistoryEntry(value);
    const events = value as Record<string, unknown>;
    return {
      ...entry,
      confirmedAt: eventDate(events.confirmedAt),
      cancelledAt: eventDate(events.cancelledAt),
      completedAt: eventDate(events.completedAt),
    };
  } catch {
    throw invalidTracking();
  }
}
