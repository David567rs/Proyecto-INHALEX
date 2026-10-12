import { ApiError } from '@/core/network/ApiError';
import type { CatalogProduct } from '@/features/catalog/domain/entities/CatalogProduct';
import { createEmptyCart, getCartQuantityLimit, MAX_CART_QUANTITY, type Cart } from '../../domain/entities/Cart';
import type { CartRepository } from '../../domain/repositories/CartRepository';

export type CartStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface CartViewModel {
  cart: Cart;
  status: CartStatus;
  refreshing: boolean;
  pendingIds: readonly string[];
  canMutate: boolean;
  errorMessage: string | null;
  actionError: { productId: string; message: string } | null;
  feedback: { id: number; message: string } | null;
  refresh(): Promise<void>;
  retry(): Promise<void>;
  add(product: CatalogProduct, quantity?: number): Promise<void>;
  setQuantity(productId: string, quantity: number): Promise<void>;
  remove(productId: string): Promise<void>;
  clearActionError(): void;
  clearFeedback(): void;
}

type CartState = Pick<CartViewModel,
  'cart' | 'status' | 'refreshing' | 'pendingIds' | 'canMutate' | 'errorMessage' | 'actionError' | 'feedback'
>;
type CartChange = { kind: 'add'; product: CatalogProduct; quantity: number }
  | { kind: 'quantity'; quantity: number } | { kind: 'remove' };

const RECONCILE_MESSAGE = 'No pudimos confirmar el cambio. Actualiza la bolsa antes de intentar de nuevo.';
const SESSION_MESSAGE = 'Tu sesión venció. Inicia sesión de nuevo.';

/** One authenticated session, with server-confirmed totals and serialized cart writes. */
export class CartController {
  private active = false;
  private generation = 0;
  private listRequest = 0;
  private hasLoaded = false;
  private feedbackId = 0;
  private startPromise: Promise<void> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<() => void>();
  private state: CartState = {
    cart: createEmptyCart(), status: 'loading', refreshing: false, pendingIds: [],
    canMutate: false, errorMessage: null, actionError: null, feedback: null,
  };
  private snapshot: CartViewModel;

  constructor(private readonly repository: CartRepository) {
    this.snapshot = this.makeSnapshot();
  }

  getSnapshot = (): CartViewModel => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  start = (): Promise<void> => {
    if (this.active) return this.startPromise ?? Promise.resolve();
    this.active = true;
    this.generation += 1;
    this.hasLoaded = false;
    this.update({
      status: 'loading', pendingIds: [], canMutate: false, refreshing: false,
      errorMessage: null, actionError: null, feedback: null,
    });
    this.startPromise = this.reload(false);
    return this.startPromise;
  };

  stop = (): void => {
    this.active = false;
    this.generation += 1;
    this.listRequest += 1;
    this.hasLoaded = false;
    this.startPromise = null;
    // Preserve the queue so remounts read after a previously sent write settles.
  };

  refresh = (): Promise<void> => this.reload(true);
  retry = (): Promise<void> => this.reload(false);

  add = (product: CatalogProduct, quantity = 1): Promise<void> => this.change(product.id, { kind: 'add', product, quantity });

  setQuantity = (productId: string, quantity: number): Promise<void> => this.change(productId, { kind: 'quantity', quantity });

