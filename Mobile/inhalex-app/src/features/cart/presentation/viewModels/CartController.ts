import { ApiError } from '@/core/network/ApiError';
import type { CatalogProduct } from '@/features/catalog/domain/entities/CatalogProduct';
import { createEmptyCart, getCartQuantityLimit, MAX_CART_QUANTITY, type Cart } from '../../domain/entities/Cart';
import type { CartRepository } from '../../domain/repositories/CartRepository';

export type CartStatus = 'loading' | 'ready' | 'empty' | 'error';
export type CheckoutCartItem = Readonly<{ productId: string; quantity: number }>;
export type CartCleanupResult = 'cleared' | 'changed' | 'failed' | 'inactive';

export interface CartViewModel {
  cart: Cart;
  status: CartStatus;
  refreshing: boolean;
  pendingIds: readonly string[];
  canMutate: boolean;
  checkoutLocked: boolean;
  errorMessage: string | null;
  actionError: { productId: string; message: string } | null;
  feedback: { id: number; message: string } | null;
  refresh(): Promise<void>;
  retry(): Promise<void>;
  add(product: CatalogProduct, quantity?: number): Promise<void>;
  setQuantity(productId: string, quantity: number): Promise<void>;
  remove(productId: string): Promise<void>;
  beginCheckout(expectedItems: readonly CheckoutCartItem[]): Promise<Cart | null>;
  resumeCheckout(expectedItems: readonly CheckoutCartItem[]): boolean;
  clearAfterOrder(expectedItems: readonly CheckoutCartItem[]): Promise<CartCleanupResult>;
  endCheckout(): void;
  clearActionError(): void;
  clearFeedback(): void;
}

