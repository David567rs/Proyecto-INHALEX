const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3200/api"
const LOCAL_API_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api\/?$/
const SHOULD_WAIT_FOR_LOCAL_API = LOCAL_API_PATTERN.test(API_BASE_URL)

let localApiReady = !SHOULD_WAIT_FOR_LOCAL_API
let localApiReadyPromise: Promise<void> | null = null

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  token?: string
}

export type PublicApiRequestOptions = Omit<
  ApiRequestOptions,
  "body" | "token" | "credentials" | "method"
> & {
  method?: "GET" | "HEAD"
}

/** HTTP failures keep their status; transport failures have no HTTP status. */
export class ApiError extends Error {
  readonly status: number | null
  readonly isNetworkError: boolean

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.isNetworkError = status === null
  }
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError
}

function resetLocalApiReadiness(): void {
  if (!SHOULD_WAIT_FOR_LOCAL_API) {
    return
  }

  localApiReady = false
  localApiReadyPromise = null
}

async function pingLocalApi(): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 900)

  try {
    const response = await fetch(API_BASE_URL, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })

    return response.ok
  } catch {
    return false
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}

async function ensureLocalApiReady(): Promise<void> {
  if (typeof window === "undefined" || !SHOULD_WAIT_FOR_LOCAL_API || localApiReady || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return
  }

  if (!localApiReadyPromise) {
    localApiReadyPromise = (async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        if (await pingLocalApi()) {
          localApiReady = true
          return
        }

        await delay(200 + attempt * 200)
      }

      throw new ApiError(
        "El backend local aun se esta iniciando. Espera un momento e intenta de nuevo.",
      )
    })().catch((error) => {
      localApiReadyPromise = null
      throw error
    })
  }

  await localApiReadyPromise
}

async function fetchWithLocalRecovery(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (error) {
    // A failed mutation may already have reached the server. Never replay it.
    const canRetry = ["GET", "HEAD"].includes((init.method ?? "GET").toUpperCase())
    if (!canRetry || init.credentials === "omit" || !SHOULD_WAIT_FOR_LOCAL_API || !isNetworkError(error)) {
      throw error
    }

    resetLocalApiReadiness()
    await ensureLocalApiReady()

    return fetch(input, init)
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, token, headers, credentials, ...rest } = options
  const requestUrl = `${API_BASE_URL}${path}`
  const requestHeaders = new Headers(headers)
  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json")
  }
  if (token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`)
  }
  const requestInit: RequestInit = {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    credentials: credentials ?? "include",
  }

  let response: Response

  try {
    // Anonymous reads must reach the worker even when the local API is offline.
    if (requestInit.credentials !== "omit") await ensureLocalApiReady()
    response = await fetchWithLocalRecovery(requestUrl, requestInit)
  } catch (error) {
    if (isNetworkError(error)) {
      throw new ApiError(
        SHOULD_WAIT_FOR_LOCAL_API
          ? "No se pudo conectar con el backend local. Verifica que este encendido."
          : "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
      )
    }

    throw error
  }

  if (response.status === 204 || requestInit.method?.toUpperCase() === "HEAD") {
    return undefined as T
  }

  const contentType = response.headers.get("content-type") ?? ""
  let payload: unknown
  try {
    payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text()
  } catch (error) {
    if (!response.ok) {
      throw new ApiError("La solicitud falló", response.status)
    }
    throw error
  }

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload, "La solicitud falló"), response.status)
  }

  return payload as T
}

/** Anonymous read requests suitable for explicitly allowed public PWA caches. */
export function publicApiRequest<T>(
  path: string,
  options: PublicApiRequestOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase()
  if (method !== "GET" && method !== "HEAD") {
    throw new Error("Las solicitudes públicas solo permiten lectura.")
  }

  const headers = new Headers(options.headers)
  headers.delete("Authorization")
  headers.delete("Cookie")

  return apiRequest<T>(path, {
    ...options,
    method,
    body: undefined,
    token: undefined,
    headers,
    credentials: "omit",
  })
}
