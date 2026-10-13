import type { OrderHistoryEntry } from '../../../orderHistory/domain/entities/OrderHistory';

/** Dates are recorded server events; null means no timestamp is available. */
export interface OrderTracking extends OrderHistoryEntry {
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
}
