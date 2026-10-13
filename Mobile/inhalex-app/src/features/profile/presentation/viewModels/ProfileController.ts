import { ApiError } from '@/core/network/ApiError';
import type { AuthUser } from '@/features/auth/domain/entities/AuthUser';
import {
  emptyProfileInput,
  normalizeProfileInput,
  profileInputFromUser,
  validateProfileInput,
  type ProfileFieldErrors,
  type ProfileInput,
} from '../../domain/entities/Profile';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';

export interface ProfileViewModel {
  profile: AuthUser | null;
  form: ProfileInput;
  fieldErrors: ProfileFieldErrors;
  status: 'idle' | 'loading' | 'ready' | 'error';
  refreshing: boolean;
  saving: boolean;
  dirty: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  refresh(): Promise<void>;
  setField(field: keyof ProfileInput, value: string): void;
  save(): Promise<void>;
  discard(): void;
}

type ProfileState = Omit<ProfileViewModel, 'refresh' | 'setField' | 'save' | 'discard'>;
type ProfileRequest = { kind: 'read' | 'save'; promise: Promise<void>; resolve(): void };

const SESSION_MESSAGE = 'Tu sesión venció. Inicia sesión de nuevo.';
const LOAD_MESSAGE = 'No pudimos cargar tu perfil. Revisa tu conexión e intenta de nuevo.';
const REFRESH_MESSAGE = 'No pudimos actualizar tu perfil. Conservamos la última información disponible.';
const SAVE_MESSAGE = 'No pudimos confirmar que se guardaran tus cambios. Conservamos tus datos para que puedas intentar de nuevo.';

function initialState(): ProfileState {
  return {
    profile: null, form: emptyProfileInput(), fieldErrors: {}, status: 'idle',
    refreshing: false, saving: false, dirty: false, errorMessage: null, successMessage: null,
  };
}

function sameInput(first: ProfileInput, second: ProfileInput): boolean {
  const left = normalizeProfileInput(first);
  const right = normalizeProfileInput(second);
  return left.firstName === right.firstName && left.lastName === right.lastName && left.phone === right.phone;
}

/** Editable personal data scoped to one authenticated account. */
export class ProfileController {
  private active = false;
  private pending: ProfileRequest | null = null;
  private readonly listeners = new Set<() => void>();
  private state = initialState();
  private snapshot: ProfileViewModel;

  constructor(
    private readonly repository: ProfileRepository,
    private readonly expectedUserId: string,
    private readonly onProfile?: (profile: AuthUser) => void,
  ) {
    this.snapshot = this.makeSnapshot();
  }

  getSnapshot = (): ProfileViewModel => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  start = (): Promise<void> => {
    if (this.active) return this.pending?.promise ?? Promise.resolve();
    this.active = true;
    return this.refresh();
  };

  stop = (): void => {
    this.active = false;
    this.cancelPending();
    this.update(initialState());
  };

  refresh = (): Promise<void> => {
    if (!this.active || this.state.dirty || this.state.saving) return Promise.resolve();
    if (this.pending) return this.pending.promise;
    const request = this.createRequest('read');
    this.update({
      status: this.state.profile ? 'ready' : 'loading', refreshing: !!this.state.profile,
      errorMessage: null, successMessage: null,
    });
    void this.read(request);
    return request.promise;
  };

  setField = (field: keyof ProfileInput, value: string): void => {
    if (!this.active || !this.state.profile || this.state.saving) return;
    if (field !== 'firstName' && field !== 'lastName' && field !== 'phone') return;
    // An already-running refresh must never replace a newly edited draft.
    if (this.pending?.kind === 'read') this.cancelPending();
    const form = { ...this.state.form, [field]: value };
    const fieldErrors = { ...this.state.fieldErrors };
    delete fieldErrors[field];
    this.update({
      form, fieldErrors, dirty: !sameInput(form, profileInputFromUser(this.state.profile)),
      refreshing: false, errorMessage: null, successMessage: null,
    });
  };

