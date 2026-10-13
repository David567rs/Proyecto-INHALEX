import { ApiError } from '@/core/network/ApiError';
import type {
  OrderHistoryDetail,
  OrderHistoryEntry,
  OrderHistoryPage,
} from '../../domain/entities/OrderHistory';
import type { OrderHistoryRepository } from '../../domain/repositories/OrderHistoryRepository';

export type OrderHistoryStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
export type OrderHistoryDetailStatus = 'idle' | 'loading' | 'ready' | 'not-found' | 'error';

export interface OrderHistoryViewModel {
  orders: OrderHistoryEntry[];
  status: OrderHistoryStatus;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  errorMessage: string | null;
  loadMoreError: string | null;
  selectedId: string | null;
  detail: OrderHistoryDetail | null;
  detailStatus: OrderHistoryDetailStatus;
  detailError: string | null;
  refresh(): Promise<void>;
  loadMore(): Promise<void>;
  loadDetail(id: string): Promise<void>;
  closeDetail(): void;
}

type HistoryState = Omit<OrderHistoryViewModel, 'refresh' | 'loadMore' | 'loadDetail' | 'closeDetail'>;

const SESSION_MESSAGE = 'Tu sesión venció. Inicia sesión de nuevo.';
const LOAD_MESSAGE = 'No pudimos cargar tus pedidos. Revisa tu conexión e intenta de nuevo.';
const REFRESH_MESSAGE = 'No pudimos actualizar tus pedidos. Mostramos la última información disponible.';
const MORE_MESSAGE = 'No pudimos cargar más pedidos. Revisa tu conexión e intenta de nuevo.';
const PAGINATION_MESSAGE = 'No pudimos continuar el historial. Actualiza la lista para intentar de nuevo.';
const DETAIL_MESSAGE = 'No pudimos cargar este pedido. Revisa tu conexión e intenta de nuevo.';
const MISSING_MESSAGE = 'No encontramos este pedido en tu cuenta.';

const initialState = (): HistoryState => ({
  orders: [], status: 'idle', refreshing: false, loadingMore: false, hasMore: false,
  errorMessage: null, loadMoreError: null, selectedId: null,
  detail: null, detailStatus: 'idle', detailError: null,
});

/** One authenticated account; list and selected detail have independent read generations. */
export class OrderHistoryController {
  private active = false;
  private generation = 0;
  private listRequest = 0;
  private detailRequest = 0;
  private hasLoaded = false;
  private nextCursor: string | null = null;
  private consumedCursors = new Set<string>();
  private listPromise: Promise<void> | null = null;
  private detailPromise: Promise<void> | null = null;
  private readonly listeners = new Set<() => void>();
  private state = initialState();
  private snapshot: OrderHistoryViewModel;

  constructor(private readonly repository: OrderHistoryRepository) {
    this.snapshot = this.makeSnapshot();
  }

  getSnapshot = (): OrderHistoryViewModel => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  start = (): Promise<void> => {
    if (this.active) return this.listPromise ?? Promise.resolve();
    this.active = true;
    this.generation += 1;
    return this.refresh();
  };

  stop = (): void => {
    this.active = false;
    this.generation += 1;
    this.listRequest += 1;
    this.detailRequest += 1;
    this.hasLoaded = false;
    this.nextCursor = null;
    this.consumedCursors.clear();
    this.listPromise = null;
    this.detailPromise = null;
    this.update(initialState());
  };

  refresh = (): Promise<void> => {
    if (!this.active) return Promise.resolve();
    if ((this.state.refreshing || this.state.status === 'loading') && this.listPromise) return this.listPromise;
    const generation = this.generation;
    const request = ++this.listRequest;
    const isCurrent = () => this.active && this.generation === generation && this.listRequest === request;
    this.update({
      status: this.hasLoaded ? this.listStatus() : 'loading',
      refreshing: this.hasLoaded, loadingMore: false, errorMessage: null, loadMoreError: null,
    });
    const task = this.readFirstPage(isCurrent);
    this.listPromise = task;
    return task;
  };

  loadMore = (): Promise<void> => {
    if (!this.active || !this.hasLoaded || this.state.refreshing || !this.nextCursor) return Promise.resolve();
    if (this.state.loadingMore) return this.listPromise ?? Promise.resolve();
    const cursor = this.nextCursor;
    const generation = this.generation;
    const request = ++this.listRequest;
    const isCurrent = () => this.active && this.generation === generation && this.listRequest === request;
    this.update({ loadingMore: true, loadMoreError: null });
    const task = this.readNextPage(cursor, isCurrent);
    this.listPromise = task;
    return task;
  };

  loadDetail = (id: string): Promise<void> => {
    if (!this.active) return Promise.resolve();
    if (this.state.selectedId === id && this.state.detailStatus === 'loading' && this.detailPromise) return this.detailPromise;
    const generation = this.generation;
    const request = ++this.detailRequest;
    const isCurrent = () => this.active && this.generation === generation && this.detailRequest === request;
    // Never show another order's data while the newly selected order is loading.
    this.update({ selectedId: id, detail: null, detailStatus: 'loading', detailError: null });
    const task = this.readDetail(id, isCurrent);
    this.detailPromise = task;
    return task;
  };

