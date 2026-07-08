import { apiRequest } from "@/lib/api/client"

export interface AlexaLinkCodeResponse {
  code: string
  expiresAt: string
  expiresInSeconds: number
}

export interface AlexaLinkRevokeResponse {
  revoked: boolean
}

export function generateAlexaLinkCode(
  token: string,
): Promise<AlexaLinkCodeResponse> {
  return apiRequest<AlexaLinkCodeResponse>("/auth/alexa/link-code", {
    method: "POST",
    token,
  })
}

export function revokeAlexaLinkCode(
  token: string,
): Promise<AlexaLinkRevokeResponse> {
  return apiRequest<AlexaLinkRevokeResponse>("/auth/alexa/link-code", {
    method: "DELETE",
    token,
  })
}
