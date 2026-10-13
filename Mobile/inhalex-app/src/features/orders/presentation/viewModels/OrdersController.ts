import { ApiError } from '@/core/network/ApiError';
import { validateAddressInput, type ShippingAddress } from '@/features/addresses/domain/entities/ShippingAddress';
import type { Cart } from '@/features/cart/domain/entities/Cart';
import {
  normalizeConfirmOrderInput, normalizeOrderItems, validateOrderContact,
  type ConfirmedOrder, type ConfirmOrderInput, type OrderContact, type OrderContactErrors,
  type OrderItemInput, type OrderPreview,
} from '../../domain/entities/Order';
import type { OrderRepository } from '../../domain/repositories/OrderRepository';

export interface SavedOrderAttempt {
  key: string;
  input: ConfirmOrderInput;
  preview: OrderPreview;
  address: ShippingAddress;
  confirmedOrder?: ConfirmedOrder;
}

export interface OrderAttemptStore {
  load(): Promise<SavedOrderAttempt | null>;
  save(attempt: SavedOrderAttempt): Promise<void>;
  clear(): Promise<void>;
}

export interface CheckoutCartPort {
  beginCheckout(expectedItems: readonly OrderItemInput[]): Promise<Cart | null>;
  resumeCheckout(expectedItems: readonly OrderItemInput[]): boolean;
  endCheckout(): void;
  clearAfterOrder(expectedItems: readonly OrderItemInput[]): Promise<'cleared' | 'changed' | 'failed' | 'inactive'>;
}

export type CheckoutStatus = 'idle' | 'loading' | 'review' | 'confirming' | 'uncertain' | 'success' | 'error';
export type OrderCleanupStatus = 'idle' | 'pending' | 'cleared' | 'changed' | 'failed';

export interface OrdersViewModel {
  status: CheckoutStatus;
  restoring: boolean;
  recoveryBlocked: boolean;
  preview: OrderPreview | null;
  order: ConfirmedOrder | null;
  contact: OrderContact;
  contactErrors: OrderContactErrors;
  address: ShippingAddress | null;
  addressError: string | null;
  errorMessage: string | null;
  cleanupStatus: OrderCleanupStatus;
  canConfirm: boolean;
  canEdit: boolean;
  setContact(field: keyof OrderContact, value: string): void;
  setAddress(address: ShippingAddress | null): void;
  review(items: OrderItemInput[]): Promise<void>;
  confirm(): Promise<boolean>;
  retryConfirmation(): Promise<boolean>;
  retryCleanup(): Promise<void>;
  retryRecovery(): Promise<void>;
  cancelReview(): void;
  reset(): void;
}

type OrderState = Omit<OrdersViewModel,
  'canConfirm' | 'canEdit' | 'setContact' | 'setAddress' | 'review' | 'confirm' | 'retryConfirmation' |
  'retryCleanup' | 'retryRecovery' | 'cancelReview' | 'reset'
>;

interface OrdersControllerOptions {
  contact: OrderContact;
  createKey(): string | Promise<string>;
  store: OrderAttemptStore;
}

const UNCERTAIN = 'Aún no sabemos si se recibió tu pedido. Comprueba el mismo pedido para evitar duplicarlo.';
const SESSION_EXPIRED = 'Tu sesión venció. Inicia sesión de nuevo para continuar con el mismo pedido.';
const STORAGE_ERROR = 'No pudimos guardar la confirmación de forma segura. Revisa el almacenamiento e intenta de nuevo.';
const RECOVERY_ERROR = 'No pudimos recuperar un pedido pendiente. Intenta recuperarlo antes de crear otro.';
const CLEANUP_ERROR = 'Tu pedido ya fue recibido. No pudimos actualizar la bolsa; puedes reintentar sin crear otro pedido.';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** One customer session. A durable intent is written before any order can be sent. */
export class OrdersController {
  private active = false;
  private generation = 0;
  private previewRequest = 0;
  private startPromise: Promise<void> | null = null;
  private barrier: Promise<unknown> = Promise.resolve();
  private items: OrderItemInput[] = [];
  private attempt: SavedOrderAttempt | null = null;
  private readonly listeners = new Set<() => void>();
  private state: OrderState;
  private snapshot: OrdersViewModel;

