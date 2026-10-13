import { ApiError } from '@/core/network/ApiError';
import type { OrderTracking } from '../../domain/entities/OrderTracking';
import type { OrderTrackingRepository } from '../../domain/repositories/OrderTrackingRepository';

export type OrderTrackingLoadStatus = 'idle' | 'loading' | 'ready' | 'not-found' | 'error';

export interface OrderTrackingViewModel {
  order: OrderTracking | null;
  status: OrderTrackingLoadStatus;
  refreshing: boolean;
  errorMessage: string | null;
  /** Time of the last successful read, not a server status-change date. */
  updatedAt: string | null;
  load(id: string): Promise<void>;
  refresh(): Promise<void>;
  close(): void;
}

type TrackingState = Omit<OrderTrackingViewModel, 'load' | 'refresh' | 'close'>;
type TrackingRead = { id: string; promise: Promise<void>; resolve(): void };

const initialState = (): TrackingState => ({
  order: null, status: 'idle', refreshing: false, errorMessage: null, updatedAt: null,
});

const LOAD_MESSAGE = 'No pudimos cargar el seguimiento. Revisa tu conexión e intenta de nuevo.';
const REFRESH_MESSAGE = 'No pudimos actualizar el seguimiento. Mostramos la última información disponible.';
const SESSION_MESSAGE = 'Tu sesión venció. Inicia sesión de nuevo.';
const MISSING_MESSAGE = 'No encontramos este pedido en tu cuenta.';

/** Read-only state for one account and one visible order. */
export class OrderTrackingController {
  private active = false;
  private selectedId: string | null = null;
  private pending: TrackingRead | null = null;
  private readonly listeners = new Set<() => void>();
  private state = initialState();
  private snapshot: OrderTrackingViewModel;

  constructor(
    private readonly repository: OrderTrackingRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {
    this.snapshot = this.makeSnapshot();
  }

  getSnapshot = (): OrderTrackingViewModel => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  start = (): Promise<void> => {
    if (this.active) return this.pending?.promise ?? Promise.resolve();
    this.active = true;
    // A focused child can request an order before the provider's passive effect starts.
    const pending = this.pending;
    if (pending) void this.read(pending);
    return pending?.promise ?? Promise.resolve();
  };

  stop = (): void => {
    this.active = false;
    this.close();
  };

  load = (id: string): Promise<void> => {
    const normalizedId = id.toLowerCase();
    if (this.pending?.id === normalizedId) return this.pending.promise;
    this.cancelPending();
    const retained = this.selectedId === normalizedId && this.state.order?.id === normalizedId;
    this.selectedId = normalizedId;
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    const pending: TrackingRead = { id: normalizedId, promise, resolve };
    this.pending = pending;
    this.update({
      order: retained ? this.state.order : null,
      status: retained ? 'ready' : 'loading',
      refreshing: retained, errorMessage: null,
      updatedAt: retained ? this.state.updatedAt : null,
    });
    if (this.active) void this.read(pending);
    return promise;
  };

  refresh = (): Promise<void> => this.selectedId === null ? Promise.resolve() : this.load(this.selectedId);

  close = (): void => {
    this.cancelPending();
    this.selectedId = null;
    this.update(initialState());
  };

  private async read(request: TrackingRead): Promise<void> {
    const isCurrent = () => this.active && this.pending === request && this.selectedId === request.id;
    try {
      const order = await this.repository.getById(request.id, isCurrent);
      if (!isCurrent()) return;
      if (order.id !== request.id) throw new Error('Unexpected order in tracking response');
      this.update({ order, status: 'ready', errorMessage: null, updatedAt: this.now() });
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof ApiError && (error.isUnauthorized || error.status === 404)) {
        this.update({
          order: null, updatedAt: null,
          status: error.status === 404 ? 'not-found' : 'error',
          errorMessage: error.status === 404 ? MISSING_MESSAGE : SESSION_MESSAGE,
        });
      } else {
        const retained = this.state.order?.id === request.id;
        this.update({ status: retained ? 'ready' : 'error', errorMessage: retained ? REFRESH_MESSAGE : LOAD_MESSAGE });
      }
    } finally {
      if (isCurrent()) {
        this.pending = null;
        this.update({ refreshing: false });
      }
      request.resolve();
    }
  }

  private cancelPending(): void {
    const pending = this.pending;
    this.pending = null;
    pending?.resolve();
  }

  private makeSnapshot(): OrderTrackingViewModel {
    return { ...this.state, load: this.load, refresh: this.refresh, close: this.close };
  }

  private update(changes: Partial<TrackingState>): void {
    this.state = { ...this.state, ...changes };
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach(listener => listener());
  }
}
