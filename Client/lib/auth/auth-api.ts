import { apiRequest } from "@/lib/api/client"
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from "./types"

export function loginRequest(payload: LoginInput, timeoutMs = 15_000): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    timeoutMs,
    body: payload,
  })
}

export function registerRequest(payload: RegisterInput, timeoutMs = 15_000): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    timeoutMs,
    body: payload,
  })
}

export function meRequest(token?: string | null): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/me", {
    method: "GET",
    timeoutMs: 15_000,
    ...(token ? { token } : {}),
  })
}

export function logoutRequest(timeoutMs = 15_000): Promise<void> {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
    timeoutMs,
  })
}

