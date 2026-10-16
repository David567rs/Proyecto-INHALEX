import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import { beforeEach, test } from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context)
    return nextResolve(specifier, context)
  },
})
process.env.NEXT_PUBLIC_API_URL = "https://api.inhalex.test/api"
const push = await import("../lib/notifications/web-push-api.ts")
const endpoint = "https://fcm.googleapis.com/fcm/send/test-browser"
let subscribed = true
let events = []
let subscription

beforeEach(() => {
  subscribed = true
  events = []
  subscription = {
    endpoint,
    unsubscribe: async () => { events.push("browser-unsubscribed"); subscribed = false; return true },
    toJSON: () => ({ endpoint, keys: { p256dh: "test-public-key", auth: "test-auth-secret" } }),
  }
  globalThis.window = { PushManager: class {} }
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      serviceWorker: {
        getRegistration: async () => ({ pushManager: { getSubscription: async () => subscribed ? subscription : null } }),
      },
    },
  })
  globalThis.fetch = async (_url, init) => {
    events.push("api-cleanup")
    assert.equal(init.credentials, "include")
    assert.equal(init.cache, "no-store")
    return Response.json({ subscribed: false })
  }
})

test("push configuration is anonymous, no-store and never requests browser permission", async () => {
  fetch = async (url, init) => {
    assert.equal(url, "https://api.inhalex.test/api/notifications/push/config")
    assert.equal(init.credentials, "omit")
    assert.equal(init.cache, "no-store")
    assert.equal(init.headers.has("Authorization"), false)
    return Response.json({ enabled: false, publicKey: null })
  }
  assert.deepEqual(await push.getWebPushConfiguration(), { enabled: false, publicKey: null })
})

test("explicit subscription sends only browser fields and consent with current credentials", async () => {
  fetch = async (url, init) => {
    assert.ok(url.endsWith("/notifications/push/subscriptions"))
    assert.equal(init.method, "POST")
    assert.equal(init.credentials, "include")
    assert.equal(init.headers.get("Authorization"), "Bearer current-account")
    assert.deepEqual(JSON.parse(init.body), {
      endpoint, expirationTime: null, keys: { p256dh: "test-public-key", auth: "test-auth-secret" }, consent: true,
    })
    return Response.json({ subscribed: true })
  }
  assert.deepEqual(await push.saveWebPushSubscription(subscription, "current-account"), { subscribed: true })
})

test("logout revokes browser delivery before attempting authenticated server cleanup", async () => {
  fetch = async (_url, init) => {
    events.push("api-cleanup")
    assert.equal(subscribed, false)
    assert.equal(init.method, "DELETE")
    assert.equal(init.headers.get("Authorization"), "Bearer captured-before-logout")
    assert.deepEqual(JSON.parse(init.body), { endpoint })
    return Response.json({ subscribed: false })
  }
  assert.deepEqual(await push.disablePushForCurrentBrowser("captured-before-logout"), { disabled: true, serverCleanupPending: false })
  assert.deepEqual(events, ["browser-unsubscribed", "api-cleanup"])
})

test("offline API failure does not leave the browser subscribed or persist a secret retry queue", async () => {
  fetch = async () => { throw new TypeError("offline") }
  assert.deepEqual(await push.disablePushForCurrentBrowser(null), { disabled: true, serverCleanupPending: true })
  assert.equal(subscribed, false)
  assert.deepEqual(events, ["browser-unsubscribed"])
})

test("a failed local unsubscribe is visible and does not falsely report success", async () => {
  subscription.unsubscribe = async () => false
  await assert.rejects(push.disablePushForCurrentBrowser("account"), /No se pudieron desactivar/)
  assert.deepEqual(events, [])
})

test("enable and logout operations are serialized and use the shared cross-tab lock when available", async () => {
  navigator.locks = { request: async (name, operation) => { assert.equal(name, "inhalex-web-push"); return operation() } }
  let release
  const held = new Promise((resolve) => { release = resolve })
  const enabling = push.withBrowserPushLock(async () => { events.push("enable-start"); await held; events.push("enable-end") })
  const disabling = push.disablePushForCurrentBrowser("account")
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(events, ["enable-start"])
  release()
  await Promise.all([enabling, disabling])
  assert.deepEqual(events, ["enable-start", "enable-end", "browser-unsubscribed", "api-cleanup"])
})

test("unsupported browser cleanup is a no-op and URL-safe VAPID conversion preserves bytes", async () => {
  delete window.PushManager
  assert.deepEqual(await push.disablePushForCurrentBrowser(), { disabled: true, serverCleanupPending: false })
  assert.deepEqual(events, [])
  const bytes = Uint8Array.from([4, 250, 255, 0, 12])
  assert.deepEqual(push.webPushApplicationKey(Buffer.from(bytes).toString("base64url")), bytes)
})

test("logout suppresses worker delivery synchronously even while a push operation holds the lock", async () => {
  navigator.serviceWorker.controller = { postMessage: (message) => events.push(message.type) }
  let release
  const held = new Promise((resolve) => { release = resolve })
  const enabling = push.withBrowserPushLock(async () => { await held })
  const disabling = push.disablePushForCurrentBrowser("account")
  assert.deepEqual(events, ["PUSH_DISABLED"])
  release()
  await Promise.all([enabling, disabling])
  assert.deepEqual(events, ["PUSH_DISABLED", "browser-unsubscribed", "api-cleanup"])
})

test("a cancelled account transition cannot re-enable worker consent after registration resolves", async () => {
  let release
  navigator.serviceWorker.getRegistration = () => new Promise((resolve) => { release = resolve })
  let current = true
  const enabling = push.setBrowserPushConsent(true, () => current)
  current = false
  release({ active: { postMessage: (message) => events.push(message.type) } })
  await enabling
  assert.deepEqual(events, [])
})

test("enabling consent waits for the worker to acknowledge its persisted preference", async () => {
  let acknowledge
  navigator.serviceWorker.controller = {
    postMessage: (message, ports) => {
      assert.deepEqual(message, { type: "PUSH_ENABLED" })
      acknowledge = () => ports[0].postMessage({ ok: true })
    },
  }
  let finished = false
  const enabling = push.setBrowserPushConsent(true).then(() => { finished = true })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(finished, false)
  acknowledge()
  await enabling
  assert.equal(finished, true)
})

test("a worker rejection does not claim that notifications were enabled", async () => {
  navigator.serviceWorker.controller = {
    postMessage: (_message, ports) => ports[0].postMessage({ ok: false }),
  }
  await assert.rejects(push.setBrowserPushConsent(true), /confirmar los avisos/)
})

test("enabling consent times out after five seconds if the worker cannot confirm storage", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] })
  navigator.serviceWorker.controller = { postMessage: () => undefined }
  const rejected = assert.rejects(push.setBrowserPushConsent(true), /confirmar los avisos/)
  context.mock.timers.tick(5000)
  await rejected
})

test("a session change while waiting for worker acknowledgement cancels activation", async () => {
  let acknowledge
  let current = true
  navigator.serviceWorker.controller = {
    postMessage: (_message, ports) => { acknowledge = () => ports[0].postMessage({ ok: true }) },
  }
  const enabling = push.setBrowserPushConsent(true, () => current)
  const rejected = assert.rejects(enabling, /sesión cambió/)
  current = false
  acknowledge()
  await rejected
})

test("enabling without an active worker fails instead of reporting success", async () => {
  await assert.rejects(push.setBrowserPushConsent(true), /preparando/)
})