  save = (): Promise<void> => {
    if (!this.active || !this.state.profile) return Promise.resolve();
    if (this.pending?.kind === 'save') return this.pending.promise;
    if (!this.state.dirty) return Promise.resolve();
    const input = normalizeProfileInput(this.state.form);
    const fieldErrors = validateProfileInput(input);
    if (Object.keys(fieldErrors).length) {
      this.update({ fieldErrors, errorMessage: null, successMessage: null });
      return Promise.resolve();
    }
    this.cancelPending();
    const request = this.createRequest('save');
    this.update({ saving: true, refreshing: false, fieldErrors: {}, errorMessage: null, successMessage: null });
    void this.write(request, input);
    return request.promise;
  };

  discard = (): void => {
    if (!this.active || !this.state.profile || this.state.saving) return;
    this.update({
      form: profileInputFromUser(this.state.profile), fieldErrors: {}, dirty: false,
      errorMessage: null, successMessage: null,
    });
  };

  private async read(request: ProfileRequest): Promise<void> {
    const isCurrent = () => this.active && this.pending === request;
    try {
      const profile = await this.repository.get(isCurrent);
      if (!isCurrent()) return;
      this.acceptProfile(profile, isCurrent);
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof ApiError && error.isUnauthorized) this.expireSession();
      else this.update({
        status: this.state.profile ? 'ready' : 'error',
        errorMessage: this.state.profile ? REFRESH_MESSAGE : LOAD_MESSAGE,
      });
    } finally {
      this.finishRequest(request);
    }
  }

  private async write(request: ProfileRequest, input: ProfileInput): Promise<void> {
    const isCurrent = () => this.active && this.pending === request;
    try {
      const profile = await this.repository.update(input, isCurrent);
      if (!isCurrent()) return;
      if (profile.id !== this.expectedUserId) throw new ApiError(SESSION_MESSAGE, 401);
      if (!sameInput(profileInputFromUser(profile), input)) throw new Error('Profile update was not confirmed');
      this.acceptProfile(profile, isCurrent);
      if (isCurrent()) this.update({ successMessage: 'Tu perfil se actualizó correctamente.' });
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof ApiError && error.isUnauthorized) this.expireSession();
      else this.update({
        errorMessage: error instanceof ApiError && error.status === 400
          ? 'No pudimos guardar tus datos. Revisa los campos e intenta de nuevo.' : SAVE_MESSAGE,
        successMessage: null,
      });
    } finally {
      this.finishRequest(request);
    }
  }

  private acceptProfile(profile: AuthUser, isCurrent: () => boolean): void {
    if (!this.expectedUserId || profile.id !== this.expectedUserId) throw new ApiError(SESSION_MESSAGE, 401);
    this.update({
      profile, form: profileInputFromUser(profile), status: 'ready', dirty: false,
      fieldErrors: {}, errorMessage: null,
    });
    if (isCurrent()) this.onProfile?.(profile);
  }

  private expireSession(): void {
    this.update({ ...initialState(), status: 'error', errorMessage: SESSION_MESSAGE });
  }

  private createRequest(kind: ProfileRequest['kind']): ProfileRequest {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    const request = { kind, promise, resolve };
    this.pending = request;
    return request;
  }

  private finishRequest(request: ProfileRequest): void {
    if (this.active && this.pending === request) {
      this.pending = null;
      this.update({ refreshing: false, saving: false });
    }
    request.resolve();
  }

  private cancelPending(): void {
    const request = this.pending;
    this.pending = null;
    request?.resolve();
  }

  private makeSnapshot(): ProfileViewModel {
    return { ...this.state, refresh: this.refresh, setField: this.setField, save: this.save, discard: this.discard };
  }

  private update(changes: Partial<ProfileState>): void {
    this.state = { ...this.state, ...changes };
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach(listener => listener());
  }
}