  constructor(
    private readonly repository: OrderRepository,
    private readonly cart: CheckoutCartPort,
    private readonly options: OrdersControllerOptions,
  ) {
    this.state = {
      status: 'idle', restoring: true, recoveryBlocked: false, preview: null, order: null,
      contact: { ...options.contact }, contactErrors: {}, address: null, addressError: null,
      errorMessage: null, cleanupStatus: 'idle',
    };
    this.snapshot = this.makeSnapshot();
  }

  getSnapshot = (): OrdersViewModel => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  start = (): Promise<void> => {
    if (this.active) return this.startPromise ?? Promise.resolve();
    this.active = true;
    this.generation += 1;
    this.startPromise = this.restore();
    return this.startPromise;
  };

  stop = (): void => {
    this.active = false;
    this.generation += 1;
    this.previewRequest += 1;
    this.startPromise = null;
    // A sent order may still reach the server. Keep its key and wait for its work
    // before a Strict Mode restart reads the durable intent.
  };

  setContact = (field: keyof OrderContact, value: string): void => {
    if (!this.canEdit() || !['customerName', 'customerEmail', 'customerPhone'].includes(field)) return;
    this.update({ contact: { ...this.state.contact, [field]: value }, contactErrors: {}, errorMessage: null });
  };

  setAddress = (address: ShippingAddress | null): void => {
    if (!this.canEdit()) return;
    if (JSON.stringify(this.state.address) === JSON.stringify(address)) return;
    // Address synchronization also runs after preview refresh. Keep its stock-change notice.
    this.update({ address: address ? copy(address) : null, addressError: null });
  };

  review = (items: OrderItemInput[]): Promise<void> => {
    if (!this.active || this.state.restoring || this.state.recoveryBlocked || this.attempt ||
      ['confirming', 'uncertain', 'success'].includes(this.state.status)) return Promise.resolve();
    const request = ++this.previewRequest;
    let normalized: OrderItemInput[];
    try { normalized = normalizeOrderItems(items); }
    catch {
      this.cart.endCheckout();
      this.update({ status: 'error', preview: null, errorMessage: 'Revisa los productos y cantidades de tu bolsa antes de continuar.' });
      return Promise.resolve();
    }
    const generation = this.generation;
    this.items = normalized;
    this.cart.endCheckout();
    this.update({ status: 'loading', preview: null, errorMessage: null, contactErrors: {}, addressError: null });
    const task = this.preparePreview(normalized, generation, request);
    this.barrier = task.catch(() => undefined);
    return task;
  };

  confirm = (): Promise<boolean> => {
    if (!this.active || this.state.restoring || this.state.recoveryBlocked || this.state.status !== 'review' ||
      !this.state.preview?.canConfirmOrder || this.attempt) return Promise.resolve(false);
    const contact = validateOrderContact(this.state.contact);
    const address = this.state.address;
    const validAddress = address && /^[a-fA-F0-9]{24}$/.test(address.id) && validateAddressInput(address).isValid;
    this.update({ contact: contact.value, contactErrors: contact.errors, addressError: validAddress ? null : 'Selecciona una dirección de envío guardada.' });
    if (!contact.isValid || !validAddress || !address) return Promise.resolve(false);
    const generation = this.generation;
    const preview = copy(this.state.preview!);
    const input: ConfirmOrderInput = {
      ...contact.value, items: copy(this.items), shippingAddressId: address.id,
      previewSignature: preview.signature,
    };
    // Set the state before awaiting key creation/storage so repeated taps are inert.
    this.update({ status: 'confirming', errorMessage: null });
    const task = this.prepareConfirmation(input, preview, copy(address), generation);
    this.barrier = task.catch(() => undefined);
    return task;
  };

  retryConfirmation = (): Promise<boolean> => {
    if (!this.active || this.state.restoring || this.state.recoveryBlocked || this.state.status !== 'uncertain' || !this.attempt) return Promise.resolve(false);
    const generation = this.generation;
    if (!this.cart.resumeCheckout(this.attempt.input.items)) {
      this.update({ errorMessage: 'Espera a que tu bolsa termine de actualizarse y comprueba el mismo pedido.' });
      return Promise.resolve(false);
    }
    this.update({ status: 'confirming', errorMessage: null });
    const task = this.sendAttempt(generation, true);
    this.barrier = task.catch(() => undefined);
    return task;
  };

