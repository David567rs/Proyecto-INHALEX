import { ApiError } from '@/core/network/ApiError';
import {
  MAX_ADDRESSES,
  validateAddressInput,
  type AddressInput,
  type ShippingAddress,
} from '../../domain/entities/ShippingAddress';
import type { AddressRepository } from '../../domain/repositories/AddressRepository';

export type AddressStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface AddressViewModel {
  addresses: ShippingAddress[];
  selectedId: string | null;
  status: AddressStatus;
  refreshing: boolean;
  pending: boolean;
  canMutate: boolean;
  errorMessage: string | null;
  actionError: string | null;
  feedback: string | null;
  refresh(): Promise<void>;
  select(id: string): void;
  save(input: AddressInput, id?: string): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  makeDefault(id: string): Promise<boolean>;
  clearFeedback(): void;
}

type AddressState = Pick<AddressViewModel,
  'addresses' | 'selectedId' | 'status' | 'refreshing' | 'pending' | 'errorMessage' | 'actionError' | 'feedback'
>;
type AddressChange = { kind: 'save'; input: AddressInput; id?: string }
  | { kind: 'remove'; id: string } | { kind: 'default'; id: string };

const SESSION_MESSAGE = 'Tu sesión venció. Inicia sesión de nuevo.';
const RECONCILE_MESSAGE = 'No pudimos confirmar el cambio. Actualiza tus direcciones antes de intentar de nuevo.';
const LOAD_MESSAGE = 'No pudimos actualizar tus direcciones. Revisa tu conexión e intenta de nuevo.';

/** One authenticated account. Reads and writes serialize; uncertain writes require a fresh GET. */
export class AddressesController {
  private active = false;
  private generation = 0;
  private readsPending = 0;
  private hasLoaded = false;
  private synchronized = false;
  private queue: Promise<unknown> = Promise.resolve();
  private startPromise: Promise<void> | null = null;
  private readonly listeners = new Set<() => void>();
  private state: AddressState = {
    addresses: [], selectedId: null, status: 'loading', refreshing: false,
    pending: false, errorMessage: null, actionError: null, feedback: null,
  };
  private snapshot: AddressViewModel;

  constructor(private readonly repository: AddressRepository) {
    this.snapshot = this.makeSnapshot();
  }

  getSnapshot = (): AddressViewModel => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  start = (): Promise<void> => {
    if (this.active) return this.startPromise ?? Promise.resolve();
    this.active = true;
    this.generation += 1;
    this.readsPending = 0;
    this.hasLoaded = false;
    this.synchronized = false;
    this.update({ status: 'loading', pending: false, refreshing: false, errorMessage: null, actionError: null, feedback: null });
    this.startPromise = this.reload(false);
    return this.startPromise;
  };

  stop = (): void => {
    this.active = false;
    this.generation += 1;
    this.readsPending = 0;
    this.hasLoaded = false;
    this.synchronized = false;
    this.startPromise = null;
    // A Strict Mode remount must wait for a write already sent by the previous mount.
  };

  refresh = (): Promise<void> => this.reload(true);

  select = (id: string): void => {
    if (!this.active || !this.hasLoaded || !this.state.addresses.some(address => address.id === id)) return;
    if (this.state.selectedId !== id) this.update({ selectedId: id });
  };

  save = (input: AddressInput, id?: string): Promise<boolean> => {
    if (!this.active || !this.snapshot.canMutate) return Promise.resolve(false);
    const validation = validateAddressInput(input);
    if (!validation.isValid) {
      this.update({ actionError: 'Revisa los campos de la dirección antes de guardar.', feedback: null });
      return Promise.resolve(false);
    }
    if (id && this.state.addresses.find(address => address.id === id)?.isDefault && !validation.value.isDefault) {
      this.update({ actionError: 'Para cambiar la dirección principal, elige otra dirección como principal.', feedback: null });
      return Promise.resolve(false);
    }
    if (!id && this.state.addresses.length >= MAX_ADDRESSES) {
      this.update({ actionError: `Puedes guardar hasta ${MAX_ADDRESSES} direcciones. Edita o elimina una para agregar otra.`, feedback: null });
      return Promise.resolve(false);
    }
    return this.change({ kind: 'save', input: validation.value, id });
  };

  remove = (id: string): Promise<boolean> => this.change({ kind: 'remove', id });

  makeDefault = (id: string): Promise<boolean> => {
    if (!this.snapshot.canMutate || this.state.addresses.find(address => address.id === id)?.isDefault) return Promise.resolve(false);
    return this.change({ kind: 'default', id });
  };

  clearFeedback = (): void => {
    if (this.active && this.state.feedback) this.update({ feedback: null });
  };

  private isCurrent(generation: number): boolean {
    return this.active && generation === this.generation;
  }

  private enqueue<T>(generation: number, skipped: T, operation: () => Promise<T>): Promise<T> {
    const task = this.queue.then(() => this.isCurrent(generation) ? operation() : skipped);
    this.queue = task.catch(() => undefined);
    return task;
  }