  remove = (productId: string): Promise<void> => this.change(productId, { kind: 'remove' });

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
    this.update({ status: this.hasLoaded ? this.cartStatus() : 'loading', refreshing, errorMessage: null });
    return this.enqueue(generation, async () => {
      try {
        const cart = await this.repository.list({ isCurrent: () => this.isCurrent(generation) });
        if (!this.isCurrent(generation)) return;
        // Reads and writes never overlap. Even an earlier requested read provides the
        // current quantity/stock for a write queued between two refresh requests.
        this.hasLoaded = true;
        this.update({ cart, status: this.cartStatus(cart), canMutate: true, errorMessage: null, actionError: null });
      } catch (error) {
        if (!this.isCurrent(generation)) return;
        this.update({
          status: this.hasLoaded ? this.cartStatus() : 'error',
          ...(this.isUnauthorized(error) ? { canMutate: false } : {}),
          errorMessage: this.displayError(error, 'No pudimos actualizar tu bolsa. Intenta de nuevo.'),
        });
      } finally {
        if (this.isCurrent(generation) && request === this.listRequest) this.update({ refreshing: false });
      }
    });
  }

  private change(productId: string, change: CartChange): Promise<void> {
    if (!this.active || !this.state.canMutate || !productId || this.state.pendingIds.includes(productId)) return Promise.resolve();
    const generation = this.generation;
    this.update({
      pendingIds: [...this.state.pendingIds, productId], feedback: null,
      ...(this.state.actionError?.productId === productId ? { actionError: null } : {}),
    });
    return this.enqueue(generation, async () => {
      try {
        // A previous request may have failed after this intent was queued. An add is
        // incremental, so require a successful GET before sending any further write.
        if (!this.state.canMutate) return;
        const item = this.state.cart.items.find(entry => entry.productId === productId);
        if (change.kind !== 'add' && !item) return;
        if (change.kind === 'quantity' && item?.quantity === change.quantity) return;
        if (change.kind !== 'remove') {
          const product = item?.product ?? (change.kind === 'add' ? change.product : undefined);
          const quantityError = this.validateQuantity(change, item?.quantity ?? 0, product!);
          if (quantityError) {
            this.update({ actionError: { productId, message: quantityError } });
            return;
          }
        }
        const operation = { isCurrent: () => this.isCurrent(generation) };
        const cart = change.kind === 'add'
          ? await this.repository.add(productId, change.quantity, operation)
          : change.kind === 'quantity'
            ? await this.repository.updateQuantity(productId, change.quantity, operation)
            : await this.repository.remove(productId, operation);
        if (!this.isCurrent(generation)) return;
        this.hasLoaded = true;
        this.update({
          cart, status: this.cartStatus(cart), errorMessage: null,
          feedback: {
            id: ++this.feedbackId,
            message: change.kind === 'add' ? 'Agregado a tu bolsa' : change.kind === 'quantity' ? 'Cantidad actualizada' : 'Eliminado de tu bolsa',
          },
        });
      } catch (error) {
        if (!this.isCurrent(generation)) return;
        this.update({ canMutate: false, feedback: null, actionError: { productId, message: this.displayError(error, RECONCILE_MESSAGE) } });
      } finally {
        if (this.isCurrent(generation)) this.update({ pendingIds: this.state.pendingIds.filter(id => id !== productId) });
      }
    });
  }

  private validateQuantity(change: Exclude<CartChange, { kind: 'remove' }>, current: number, product: CatalogProduct): string | null {
    const quantity = change.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) return `Elige una cantidad entera entre 1 y ${MAX_CART_QUANTITY}.`;
    const next = change.kind === 'add' ? current + quantity : quantity;
    // Reductions and removals remain available if inventory falls below the saved amount.
    if (change.kind === 'quantity' && next < current) return null;
    // Product details can be newer than the saved bag, while a preceding queued
    // response can be newer than those details. Honor the stricter known limit.
    const limit = change.kind === 'add'
      ? Math.min(getCartQuantityLimit(product), getCartQuantityLimit(change.product))
      : getCartQuantityLimit(product);
    if (limit === 0) return 'Este aroma no está disponible por ahora.';
    if (next > limit) return limit === MAX_CART_QUANTITY
      ? `Puedes agregar hasta ${MAX_CART_QUANTITY} unidades de este aroma.`
      : `Solo hay ${limit} ${limit === 1 ? 'unidad disponible' : 'unidades disponibles'} de este aroma.`;
    return null;
  }

  private isUnauthorized(error: unknown): boolean {
    return error instanceof ApiError && error.status === 401;
  }

  private displayError(error: unknown, fallback: string): string {
    return this.isUnauthorized(error) ? SESSION_MESSAGE : fallback;
  }

  private cartStatus(cart = this.state.cart): 'ready' | 'empty' {
    return cart.items.length ? 'ready' : 'empty';
  }

  private makeSnapshot(): CartViewModel {
    return {
      ...this.state, refresh: this.refresh, retry: this.retry, add: this.add, setQuantity: this.setQuantity,
      remove: this.remove, clearActionError: this.clearActionError, clearFeedback: this.clearFeedback,
    };
  }

  private update(changes: Partial<CartState>): void {
    this.state = { ...this.state, ...changes };
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach(listener => listener());
  }
}