  retryCleanup = (): Promise<void> => {
    if (!this.active || this.state.restoring || this.state.recoveryBlocked || this.state.status !== 'success' || !this.attempt?.confirmedOrder || this.state.cleanupStatus === 'pending') return Promise.resolve();
    const task = this.finishCleanup(this.generation);
    this.barrier = task.catch(() => undefined);
    return task;
  };

  retryRecovery = (): Promise<void> => {
    if (!this.active || this.state.restoring || !this.state.recoveryBlocked) return Promise.resolve();
    return this.restore();
  };

  cancelReview = (): void => {
    if (!this.active || this.state.restoring || this.state.recoveryBlocked || this.attempt || this.state.status === 'confirming' || this.state.status === 'success') return;
    this.previewRequest += 1;
    this.items = [];
    this.cart.endCheckout();
    this.update({ status: 'idle', preview: null, errorMessage: null, contactErrors: {}, addressError: null });
  };

  reset = (): void => {
    if (!this.active || this.state.restoring || this.state.recoveryBlocked || this.attempt || this.state.status === 'confirming') return;
    this.previewRequest += 1;
    this.items = [];
    this.cart.endCheckout();
    this.update({ status: 'idle', preview: null, order: null, cleanupStatus: 'idle', errorMessage: null, contactErrors: {}, addressError: null });
  };

  private async restore(): Promise<void> {
    const generation = this.generation;
    this.update({ restoring: true, recoveryBlocked: false, errorMessage: null });
    await this.barrier;
    if (!this.isCurrent(generation)) return;
    try {
      const loaded = await this.options.store.load();
      if (!this.isCurrent(generation)) return;
      this.attempt = loaded ? this.validateSavedAttempt(loaded) : null;
      if (!this.attempt) {
        this.cart.endCheckout();
        this.items = [];
        this.update({ status: 'idle', preview: null, order: null, cleanupStatus: 'idle', restoring: false });
        return;
      }
      const attempt = this.attempt;
      this.items = copy(attempt.input.items);
      this.cart.resumeCheckout(this.items);
      this.update({
        status: attempt.confirmedOrder ? 'success' : 'uncertain', restoring: false,
        preview: attempt.preview, order: attempt.confirmedOrder ?? null,
        contact: this.contactFrom(attempt.input), contactErrors: {}, address: attempt.address, addressError: null,
        cleanupStatus: attempt.confirmedOrder ? 'failed' : 'idle',
        errorMessage: attempt.confirmedOrder ? CLEANUP_ERROR : UNCERTAIN,
      });
    } catch {
      if (this.isCurrent(generation)) this.update({ restoring: false, recoveryBlocked: true, status: 'error', errorMessage: RECOVERY_ERROR });
    }
  }

  private async preparePreview(items: OrderItemInput[], generation: number, request: number, changed = false): Promise<void> {
    const current = () => this.isCurrent(generation) && request === this.previewRequest;
    try {
      const cart = await this.cart.beginCheckout(items);
      if (!current()) return;
      if (!cart) {
        this.cart.endCheckout();
        this.update({ status: 'error', errorMessage: 'Tu bolsa cambió o no pudo actualizarse. Revísala antes de continuar.' });
        return;
      }
      const preview = await this.repository.preview(copy(items), current);
      if (!current()) return;
      this.assertPreview(preview, items);
      this.update({ status: 'review', preview: copy(preview), errorMessage: changed ? 'La disponibilidad cambió. Revisa el nuevo resumen y confirma de nuevo si estás de acuerdo.' : null });
    } catch (error) {
      if (!current()) return;
      this.cart.endCheckout();
      this.update({ status: 'error', preview: null, errorMessage: this.isUnauthorized(error) ? SESSION_EXPIRED : 'No pudimos preparar el resumen. Revisa tu conexión e intenta de nuevo.' });
    }
  }

