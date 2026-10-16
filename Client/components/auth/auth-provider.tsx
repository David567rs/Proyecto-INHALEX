"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { ApiError } from "@/lib/api/client"
import { loginRequest, meRequest, registerRequest } from "@/lib/auth/auth-api"
import {
  clearAccessToken,
  getAccessToken,
  getPendingLogout,
  isAuthStorageKey,
  markPendingLogout,
  setAccessToken,
} from "@/lib/auth/token-storage"
import {
  clearPendingServerSession,
  retryPendingLogout,
  serializeAuthMutation,
} from "@/lib/auth/session-actions"
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from "@/lib/auth/types"
import { disablePushForCurrentBrowser } from "@/lib/notifications/web-push-api"

export type SessionStatus = "checking" | "authenticated" | "anonymous" | "unavailable"

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  sessionStatus: SessionStatus
  login: (payload: LoginInput) => Promise<AuthUser>
  register: (payload: RegisterInput) => Promise<AuthUser>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking")
  const sessionVersion = useRef(0)
  const profileVersion = useRef(0)
  const authenticationVersion = useRef<number | null>(null)

  const loadProfile = useCallback(async () => {
    const version = sessionVersion.current
    if (authenticationVersion.current === version) return
    const request = ++profileVersion.current
    const token = getAccessToken()
    const isCurrent = () =>
      sessionVersion.current === version && profileVersion.current === request

    if (getPendingLogout()) {
      await retryPendingLogout()
      if (!isCurrent()) return
      setUser(null)
      setSessionStatus("anonymous")
      return
    }

    try {
      const profile = await meRequest(token)
      if (!isCurrent() || getPendingLogout()) return
      setUser(profile)
      setSessionStatus("authenticated")
    } catch (error) {
      if (!isCurrent() || getPendingLogout()) return
      setUser(null)
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        void disablePushForCurrentBrowser(token).catch(() => undefined)
        clearAccessToken()
        setSessionStatus("anonymous")
      } else {
        // Keep credentials for reconnection, but never expose an unverified user.
        setSessionStatus("unavailable")
      }
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    setUser(null)
    setSessionStatus("checking")
    await loadProfile()
  }, [loadProfile])

  useEffect(() => {
    // Subscribe before starting the request and cancel Strict Mode's discarded bootstrap.
    // The initial state is already checking; no synchronous state update is needed here.
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadProfile()
    })

    const handleOnline = () => void refreshProfile()
    const handleOffline = () => {
      sessionVersion.current += 1
      profileVersion.current += 1
      setUser(null)
      setSessionStatus(getPendingLogout() ? "anonymous" : "unavailable")
    }
    const handleStorage = (event: StorageEvent) => {
      if (!isAuthStorageKey(event.key)) return
      sessionVersion.current += 1
      void refreshProfile()
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    window.addEventListener("storage", handleStorage)
    return () => {
      cancelled = true
      sessionVersion.current += 1
      profileVersion.current += 1
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("storage", handleStorage)
    }
  }, [loadProfile, refreshProfile])

  const authenticate = useCallback(async (request: () => Promise<AuthResponse>) => {
    // An expired session can be replaced without an explicit logout click.
    void disablePushForCurrentBrowser(getAccessToken()).catch(() => undefined)
    const version = ++sessionVersion.current
    authenticationVersion.current = version
    profileVersion.current += 1
    setUser(null)
    setSessionStatus("checking")
    const ensureCurrent = () => {
      if (sessionVersion.current !== version) {
        throw new Error("La solicitud de sesión fue cancelada. Intenta de nuevo.")
      }
    }

    try {
      return await serializeAuthMutation(async () => {
        ensureCurrent()
        if (!(await clearPendingServerSession())) {
          throw new ApiError("Reconecta para terminar de cerrar la sesión anterior e intenta de nuevo.")
        }
        ensureCurrent()
        const response = await request()
        ensureCurrent()
        if (getPendingLogout()) {
          throw new Error("La sesión se cerró desde otra pestaña. Intenta de nuevo.")
        }
        profileVersion.current += 1
        setAccessToken(response.accessToken)
        setUser(response.user)
        setSessionStatus("authenticated")
        return response.user
      })
    } catch (error) {
      if (sessionVersion.current === version) {
        profileVersion.current += 1
        const unavailable = error instanceof ApiError
          && (error.status === null || error.status >= 500)
        setUser(null)
        setSessionStatus(unavailable ? "unavailable" : "anonymous")
      }
      throw error
    } finally {
      if (authenticationVersion.current === version) authenticationVersion.current = null
    }
  }, [])

  const login = useCallback(
    (payload: LoginInput) => authenticate(() => loginRequest(payload)),
    [authenticate],
  )

  const register = useCallback(
    (payload: RegisterInput) => authenticate(() => registerRequest(payload)),
    [authenticate],
  )

  const logout = useCallback(() => {
    // Capture the old credential before clearing it; revoke this device's endpoint.
    void disablePushForCurrentBrowser(getAccessToken()).catch(() => undefined)
    sessionVersion.current += 1
    profileVersion.current += 1
    markPendingLogout()
    clearAccessToken()
    setUser(null)
    setSessionStatus("anonymous")
    // Only cookie cleanup is retried on reconnection; never business mutations.
    void retryPendingLogout()
  }, [])

  const isLoading = sessionStatus === "checking"
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: sessionStatus === "authenticated" && Boolean(user),
      isLoading,
      sessionStatus,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [isLoading, login, logout, refreshProfile, register, sessionStatus, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}

