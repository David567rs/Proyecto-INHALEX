const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  token?: string
}

interface ApiErrorResponse {
  message?: string | string[]
  error?: string
  statusCode?: number
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const errorPayload = payload as ApiErrorResponse
  if (Array.isArray(errorPayload.message)) {
    return errorPayload.message.join(", ")
  }

  if (typeof errorPayload.message === "string") {
    return errorPayload.message
  }

  if (typeof errorPayload.error === "string") {
    return errorPayload.error
  }

  return fallback
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, token, headers, ...rest } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "La solicitud fallo"))
  }

  return payload as T
}