  private async prepareConfirmation(input: ConfirmOrderInput, preview: OrderPreview, address: ShippingAddress, generation: number): Promise<boolean> {
    try {
      const key = await this.options.createKey();
      if (!this.isCurrent(generation)) return false;
      if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw new Error('Invalid order key');
      const attempt: SavedOrderAttempt = { key, input: normalizeConfirmOrderInput(input), preview, address };
      await this.options.store.save(copy(attempt));
      if (!this.isCurrent(generation)) return false;
      this.attempt = attempt;
    } catch {
      if (this.isCurrent(generation)) this.update({ status: 'review', errorMessage: STORAGE_ERROR });
      return false;
    }
    return this.sendAttempt(generation, false);
  }

  private async sendAttempt(generation: number, wasUncertain: boolean): Promise<boolean> {
    const attempt = this.attempt;
    if (!attempt) return false;
    try {
      const order = await this.repository.confirm(copy(attempt.input), attempt.key, () => this.isCurrent(generation));
      if (!this.isCurrent(generation)) return false;
      this.assertConfirmedOrder(order, attempt);
      this.attempt = { ...attempt, confirmedOrder: copy(order) };
      this.update({ status: 'success', order: copy(order), errorMessage: null });
      await this.finishCleanup(generation);
      return true;
    } catch (error) {
      if (!this.isCurrent(generation)) return false;
      // Once a response has been lost, a second 400/409 can race the original
      // request. Only replaying the original key can prove that order's outcome.
      if (wasUncertain || !(error instanceof ApiError) || error.status === null || error.status >= 500 || error.status === 408 || error.status === 429) {
        this.update({ status: 'uncertain', errorMessage: this.isUnauthorized(error) ? SESSION_EXPIRED : UNCERTAIN });
        return false;
      }
      try {
        await this.options.store.clear();
        if (!this.isCurrent(generation)) return false;
      } catch {
        if (this.isCurrent(generation)) this.update({ status: 'uncertain', errorMessage: STORAGE_ERROR });
        return false;
      }
      this.attempt = null;
      if (error.status === 409) {
        const request = ++this.previewRequest;
        this.cart.endCheckout();
        this.update({ status: 'loading', preview: null });
        await this.preparePreview(this.items, generation, request, true);
      } else {
        this.cart.endCheckout();
        this.update({ status: 'error', preview: null, errorMessage: this.isUnauthorized(error) ? SESSION_EXPIRED : 'No se pudo confirmar el pedido. Revisa tu bolsa, tus datos y la dirección de envío.' });
      }
      return false;
    }
  }

  private async finishCleanup(generation: number): Promise<void> {
    const attempt = this.attempt;
    if (!attempt?.confirmedOrder || !this.isCurrent(generation)) return;
    this.update({ cleanupStatus: 'pending', errorMessage: null });
    try {
      // Persist success first. A reload must resume cleanup, never submit a new order.
      await this.options.store.save(copy(attempt));
      if (!this.isCurrent(generation)) return;
      if (!this.cart.resumeCheckout(attempt.input.items)) throw new Error('Bag not available');
      // A preview can drop unavailable products or reduce their quantities. Keep
      // that bag intact rather than deleting units that were never ordered.
      const result = this.sameItems(attempt.input.items, attempt.confirmedOrder.items)
        ? await this.cart.clearAfterOrder(attempt.input.items)
        : 'changed';
      if (!this.isCurrent(generation)) return;
      if (result !== 'cleared' && result !== 'changed') throw new Error('Bag cleanup failed');
      await this.options.store.clear();
      if (!this.isCurrent(generation)) return;
      this.attempt = null;
      this.cart.endCheckout();
      this.update({ cleanupStatus: result, errorMessage: result === 'changed' ? 'La bolsa cambió después de confirmar. Conservamos sus productos para que puedas revisarlos.' : null });
    } catch {
      if (this.isCurrent(generation)) this.update({ cleanupStatus: 'failed', errorMessage: CLEANUP_ERROR });
    }
  }

