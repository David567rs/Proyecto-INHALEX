type AvailabilityOptions = {
  waitMs?: number
  probeMs?: number
  retryMs?: number
  freshMs?: number
}

/** Read-only startup checks. Business requests are never replayed here. */
export function createApiAvailability(baseUrl: string, options: AvailabilityOptions = {}) {
  let isRender = false
  try { isRender = new URL(baseUrl).hostname.endsWith(".onrender.com") } catch { /* Keep normal request validation. */ }
  // Leave 15 seconds for the single authentication request after startup.
  const waitMs = options.waitMs ?? 75_000
  const probeMs = options.probeMs ?? 10_000
  const retryMs = options.retryMs ?? 2_000
  const freshMs = options.freshMs ?? 30_000
  const listeners = new Set<() => void>()
  let readyAt: number | null = null
  let pending: Promise<void> | null = null

  function notify() { listeners.forEach((listener) => listener()) }
  function offline() { return typeof navigator !== "undefined" && navigator.onLine === false }

  async function check() {
    const deadline = Date.now() + waitMs
    while (Date.now() < deadline) {
      if (offline()) throw new Error("No tienes conexión. Reconecta e inténtalo de nuevo.")
      const controller = new AbortController()
      const timer = globalThis.setTimeout(() => controller.abort(), Math.min(probeMs, deadline - Date.now()))
      let unavailableRoute = false
      try {
        const response = await fetch(`${baseUrl}/health`, {
          method: "GET", credentials: "omit", cache: "no-store", redirect: "error",
          headers: { Accept: "application/json" }, signal: controller.signal,
        })
        unavailableRoute = response.status >= 400 && response.status < 500
        if (response.ok) {
          const body: unknown = await response.json()
          if (body && typeof body === "object" && "status" in body && body.status === "ok"
            && "database" in body && body.database && typeof body.database === "object"
            && "status" in body.database && body.database.status === "connected") {
            readyAt = Date.now()
            return
          }
        }
      } catch {
        // A startup gateway response or interrupted read can be retried safely.
      } finally {
        globalThis.clearTimeout(timer)
      }
      if (unavailableRoute) throw new Error("No pudimos comprobar el servidor. Inténtalo más tarde.")
      const remaining = deadline - Date.now()
      if (remaining > 0) await new Promise<void>((resolve) => globalThis.setTimeout(resolve, Math.min(retryMs, remaining)))
    }
    throw new Error("El servidor está tardando en estar disponible. Tus datos siguen aquí; vuelve a intentarlo.")
  }

  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    isWaiting: () => pending !== null,
    markReady() { readyAt = Date.now() },
    invalidate() { readyAt = null },
    wait(): Promise<void> {
      if (!isRender || (readyAt !== null && Date.now() - readyAt < freshMs && !offline())) return Promise.resolve()
      if (!pending) {
        pending = check().finally(() => { pending = null; notify() })
        notify()
      }
      return pending
    },
  }
}
