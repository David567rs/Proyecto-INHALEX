import { logoutRequest } from "./auth-api"
import { clearPendingLogout, getPendingLogout } from "./token-storage"

// Cookie-changing requests must finish in order, including across a remount.
let mutationQueue: Promise<void> = Promise.resolve()
let logoutAttempt: Promise<boolean> | null = null

export function serializeAuthMutation<T>(operation: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    // Where available, share the cookie write lock with other tabs as well.
    if (typeof navigator !== "undefined" && navigator.locks?.request) {
      return await navigator.locks.request("inhalex-auth-session", operation)
    }
    return operation()
  }
  const result = mutationQueue.then(run, run)
  mutationQueue = result.then(() => undefined, () => undefined)
  return result
}

/** Call inside serializeAuthMutation; never replay login, orders, or payments. */
export async function clearPendingServerSession(): Promise<boolean> {
  const intent = getPendingLogout()
  if (!intent) return true
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false

  try {
    await logoutRequest()
    clearPendingLogout(intent)
    return !getPendingLogout()
  } catch {
    return false
  }
}

export function retryPendingLogout(): Promise<boolean> {
  if (!logoutAttempt) {
    logoutAttempt = serializeAuthMutation(clearPendingServerSession).finally(() => {
      logoutAttempt = null
    })
  }
  return logoutAttempt
}
