import { apiRequest, publicApiRequest } from "@/lib/api/client"

export interface WebPushConfiguration {
  enabled: boolean
  publicKey: string | null
}

export function getWebPushConfiguration(): Promise<WebPushConfiguration> {
  return publicApiRequest("/notifications/push/config", { signal: AbortSignal.timeout(10000) })
}

export function getWebPushStatus(endpoint: string, token?: string | null): Promise<{ subscribed: boolean }> {
  return apiRequest("/notifications/push/status", {
    method: "POST", token: token ?? undefined, body: { endpoint }, signal: AbortSignal.timeout(10000),
  })
}

export function saveWebPushSubscription(subscription: PushSubscription, token?: string | null): Promise<{ subscribed: boolean }> {
  const { endpoint, expirationTime, keys } = subscription.toJSON()
  return apiRequest("/notifications/push/subscriptions", {
    method: "POST", token: token ?? undefined,
    body: { endpoint, expirationTime: expirationTime ?? null, keys, consent: true },
    signal: AbortSignal.timeout(10000),
  })
}

export function deleteWebPushSubscription(endpoint: string, token?: string | null): Promise<{ subscribed: boolean }> {
  return apiRequest("/notifications/push/subscriptions", {
    method: "DELETE", token: token ?? undefined, body: { endpoint }, signal: AbortSignal.timeout(10000),
  })
}

export function webPushApplicationKey(encoded: string): Uint8Array<ArrayBuffer> {
  const bytes = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0))
}

let pushOperation: Promise<unknown> = Promise.resolve()

/** Worker stores only a consent boolean; no account or subscription identifier. */
export async function setBrowserPushConsent(enabled: boolean, isCurrent: () => boolean = () => true): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    if (enabled) throw new Error("Este navegador no puede activar los avisos.")
    return
  }
  const message = { type: enabled ? "PUSH_ENABLED" : "PUSH_DISABLED" }
  let worker = navigator.serviceWorker.controller
  if (!worker) worker = (await navigator.serviceWorker.getRegistration("/"))?.active ?? null
  if (!isCurrent()) return
  if (!worker) {
    if (enabled) throw new Error("La aplicación aún se está preparando. Recarga e intenta de nuevo.")
    return
  }
  if (!enabled) {
    // Suppression must be posted synchronously for a controlling worker, without waiting for an acknowledgement.
    worker.postMessage(message)
    return
  }
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel()
    const failure = () => new Error("No pudimos confirmar los avisos en este navegador. Intenta de nuevo.")
    const finish = (error?: Error) => {
      globalThis.clearTimeout(timeout)
      channel.port1.close()
      channel.port2.close()
      if (error) reject(error)
      else resolve()
    }
    const timeout = globalThis.setTimeout(() => finish(failure()), 5000)
    channel.port1.onmessage = (event: MessageEvent) => {
      if (!isCurrent()) {
        finish(new Error("La sesión cambió. Activa los avisos desde tu cuenta actual."))
      } else if (event.data?.ok === true) {
        finish()
      } else {
        finish(failure())
      }
    }
    channel.port1.onmessageerror = () => finish(failure())
    try {
      worker.postMessage(message, [channel.port2])
    } catch {
      finish(failure())
    }
  })
}

/** Coordinate enable/disable across account transitions and supported browser tabs. */
export function withBrowserPushLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = async () => {
    if (typeof navigator !== "undefined" && navigator.locks?.request) {
      return navigator.locks.request("inhalex-web-push", operation)
    }
    return operation()
  }
  const result = pushOperation.then(run, run)
  pushOperation = result.then(() => undefined, () => undefined)
  return result
}

/** Capture the token before logout. Local cancellation is attempted even without connectivity. */
export function disablePushForCurrentBrowser(token?: string | null): Promise<{ disabled: boolean; serverCleanupPending: boolean }> {
  // Runs before waiting for the cross-tab lock, so logout suppresses delivery immediately.
  const suppression = setBrowserPushConsent(false).catch(() => undefined)
  return withBrowserPushLock(async () => {
    await suppression
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { disabled: true, serverCleanupPending: false }
    }
    const registration = await navigator.serviceWorker.getRegistration("/")
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return { disabled: true, serverCleanupPending: false }
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    const remaining = await registration?.pushManager.getSubscription()
    if (remaining?.endpoint === endpoint) {
      throw new Error("No se pudieron desactivar los avisos en este navegador. Intenta de nuevo.")
    }
    try {
      await deleteWebPushSubscription(endpoint, token)
      return { disabled: true, serverCleanupPending: false }
    } catch {
      // The browser endpoint is already revoked. No endpoint/secret is saved for later replay.
      return { disabled: true, serverCleanupPending: true }
    }
  })
}