  private validateSavedAttempt(value: SavedOrderAttempt): SavedOrderAttempt {
    if (!value || !/^[a-zA-Z0-9_-]{16,100}$/.test(value.key)) throw new Error('Invalid saved order');
    const input = normalizeConfirmOrderInput(value.input);
    if (!value.address || value.address.id !== input.shippingAddressId || !validateAddressInput(value.address).isValid) throw new Error('Invalid saved address');
    this.assertPreview(value.preview, input.items);
    if (value.preview.signature !== input.previewSignature || !value.preview.canConfirmOrder) throw new Error('Invalid saved summary');
    const attempt = { key: value.key, input, preview: copy(value.preview), address: copy(value.address) };
    if (value.confirmedOrder) this.assertConfirmedOrder(value.confirmedOrder, attempt);
    return { ...attempt, ...(value.confirmedOrder ? { confirmedOrder: copy(value.confirmedOrder) } : {}) };
  }

  private assertPreview(preview: OrderPreview, items: OrderItemInput[]): void {
    if (!preview || !Array.isArray(preview.items) || !Array.isArray(preview.issues) ||
      !/^[a-f0-9]{64}$/.test(preview.signature) || !/^[A-Z]{3}$/.test(preview.currency) ||
      typeof preview.canConfirmOrder !== 'boolean' || typeof preview.canCreateDraft !== 'boolean' || typeof preview.needsManualReview !== 'boolean' ||
      !Number.isFinite(preview.subtotal) || preview.subtotal < 0 || !Number.isSafeInteger(preview.totalItems) || preview.totalItems < 0 ||
      (preview.canConfirmOrder && !preview.items.length)) throw new Error('Invalid summary');
    const requested = new Map(items.map(item => [item.productId, item.quantity]));
    const seen = new Set<string>();
    for (const item of preview.items) {
      if (!item || seen.has(item.productId) || requested.get(item.productId) !== item.requestedQuantity ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > item.requestedQuantity ||
        !Number.isFinite(item.unitPrice) || item.unitPrice < 0 || !Number.isFinite(item.subtotal) || item.subtotal < 0 ||
        Math.abs(item.subtotal - item.quantity * item.unitPrice) > 0.001 || item.currency !== preview.currency ||
        typeof item.productName !== 'string' || !item.productName.trim()) throw new Error('Invalid summary item');
      seen.add(item.productId);
    }
    if (preview.items.reduce((total, item) => total + item.quantity, 0) !== preview.totalItems ||
      Math.abs(preview.items.reduce((total, item) => total + item.subtotal, 0) - preview.subtotal) > 0.001) throw new Error('Invalid summary totals');
  }

  private assertConfirmedOrder(order: ConfirmedOrder, attempt: SavedOrderAttempt): void {
    this.assertPreview(order, attempt.input.items);
    if (!order.canConfirmOrder || order.signature !== attempt.input.previewSignature || !/^[a-fA-F0-9]{24}$/.test(order.orderId) ||
      typeof order.reference !== 'string' || !order.reference.trim() || !['pending_review', 'confirmed', 'cancelled', 'completed'].includes(order.status)) throw new Error('Invalid confirmed order');
  }

  private contactFrom(input: OrderContact): OrderContact {
    return { customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone };
  }

  private sameItems(left: readonly OrderItemInput[], right: readonly OrderItemInput[]): boolean {
    return left.length === right.length && left.every(item => right.some(other => other.productId === item.productId && other.quantity === item.quantity));
  }

  private isCurrent(generation: number): boolean { return this.active && generation === this.generation; }
  private isUnauthorized(error: unknown): boolean { return error instanceof ApiError && error.isUnauthorized; }

  private canEdit(): boolean {
    return this.active && !this.state.restoring && !this.state.recoveryBlocked && ['idle', 'review', 'error'].includes(this.state.status) && !this.attempt;
  }

  private makeSnapshot(): OrdersViewModel {
    return {
      ...this.state, canEdit: this.canEdit(),
      canConfirm: this.active && !this.state.restoring && !this.state.recoveryBlocked && this.state.status === 'review' && Boolean(this.state.preview?.canConfirmOrder),
      setContact: this.setContact, setAddress: this.setAddress, review: this.review, confirm: this.confirm,
      retryConfirmation: this.retryConfirmation, retryCleanup: this.retryCleanup, retryRecovery: this.retryRecovery,
      cancelReview: this.cancelReview, reset: this.reset,
    };
  }

  private update(changes: Partial<OrderState>): void {
    this.state = { ...this.state, ...changes };
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach(listener => listener());
  }
}
