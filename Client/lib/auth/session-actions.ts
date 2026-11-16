import { logoutRequest } from "./auth-api"
import { ApiError } from "@/lib/api/client"
import { clearPendingLogout, getPendingLogout } from "./token-storage"

// Cookie-changing requests must finish in order, including across a remount.
let mutationQueue: Promise<void> = Promise.resolve()
let logoutAttempt: Promise<boolean> | null = null

export function serializeAuthMutation<T>(operation: () => Promise<T>, deadline?: number): Promise<T> {
  const expired = () => new ApiError("El servidor está tardando en responder. Tus datos siguen aquí; vuelve a intentarlo.")
  const execute = () => {
    // A queue released after its visible timeout must not send a late login.
    if (deadline !== undefined && Date.now() >= deadline) throw expired()
    return operation()
  }
  const run = async (): Promise<T> => {
    // Where available, share the cookie write lock with other tabs as well.
    if (typeof navigator !== "undefined" && navigator.locks?.request) {
      return await navigator.locks.request("inhalex-auth-session", () => execute())
    }
    return execute()
  }
  const result = mutationQueue.then(run, run)
  mutationQueue = result.then(() => undefined, () => undefined)
  if (deadline === undefined) return result
  let timer: ReturnType<typeof setTimeout>
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = globalThis.setTimeout(() => reject(expired()), Math.max(0, deadline - Date.now()))
  })
  return Promise.race([result, timedOut]).finally(() => globalThis.clearTimeout(timer))
}

/** Call inside serializeAuthMutation; never replay login, orders, or payments. */
export async function clearPendingServerSession(timeoutMs = 15_000): Promise<boolean> {
  const intent = getPendingLogout()
  if (!intent) return true
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false

  try {
    await logoutRequest(timeoutMs)
    clearPendingLogout(intent)
    return !getPendingLogout()
  } catch {
    return false
  }
}

export function retryPendingLogout(): Promise<boolean> {
  if (!logoutAttempt) {
    logoutAttempt = serializeAuthMutation(() => clearPendingServerSession()).finally(() => {
      logoutAttempt = null
    })
  }
  return logoutAttempt
}