  closeDetail = (): void => {
    if (!this.active) return;
    this.detailRequest += 1;
    this.detailPromise = null;
    this.update({ selectedId: null, detail: null, detailStatus: 'idle', detailError: null });
  };

  private async readFirstPage(isCurrent: () => boolean): Promise<void> {
    try {
      const page = await this.repository.list(undefined, isCurrent);
      if (!isCurrent()) return;
      this.consumedCursors.clear();
      this.hasLoaded = true;
      const orders = this.mergeOrders([], page.orders);
      this.applyCursor(page);
      this.update({ orders, status: this.listStatus(orders), errorMessage: null });
    } catch (error) {
      if (!isCurrent()) return;
      if (this.isUnauthorized(error)) this.expireSession();
      else this.update({
        status: this.hasLoaded ? this.listStatus() : 'error',
        errorMessage: this.hasLoaded ? REFRESH_MESSAGE : LOAD_MESSAGE,
      });
    } finally {
      if (isCurrent()) {
        this.listPromise = null;
        this.update({ refreshing: false, loadingMore: false });
      }
    }
  }

  private async readNextPage(cursor: string, isCurrent: () => boolean): Promise<void> {
    try {
      const page = await this.repository.list(cursor, isCurrent);
      if (!isCurrent()) return;
      this.consumedCursors.add(cursor);
      const orders = this.mergeOrders(this.state.orders, page.orders);
      this.applyCursor(page);
      this.update({ orders, status: this.listStatus(orders) });
    } catch (error) {
      if (!isCurrent()) return;
      if (this.isUnauthorized(error)) this.expireSession();
      else this.update({ loadMoreError: MORE_MESSAGE });
    } finally {
      if (isCurrent()) {
        this.listPromise = null;
        this.update({ loadingMore: false });
      }
    }
  }

  private async readDetail(id: string, isCurrent: () => boolean): Promise<void> {
    try {
      const detail = await this.repository.getById(id, isCurrent);
      if (!isCurrent()) return;
      if (detail.id !== id) throw new Error('Unexpected order in detail response');
      this.update({ detail, detailStatus: 'ready', detailError: null });
    } catch (error) {
      if (!isCurrent()) return;
      if (this.isUnauthorized(error)) this.expireSession();
      else {
        const notFound = error instanceof ApiError && error.status === 404;
        this.update({ detail: null, detailStatus: notFound ? 'not-found' : 'error', detailError: notFound ? MISSING_MESSAGE : DETAIL_MESSAGE });
      }
    } finally {
      if (isCurrent()) this.detailPromise = null;
    }
  }

  private applyCursor(page: OrderHistoryPage): void {
    const invalidContinuation = page.nextCursor !== null
      && (this.consumedCursors.has(page.nextCursor) || page.orders.length === 0);
    this.nextCursor = invalidContinuation ? null : page.nextCursor;
    this.update({ hasMore: this.nextCursor !== null, loadMoreError: invalidContinuation ? PAGINATION_MESSAGE : null });
  }

  private mergeOrders(previous: OrderHistoryEntry[], incoming: OrderHistoryEntry[]): OrderHistoryEntry[] {
    // Overlap at a page boundary must not replace an already displayed entry with older data.
    const unique = new Map<string, OrderHistoryEntry>();
    for (const order of [...previous, ...incoming]) if (!unique.has(order.id)) unique.set(order.id, order);
    return Array.from(unique.values()).sort((left, right) => {
      const timeDifference = Date.parse(right.createdAt) - Date.parse(left.createdAt);
      return timeDifference || right.id.localeCompare(left.id);
    });
  }

  private expireSession(): void {
    // Invalidate concurrent list/detail requests before clearing this account's cached data.
    this.listRequest += 1;
    this.detailRequest += 1;
    this.listPromise = null;
    this.detailPromise = null;
    this.hasLoaded = false;
    this.nextCursor = null;
    this.consumedCursors.clear();
    this.update({ ...initialState(), status: 'error', errorMessage: SESSION_MESSAGE,
      detailStatus: 'error', detailError: SESSION_MESSAGE });
  }

  private isUnauthorized(error: unknown): boolean {
    return error instanceof ApiError && error.isUnauthorized;
  }

  private listStatus(orders = this.state.orders): 'ready' | 'empty' {
    return orders.length ? 'ready' : 'empty';
  }

  private makeSnapshot(): OrderHistoryViewModel {
    return {
      ...this.state, refresh: this.refresh, loadMore: this.loadMore,
      loadDetail: this.loadDetail, closeDetail: this.closeDetail,
    };
  }

  private update(changes: Partial<HistoryState>): void {
    this.state = { ...this.state, ...changes };
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach(listener => listener());
  }
}
