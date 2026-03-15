import { apiRequest } from "@/lib/api/client"
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from "./types"

export function loginRequest(payload: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
  })
}

export function registerRequest(payload: RegisterInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: payload,
  })
}

export function meRequest(token: string): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/me", {
    method: "GET",
    token,
  })
}

