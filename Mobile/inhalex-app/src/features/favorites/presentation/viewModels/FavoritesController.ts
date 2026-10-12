import { ApiError } from '@/core/network/ApiError';
import type { CatalogProduct } from '@/features/catalog/domain/entities/CatalogProduct';
import type { FavoritesRepository } from '../../domain/repositories/FavoritesRepository';

export type FavoritesStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface FavoritesViewModel {
  products: CatalogProduct[];
  status: FavoritesStatus;
  refreshing: boolean;
  pendingIds: readonly string[];
  errorMessage: string | null;
  actionError: { productId: string; message: string } | null;
  feedback: { id: number; message: string } | null;
  refresh(): Promise<void>;
  retry(): Promise<void>;
  toggle(product: CatalogProduct): Promise<void>;
  remove(product: CatalogProduct): Promise<void>;
  clearActionError(): void;
  clearFeedback(): void;
}

type FavoritesState = Pick<FavoritesViewModel,
  'products' | 'status' | 'refreshing' | 'pendingIds' | 'errorMessage' | 'actionError' | 'feedback'
>;

/** Server-confirmed favorites shared by all screens for one authenticated session. */
export class FavoritesController {
  private active = false;
  private generation = 0;
  private listRequest = 0;
  private membershipLoaded = false;
  private feedbackId = 0;
  private startPromise: Promise<void> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<() => void>();
  private state: FavoritesState = {
    products: [], status: 'loading', refreshing: false, pendingIds: [],
    errorMessage: null, actionError: null, feedback: null,
  };
  private snapshot: FavoritesViewModel;

  constructor(private readonly repository: FavoritesRepository) {
    this.snapshot = this.makeSnapshot();
  }

  getSnapshot = (): FavoritesViewModel => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  start = (): Promise<void> => {
    if (this.active) return this.startPromise ?? Promise.resolve();
    this.active = true;
    this.generation += 1;
    // Remounts revalidate before accepting toggles: an old in-flight write may have succeeded.
    this.membershipLoaded = false;
    this.update({
      status: 'loading', pendingIds: [], refreshing: false,
      errorMessage: null, actionError: null, feedback: null,
    });
    this.startPromise = this.reload(false);
    return this.startPromise;
  };

  stop = (): void => {
    this.active = false;
    this.generation += 1;
    this.listRequest += 1;
    this.startPromise = null;
    this.membershipLoaded = false;
    // Keep the queue: a later start must read after any already-sent write settles.
  };

  refresh = (): Promise<void> => this.reload(true);

  retry = (): Promise<void> => this.reload(false);

  toggle = (product: CatalogProduct): Promise<void> => {
    return this.change(product, !this.state.products.some(item => item.id === product.id));
  };

  remove = (product: CatalogProduct): Promise<void> => {
    if (!this.state.products.some(item => item.id === product.id)) return Promise.resolve();
    return this.change(product, false);
  };

  clearActionError = (): void => {
    if (this.active && this.state.actionError) this.update({ actionError: null });
  };

  clearFeedback = (): void => {
    if (this.active && this.state.feedback) this.update({ feedback: null });
  };

  private isCurrent(generation: number): boolean {
    return this.active && generation === this.generation;
  }

  private enqueue(generation: number, operation: () => Promise<void>): Promise<void> {
    // FIFO reads and writes prevent a slow GET from undoing a confirmed mutation.
    // Reservations happen immediately, so repeated taps cannot enqueue the same product.
    const task = this.queue.then(async () => {
      if (this.isCurrent(generation)) await operation();
    });
    this.queue = task.catch(() => undefined);
    return task;
  }

  private reload(refreshing: boolean): Promise<void> {
    if (!this.active) return Promise.resolve();
    const generation = this.generation;
    const request = ++this.listRequest;
    this.update({
      status: this.membershipLoaded ? this.productStatus() : 'loading',
      refreshing, errorMessage: null,
    });
    return this.enqueue(generation, async () => {
      // Coalesce reads that have not started yet; only the latest refresh is relevant.
      if (request !== this.listRequest) return;
      try {
        const products = await this.repository.list({ isCurrent: () => this.isCurrent(generation) });
        if (!this.isCurrent(generation) || request !== this.listRequest) return;
        this.membershipLoaded = true;
        this.update({ products, status: products.length ? 'ready' : 'empty', errorMessage: null });
      } catch (error) {
        if (!this.isCurrent(generation) || request !== this.listRequest) return;
        this.update({
          status: this.membershipLoaded ? this.productStatus() : 'error',
          errorMessage: this.displayError(error, 'No pudimos cargar tus favoritos. Intenta de nuevo.'),
        });
      } finally {
        if (this.isCurrent(generation) && request === this.listRequest) this.update({ refreshing: false });
      }
    });
  }

  private change(product: CatalogProduct, adding: boolean): Promise<void> {
    if (!this.active || !this.membershipLoaded || !product.id || this.state.pendingIds.includes(product.id)) {
      return Promise.resolve();
    }
    const generation = this.generation;
    this.update({
      pendingIds: [...this.state.pendingIds, product.id], feedback: null,
      ...(this.state.actionError?.productId === product.id ? { actionError: null } : {}),
    });
    return this.enqueue(generation, async () => {
      try {
        const operation = { isCurrent: () => this.isCurrent(generation) };
        if (adding) await this.repository.add(product.id, operation);
        else await this.repository.remove(product.id, operation);
        if (!this.isCurrent(generation)) return;
        let products = this.state.products;
        if (adding && !products.some(item => item.id === product.id)) products = [...products, product];
        if (!adding) products = products.filter(item => item.id !== product.id);
        this.update({
          products, status: products.length ? 'ready' : 'empty',
          feedback: { id: ++this.feedbackId, message: adding ? 'Guardado en favoritos' : 'Eliminado de favoritos' },
        });
      } catch (error) {
        if (!this.isCurrent(generation)) return;
        this.update({
          actionError: {
            productId: product.id,
            message: this.displayError(error, adding
              ? 'No pudimos guardar este aroma. Intenta de nuevo.'
              : 'No pudimos quitar este aroma. Intenta de nuevo.'),
          },
        });
      } finally {
        if (this.isCurrent(generation)) {
          this.update({ pendingIds: this.state.pendingIds.filter(id => id !== product.id) });
        }
      }
    });
  }

  private displayError(error: unknown, fallback: string): string {
    if (error instanceof ApiError && error.status === 401) return 'Tu sesión venció. Inicia sesión de nuevo.';
    return fallback;
  }

  private productStatus(): 'ready' | 'empty' {
    return this.state.products.length ? 'ready' : 'empty';
  }

  private makeSnapshot(): FavoritesViewModel {
    return {
      ...this.state, refresh: this.refresh, retry: this.retry, toggle: this.toggle,
      remove: this.remove, clearActionError: this.clearActionError, clearFeedback: this.clearFeedback,
    };
  }

  private update(changes: Partial<FavoritesState>): void {
    this.state = { ...this.state, ...changes };
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach(listener => listener());
  }
}