  private reload(refreshing: boolean): Promise<void> {
    if (!this.active) return Promise.resolve();
    const generation = this.generation;
    this.readsPending += 1;
    this.update({ status: this.hasLoaded ? this.listStatus() : 'loading', refreshing: refreshing || this.state.refreshing, errorMessage: null });
    return this.enqueue(generation, undefined, async () => {
      try {
        const addresses = await this.repository.list(() => this.isCurrent(generation));
        if (!this.isCurrent(generation)) return;
        this.applyAddresses(addresses);
        this.synchronized = true;
        this.update({ errorMessage: null, actionError: null });
      } catch (error) {
        if (!this.isCurrent(generation)) return;
        if (this.isUnauthorized(error)) this.synchronized = false;
        this.update({
          status: this.hasLoaded ? this.listStatus() : 'error',
          errorMessage: this.isUnauthorized(error) ? SESSION_MESSAGE : LOAD_MESSAGE,
        });
      } finally {
        if (this.isCurrent(generation)) {
          this.readsPending -= 1;
          this.update({ refreshing: this.readsPending > 0 && this.state.refreshing });
        }
      }
    });
  }

  private change(change: AddressChange): Promise<boolean> {
    if (!this.snapshot.canMutate || !this.active) return Promise.resolve(false);
    const id = change.id;
    if (id !== undefined && !this.state.addresses.some(address => address.id === id)) {
      this.update({ actionError: 'Esta dirección ya no está disponible. Actualiza tus direcciones.', feedback: null });
      return Promise.resolve(false);
    }
    const generation = this.generation;
    const knownIds = new Set(this.state.addresses.map(address => address.id));
    this.update({ pending: true, actionError: null, feedback: null });
    return this.enqueue(generation, false, async () => {
      try {
        if (!this.synchronized) return false;
        const isCurrent = () => this.isCurrent(generation);
        const addresses = change.kind === 'save'
          ? change.id
            ? await this.repository.update(change.id, change.input, isCurrent)
            : await this.repository.create(change.input, isCurrent)
          : change.kind === 'remove'
            ? await this.repository.remove(change.id, isCurrent)
            : await this.repository.update(change.id, { isDefault: true }, isCurrent);
        if (!this.isCurrent(generation)) return false;
        const preferredId = change.kind === 'save'
          ? change.id ?? (Array.isArray(addresses) ? addresses.find(address => !knownIds.has(address.id))?.id : undefined)
          : undefined;
        this.applyAddresses(addresses, preferredId);
        this.update({
          errorMessage: null,
          feedback: change.kind === 'remove' ? 'Dirección eliminada' : change.kind === 'default' ? 'Dirección principal actualizada' : change.id ? 'Dirección actualizada' : 'Dirección guardada',
        });
        return true;
      } catch (error) {
        if (!this.isCurrent(generation)) return false;
        if (this.isUnauthorized(error)) {
          this.synchronized = false;
          this.update({ actionError: SESSION_MESSAGE });
        } else if (error instanceof ApiError && error.status === 404) {
          this.synchronized = false;
          await this.reconcileMissingAddress(generation);
        } else if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
          this.update({ actionError: 'No pudimos guardar el cambio. Revisa los datos de la dirección.' });
        } else {
          // A network timeout, 5xx, conflict or malformed success may follow a committed write.
          // Do not repeat the write until a read has reconciled the full server list.
          this.synchronized = false;
          this.update({ actionError: RECONCILE_MESSAGE });
        }
        return false;
      } finally {
        if (this.isCurrent(generation)) this.update({ pending: false });
      }
    });
  }

  private async reconcileMissingAddress(generation: number): Promise<void> {
    try {
      const addresses = await this.repository.list(() => this.isCurrent(generation));
      if (!this.isCurrent(generation)) return;
      this.applyAddresses(addresses);
      this.synchronized = true;
      this.update({ actionError: 'Esta dirección ya no está disponible. Actualizamos tus direcciones.', errorMessage: null });
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.update({ actionError: this.isUnauthorized(error) ? SESSION_MESSAGE : RECONCILE_MESSAGE });
    }
  }

  private applyAddresses(addresses: ShippingAddress[], preferredId?: string): void {
    if (!Array.isArray(addresses) || addresses.length > MAX_ADDRESSES
      || addresses.some(address => !address || typeof address.id !== 'string' || !address.id || typeof address.isDefault !== 'boolean')
      || new Set(addresses.map(address => address.id)).size !== addresses.length) {
      throw new Error('Invalid addresses response');
    }
    const selectedId = [preferredId, this.state.selectedId].find(id => id && addresses.some(address => address.id === id))
      ?? addresses.find(address => address.isDefault)?.id ?? addresses[0]?.id ?? null;
    this.hasLoaded = true;
    this.update({ addresses, selectedId, status: this.listStatus(addresses) });
  }

  private isUnauthorized(error: unknown): boolean {
    return error instanceof ApiError && error.isUnauthorized;
  }

  private listStatus(addresses = this.state.addresses): 'ready' | 'empty' {
    return addresses.length ? 'ready' : 'empty';
  }

  private makeSnapshot(): AddressViewModel {
    return {
      ...this.state,
      canMutate: this.active && this.hasLoaded && this.synchronized && !this.state.pending && this.readsPending === 0,
      refresh: this.refresh, select: this.select, save: this.save, remove: this.remove,
      makeDefault: this.makeDefault, clearFeedback: this.clearFeedback,
    };
  }

  private update(changes: Partial<AddressState>): void {
    this.state = { ...this.state, ...changes };
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach(listener => listener());
  }
}