type CartState = Pick<CartViewModel,
  'cart' | 'status' | 'refreshing' | 'pendingIds' | 'canMutate' | 'checkoutLocked' | 'errorMessage' | 'actionError' | 'feedback'
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
  private checkoutItems: CheckoutCartItem[] | null = null;
  private clearingOrder = false;
  private readonly listeners = new Set<() => void>();
  private state: CartState = {
    cart: createEmptyCart(), status: 'loading', refreshing: false, pendingIds: [],
    canMutate: false, checkoutLocked: false, errorMessage: null, actionError: null, feedback: null,
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
    this.checkoutItems = null;
    this.clearingOrder = false;
    this.update({
      status: 'loading', pendingIds: [], canMutate: false, refreshing: false,
      checkoutLocked: false,
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

  /** Lock before the asynchronous read so new local additions cannot join this order. */
  beginCheckout = async (expectedItems: readonly CheckoutCartItem[]): Promise<Cart | null> => {
    if (!this.active || !this.hasLoaded || !this.state.canMutate || this.state.checkoutLocked || !this.validCheckoutItems(expectedItems)) return null;
    const generation = this.generation;
    const captured = expectedItems.map(({ productId, quantity }) => ({ productId, quantity }));
    this.checkoutItems = captured;
    this.update({ checkoutLocked: true, actionError: null, feedback: null });
    let result: Cart | null = null;
    await this.enqueue(generation, async () => {
      try {
        if (!this.ownsCheckout(generation, captured)) return;
        const cart = await this.repository.list({ isCurrent: () => this.ownsCheckout(generation, captured) });
        if (!this.ownsCheckout(generation, captured)) return;
        this.update({ cart, status: this.cartStatus(cart), canMutate: true, errorMessage: null, actionError: null });
        if (!this.matchesItems(cart.items, captured)) {
          this.update({ errorMessage: 'Tu bolsa cambió. Revisa los productos antes de crear el pedido.' });
          return;
        }
        result = cart;
      } catch (error) {
        if (this.ownsCheckout(generation, captured)) this.update({
          ...(this.isUnauthorized(error) ? { canMutate: false } : {}),
          errorMessage: this.displayError(error, 'No pudimos verificar tu bolsa. Actualiza e intenta de nuevo.'),
        });
      } finally {
        if (this.ownsCheckout(generation, captured) && !result) this.endCheckout();
      }
    });
    return result;
  };

  /** Restore a previously sent order intent without replacing its purchased snapshot. */
  resumeCheckout = (expectedItems: readonly CheckoutCartItem[]): boolean => {
    if (!this.active || !this.validCheckoutItems(expectedItems)) return false;
    if (this.state.checkoutLocked) return !!this.checkoutItems && this.matchesItems(this.checkoutItems, expectedItems);
    this.checkoutItems = expectedItems.map(({ productId, quantity }) => ({ productId, quantity }));
    this.update({ checkoutLocked: true, actionError: null, feedback: null });
    return true;
  };

  /** Call only after a confirmed order. A changed remote bag is retained for review. */
  clearAfterOrder = async (expectedItems: readonly CheckoutCartItem[]): Promise<CartCleanupResult> => {
    if (!this.active || !this.state.checkoutLocked || !this.checkoutItems) return 'inactive';
    if (this.clearingOrder) return 'failed';
    if (!this.matchesItems(this.checkoutItems, expectedItems)) return 'changed';
    const generation = this.generation;
    const captured = this.checkoutItems;
    this.clearingOrder = true;
    let result: CartCleanupResult = 'inactive';
    await this.enqueue(generation, async () => {
      const operation = { isCurrent: () => this.isCurrent(generation) };
      try {
        // Always reconcile before DELETE, including a retry after a lost DELETE response.
        // The current API has no conditional clear; a simultaneous write from another
        // device between this GET and DELETE still requires a backend revision contract.
        const current = await this.repository.list(operation);
        if (!this.isCurrent(generation)) return;
        this.update({ cart: current, status: this.cartStatus(current), canMutate: true, errorMessage: null, actionError: null });
        if (!current.items.length) {
          result = 'cleared';
          return;
        }
        if (!this.matchesItems(current.items, captured)) {
          result = 'changed';
          return;
        }
        const empty = await this.repository.clear(operation);
        if (!this.isCurrent(generation)) return;
        this.update({ cart: empty, status: this.cartStatus(empty), canMutate: true, errorMessage: null, actionError: null });
        result = 'cleared';
      } catch (error) {
        if (!this.isCurrent(generation)) return;
        this.update({ canMutate: false, errorMessage: this.displayError(error, 'Tu pedido ya está creado. No pudimos actualizar la bolsa; vuelve a consultarla.') });
        result = 'failed';
      } finally {
        if (this.isCurrent(generation)) this.clearingOrder = false;
      }
    });
    return result;
  };

  endCheckout = (): void => {
    if (!this.active || !this.state.checkoutLocked || this.clearingOrder) return;
    this.checkoutItems = null;
    this.update({ checkoutLocked: false });
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
    if (!this.active || !this.state.canMutate || this.state.checkoutLocked || !productId || this.state.pendingIds.includes(productId)) return Promise.resolve();
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

  private validCheckoutItems(items: readonly CheckoutCartItem[]): boolean {
    return items.length > 0 && new Set(items.map(item => item.productId)).size === items.length
      && items.every(item => typeof item.productId === 'string' && !!item.productId.trim() && item.productId === item.productId.trim()
        && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= MAX_CART_QUANTITY);
  }

  private ownsCheckout(generation: number, captured: CheckoutCartItem[]): boolean {
    return this.isCurrent(generation) && this.state.checkoutLocked && this.checkoutItems === captured;
  }

  private matchesItems(left: readonly CheckoutCartItem[], right: readonly CheckoutCartItem[]): boolean {
    return left.length === right.length && left.every(item => right.some(other => other.productId === item.productId && other.quantity === item.quantity));
  }

  private displayError(error: unknown, fallback: string): string {
    return this.isUnauthorized(error) ? SESSION_MESSAGE : fallback;
  }

  private cartStatus(cart = this.state.cart): 'ready' | 'empty' {
    return cart.items.length ? 'ready' : 'empty';
  }

  private makeSnapshot(): CartViewModel {
    return {
      ...this.state, canMutate: this.state.canMutate && !this.state.checkoutLocked,
      refresh: this.refresh, retry: this.retry, add: this.add, setQuantity: this.setQuantity,
      remove: this.remove, clearActionError: this.clearActionError, clearFeedback: this.clearFeedback,
      beginCheckout: this.beginCheckout, resumeCheckout: this.resumeCheckout, clearAfterOrder: this.clearAfterOrder, endCheckout: this.endCheckout,
    };
  }

  private update(changes: Partial<CartState>): void {
    this.state = { ...this.state, ...changes };
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach(listener => listener());
  }
}
