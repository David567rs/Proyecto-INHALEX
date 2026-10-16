import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { registerHooks } from "node:module"
import { fileURLToPath } from "node:url"
import { beforeEach, test } from "node:test"

// Node 24 strips these modules' TypeScript; no bundler or extra test dependency.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context)
    }
    if (specifier.startsWith(".") && context.parentURL?.includes("/lib/")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context)
    }
    return nextResolve(specifier, context)
  },
})

process.env.NEXT_PUBLIC_API_URL = "https://api.inhalex.test/api"
const storage = new Map()
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
}
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { onLine: true },
})

const { apiRequest, publicApiRequest, ApiError } = await import("../lib/api/client.ts")
const tokens = await import("../lib/auth/token-storage.ts")
const { retryPendingLogout, serializeAuthMutation } = await import("../lib/auth/session-actions.ts")

beforeEach(async () => {
  navigator.onLine = true
  globalThis.fetch = async () => new Response(null, { status: 204 })
  await retryPendingLogout()
  tokens.clearAccessToken()
  storage.clear()
})

test("private requests retain credentials, bearer and no-store with Headers inputs", async () => {
  fetch = async (_url, init) => {
    assert.equal(init.credentials, "include")
    assert.equal(init.cache, "no-store")
    assert.equal(init.headers.get("Authorization"), "Bearer private-token")
    assert.equal(init.headers.get("X-Request-Test"), "kept")
    return Response.json({ ok: true })
  }
  assert.deepEqual(await apiRequest("/auth/me", {
    token: "private-token",
    headers: new Headers({ "X-Request-Test": "kept" }),
  }), { ok: true })
})

test("public requests omit cookies and strip authorization even for untyped callers", async () => {
  fetch = async (_url, init) => {
    assert.equal(init.credentials, "omit")
    assert.equal(init.headers.has("Authorization"), false)
    assert.equal(init.headers.has("Cookie"), false)
    assert.equal(init.body, undefined)
    return Response.json([])
  }
  await publicApiRequest("/products", {
    credentials: "include",
    token: "must-not-leak",
    body: "must-not-send",
    headers: { Authorization: "Bearer must-not-leak", Cookie: "session=private" },
  })
  assert.throws(() => publicApiRequest("/products", { method: "POST" }), /solo permiten lectura/)
})

test("HTTP statuses survive JSON failures and remain distinct from transport errors", async () => {
  for (const status of [401, 403, 503]) {
    fetch = async () => new Response("broken-json", {
      status,
      headers: { "Content-Type": "application/json" },
    })
    await assert.rejects(apiRequest("/auth/me"), (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, status)
      assert.equal(error.isNetworkError, false)
      return true
    })
  }
  fetch = async () => { throw new TypeError("offline") }
  await assert.rejects(apiRequest("/auth/me"), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, null)
    assert.equal(error.isNetworkError, true)
    return true
  })
})

test("logout intent suppresses bearer and survives a fresh module instance/reload", async () => {
  tokens.setAccessToken("previous-session")
  const intent = tokens.markPendingLogout()
  assert.equal(tokens.getAccessToken(), null)
  const reloadedStorage = await import(`../lib/auth/token-storage.ts?reload=${Date.now()}`)
  assert.equal(reloadedStorage.getPendingLogout(), intent)
  assert.equal(reloadedStorage.getAccessToken(), null)
  tokens.clearPendingLogout("older-request")
  assert.equal(tokens.getPendingLogout(), intent)
  tokens.clearPendingLogout(intent)
  assert.equal(tokens.getAccessToken(), null)
  assert.equal(tokens.getPendingLogout(), null)
})

test("offline logout sends nothing; failed cleanup retains intent; reconnect retries only logout", async () => {
  tokens.setAccessToken("previous-session")
  const intent = tokens.markPendingLogout()
  tokens.clearAccessToken()
  let calls = 0
  fetch = async (url, init) => {
    calls += 1
    assert.ok(url.endsWith("/auth/logout"))
    assert.equal(init.method, "POST")
    throw new TypeError("connection lost")
  }
  navigator.onLine = false
  assert.equal(await retryPendingLogout(), false)
  assert.equal(calls, 0)
  navigator.onLine = true
  assert.equal(await retryPendingLogout(), false)
  assert.equal(calls, 1)
  assert.equal(tokens.getPendingLogout(), intent)
  fetch = async (url) => {
    assert.ok(url.endsWith("/auth/logout"))
    return new Response(null, { status: 204 })
  }
  assert.equal(await retryPendingLogout(), true)
  assert.equal(tokens.getPendingLogout(), null)
})

test("cookie mutations serialize and a stale logout response cannot clear a newer intent", async () => {
  let finishLogin
  const order = []
  const login = serializeAuthMutation(async () => {
    order.push("login-start")
    await new Promise((resolve) => { finishLogin = resolve })
    order.push("login-end")
  })
  await Promise.resolve()
  const oldIntent = tokens.markPendingLogout()
  let finishLogout
  fetch = async () => {
    order.push("logout")
    await new Promise((resolve) => { finishLogout = resolve })
    return new Response(null, { status: 204 })
  }
  const logout = retryPendingLogout()
  assert.equal(retryPendingLogout(), logout)
  assert.deepEqual(order, ["login-start"])
  finishLogin()
  await login
  // Drain the serialized promise chain until the logout request is dispatched.
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(order, ["login-start", "login-end", "logout"])
  const newIntent = tokens.markPendingLogout()
  assert.notEqual(oldIntent, newIntent)
  finishLogout()
  assert.equal(await logout, false)
  assert.equal(tokens.getPendingLogout(), newIntent)
})

test("blocked storage writes cannot restore an old bearer or lift the logout guard", () => {
  const originalStorage = window.localStorage
  tokens.setAccessToken("old-user")
  window.localStorage = {
    getItem: originalStorage.getItem,
    setItem() { throw new Error("quota") },
    removeItem() { throw new Error("blocked") },
  }
  try {
    tokens.setAccessToken("new-user")
    assert.equal(tokens.getAccessToken(), "new-user")
    const intent = tokens.markPendingLogout()
    tokens.clearAccessToken()
    assert.equal(tokens.getAccessToken(), null)
    tokens.clearPendingLogout(intent)
    assert.equal(tokens.getPendingLogout(), intent)
  } finally {
    window.localStorage = originalStorage
    const intent = tokens.getPendingLogout()
    if (intent) tokens.clearPendingLogout(intent)
  }
})

test("cookie mutations use the shared browser lock when available", async () => {
  const names = []
  navigator.locks = {
    async request(name, operation) {
      names.push(name)
      return operation()
    },
  }
  try {
    assert.equal(await serializeAuthMutation(async () => "done"), "done")
    assert.deepEqual(names, ["inhalex-auth-session"])
  } finally {
    delete navigator.locks
  }
})
