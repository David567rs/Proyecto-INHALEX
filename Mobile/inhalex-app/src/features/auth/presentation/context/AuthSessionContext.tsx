import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { getDisplayError } from '@/core/network/ApiError';
import { authSessionService } from '../../data/authDependencies';
import type { LoginInput, RegisterInput } from '../../domain/entities/AuthCredentials';
import type { AuthUser } from '../../domain/entities/AuthUser';

export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  restoreError: string | null;
}

interface AuthSessionContextValue extends AuthState {
  isAuthenticated: boolean;
  login(input: LoginInput): Promise<AuthUser>;
  register(input: RegisterInput): Promise<AuthUser>;
  logout(): Promise<void>;
  retryRestore(): Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

const initialState: AuthState = {
  status: 'restoring',
  user: null,
  restoreError: null,
};

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    let isMounted = true;

    authSessionService
      .restore()
      .then((result) => {
        if (!isMounted) return;

        setState({
          status: result.status,
          user: result.status === 'authenticated' ? result.user : null,
          restoreError: null,
        });
      })
      .catch((error: unknown) => {
        if (!isMounted) return;

        setState({
          status: 'error',
          user: null,
          restoreError: getDisplayError(
            error,
            'No fue posible comprobar tu sesion. Intenta de nuevo.',
          ),
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const retryRestore = useCallback(async () => {
    setState((current) => ({ ...current, status: 'restoring', restoreError: null }));

    try {
      const result = await authSessionService.restore();
      setState({
        status: result.status,
        user: result.status === 'authenticated' ? result.user : null,
        restoreError: null,
      });
    } catch (error) {
      setState({
        status: 'error',
        user: null,
        restoreError: getDisplayError(
          error,
          'No fue posible comprobar tu sesion. Intenta de nuevo.',
        ),
      });
    }
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const user = await authSessionService.login(input);
    setState({ status: 'authenticated', user, restoreError: null });
    return user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const user = await authSessionService.register(input);
    setState({ status: 'authenticated', user, restoreError: null });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await authSessionService.logout();
    setState({ status: 'unauthenticated', user: null, restoreError: null });
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      ...state,
      isAuthenticated: state.status === 'authenticated',
      login,
      register,
      logout,
      retryRestore,
    }),
    [login, logout, register, retryRestore, state],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error('useAuthSession debe usarse dentro de AuthSessionProvider.');
  }

  return context;
}
