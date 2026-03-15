"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { loginRequest, meRequest, registerRequest } from "@/lib/auth/auth-api"
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth/token-storage"
import type { AuthUser, LoginInput, RegisterInput } from "@/lib/auth/types"

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginInput) => Promise<AuthUser>
  register: (payload: RegisterInput) => Promise<AuthUser>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      return
    }

    try {
      const profile = await meRequest(token)
      setUser(profile)
    } catch {
      clearAccessToken()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const initializeAuth = async () => {
      await refreshProfile()
      setIsLoading(false)
    }

    void initializeAuth()
  }, [refreshProfile])

  const login = useCallback(async (payload: LoginInput): Promise<AuthUser> => {
    const response = await loginRequest(payload)
    setAccessToken(response.accessToken)
    setUser(response.user)
    return response.user
  }, [])

  const register = useCallback(async (payload: RegisterInput): Promise<AuthUser> => {
    const response = await registerRequest(payload)
    setAccessToken(response.accessToken)
    setUser(response.user)
    return response.user
  }, [])

  const logout = useCallback(() => {
    clearAccessToken()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [isLoading, login, logout, refreshProfile, register, user],
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

