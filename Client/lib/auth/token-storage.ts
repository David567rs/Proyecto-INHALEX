const ACCESS_TOKEN_KEY = "inhalex_access_token"
const PENDING_LOGOUT_KEY = "inhalex_pending_logout"

// Storage can be unavailable in private browsing or when its quota is exhausted.
let memoryToken: string | null = null
let tokenIsVolatile = false
let memoryPendingLogout: string | null = null
let pendingLogoutIsVolatile = false

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  if (getPendingLogout()) return null
  if (tokenIsVolatile) return memoryToken

  try {
    memoryToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    // Keep the current tab usable without persisting additional session data.
  }

  return memoryToken
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return
  }

  memoryToken = token
  tokenIsVolatile = true
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
    tokenIsVolatile = false
  } catch {
    // The existing HttpOnly cookie and in-memory token still work in this tab.
  }
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return
  }

  memoryToken = null
  tokenIsVolatile = true
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    tokenIsVolatile = false
  } catch {
    // A pending-logout marker also prevents reading a stale token in this tab.
  }
}

/** A random intent ID, never a token, user profile, or queued business request. */
export function markPendingLogout(): string {
  const intent = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  memoryPendingLogout = intent
  pendingLogoutIsVolatile = true
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PENDING_LOGOUT_KEY, intent)
      pendingLogoutIsVolatile = false
    } catch {
      // If storage is blocked, the intent can only survive for this tab's life.
    }
  }
  return intent
}

export function getPendingLogout(): string | null {
  if (typeof window === "undefined") return null
  if (pendingLogoutIsVolatile) return memoryPendingLogout
  try {
    // A failed write must still suppress the cookie within the current tab.
    return window.localStorage.getItem(PENDING_LOGOUT_KEY)
  } catch {
    return memoryPendingLogout
  }
}

export function clearPendingLogout(intent: string): void {
  if (getPendingLogout() !== intent) return
  if (typeof window !== "undefined") {
    try {
      // Do not lift the local logout guard while an old bearer token remains.
      window.localStorage.removeItem(ACCESS_TOKEN_KEY)
      window.localStorage.removeItem(PENDING_LOGOUT_KEY)
    } catch {
      // A stale persisted marker fails closed until it can be cleared later.
      return
    }
  }
  memoryToken = null
  tokenIsVolatile = false
  memoryPendingLogout = null
  pendingLogoutIsVolatile = false
}

export function isAuthStorageKey(key: string | null): boolean {
  return key === null || key === ACCESS_TOKEN_KEY || key === PENDING_LOGOUT_KEY
}

