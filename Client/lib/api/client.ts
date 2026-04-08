const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"
const LOCAL_API_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api\/?$/
const SHOULD_WAIT_FOR_LOCAL_API = LOCAL_API_PATTERN.test(API_BASE_URL)

let localApiReady = !SHOULD_WAIT_FOR_LOCAL_API
let localApiReadyPromise: Promise<void> | null = null

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
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
  const timeoutId = window.setTimeout(() => controller.abort(), 900)

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
    window.clearTimeout(timeoutId)
  }
}

async function ensureLocalApiReady(): Promise<void> {
  if (!SHOULD_WAIT_FOR_LOCAL_API || localApiReady) {
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

      throw new Error(
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
    if (!SHOULD_WAIT_FOR_LOCAL_API || !isNetworkError(error)) {
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
  const { body, token, headers, ...rest } = options
  const requestUrl = `${API_BASE_URL}${path}`
  const requestInit: RequestInit = {
    ...rest,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  }

  await ensureLocalApiReady()

  let response: Response

  try {
    response = await fetchWithLocalRecovery(requestUrl, requestInit)
  } catch (error) {
    if (SHOULD_WAIT_FOR_LOCAL_API && isNetworkError(error)) {
      throw new Error("No se pudo conectar con el backend local. Verifica que este encendido.")
    }

    throw error
  }

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
