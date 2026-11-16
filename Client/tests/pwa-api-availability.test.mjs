import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { registerHooks } from "node:module"
import { fileURLToPath } from "node:url"
import { after, test } from "node:test"
import { createApiAvailability } from "../lib/api/api-availability.ts"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context)
    if (specifier.startsWith(".") && context.parentURL?.includes("/lib/")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context)
    }
    return nextResolve(specifier, context)
  },
})

const originalFetch = globalThis.fetch
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
after(() => {
  globalThis.fetch = originalFetch
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl
})
const api = "https://example.onrender.com/api"
const ready = () => Response.json({ status: "ok", database: { status: "connected" } })
const smallBudget = { waitMs: 100, probeMs: 20, retryMs: 1, freshMs: 1000 }

test("a 503 startup response is retried as anonymous health only, then readiness is shared", async () => {
  let calls = 0
  const availability = createApiAvailability(api, smallBudget)
  const states = []
  availability.subscribe(() => states.push(availability.isWaiting()))
  globalThis.fetch = async (url, init) => {
    calls += 1
    assert.equal(url, `${api}/health`)
    assert.equal(init.method, "GET")
    assert.equal(init.credentials, "omit")
    assert.equal(init.cache, "no-store")
    assert.equal(init.headers.Authorization, undefined)
    return calls === 1 ? new Response("starting", { status: 503 }) : ready()
  }
  await Promise.all([availability.wait(), availability.wait()])
  await availability.wait()
  assert.equal(calls, 2)
  assert.deepEqual(states, [true, false])
})

test("a degraded database does not count as ready", async () => {
  let calls = 0
  globalThis.fetch = async () => ++calls === 1
    ? Response.json({ status: "degraded", database: { status: "disconnected" } }) : ready()
  await createApiAvailability(api, smallBudget).wait()
  assert.equal(calls, 2)
})

test("a stalled startup read is aborted and its total waiting budget expires", async () => {
  let aborts = 0
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => { aborts += 1; reject(new DOMException("aborted", "AbortError")) })
  })
  const availability = createApiAvailability(api, { waitMs: 35, probeMs: 15, retryMs: 1 })
  await assert.rejects(availability.wait(), /servidor está tardando/)
  assert.ok(aborts >= 1)
  assert.equal(availability.isWaiting(), false)
})

test("a failed health permission is not retried and never marks the API ready", async () => {
  let calls = 0
  globalThis.fetch = async () => { calls += 1; return new Response(null, { status: 401 }) }
  const availability = createApiAvailability(api, smallBudget)
  await assert.rejects(availability.wait(), /comprobar el servidor/)
  assert.equal(calls, 1)
  assert.equal(availability.isWaiting(), false)
})

test("local and other hosts retain their existing request behavior", async () => {
  globalThis.fetch = async () => { throw new Error("must not probe") }
  await createApiAvailability("http://localhost:3200/api").wait()
  await createApiAvailability("https://api.example.com/api").wait()
  await createApiAvailability("invalid configuration").wait()
})

test("an explicit readiness invalidation requires a new health read", async () => {
  let calls = 0
  globalThis.fetch = async () => { calls += 1; return ready() }
  const availability = createApiAvailability(api, smallBudget)
  await availability.wait()
  availability.invalidate()
  await availability.wait()
  assert.equal(calls, 2)
})

test("ready followed by rejected credentials sends login exactly once and retains its 401", async () => {
  process.env.NEXT_PUBLIC_API_URL = api
  const { waitForApiAvailability, apiAvailability, ApiError } = await import("../lib/api/client.ts")
  const { loginRequest } = await import("../lib/auth/auth-api.ts")
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push([url, init.method])
    if (url.endsWith("/health")) return ready()
    assert.equal(init.credentials, "include")
    assert.deepEqual(JSON.parse(init.body), { email: "test@example.com", password: "example-password" })
    return Response.json({ message: "Credenciales inválidas" }, { status: 401 })
  }
  apiAvailability.invalidate()
  await waitForApiAvailability()
  await assert.rejects(loginRequest({ email: "test@example.com", password: "example-password" }), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 401)
    assert.equal(error.message, "Credenciales inválidas")
    return true
  })
  assert.deepEqual(calls, [[`${api}/health`, "GET"], [`${api}/auth/login`, "POST"]])
})

test("a timed-out authentication request is cancelled once, never replayed", async () => {
  const { apiRequest, ApiError } = await import("../lib/api/client.ts")
  let calls = 0
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
    calls += 1
    init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
  })
  await assert.rejects(apiRequest("/auth/login", { method: "POST", timeoutMs: 10, body: {} }), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, null)
    return true
  })
  assert.equal(calls, 1)
})

test("gateway HTML, malformed JSON and server failures invalidate previously known availability", async () => {
  const { apiRequest, apiAvailability, waitForApiAvailability } = await import("../lib/api/client.ts")
  for (const kind of ["html", "json", "server"]) {
    const calls = []
    apiAvailability.markReady()
    globalThis.fetch = async (url) => {
      calls.push(url)
      if (url.endsWith("/health")) return ready()
      if (kind === "html") return new Response("<html>starting</html>", { headers: { "Content-Type": "text/html" } })
      if (kind === "json") return new Response("broken", { headers: { "Content-Type": "application/json" } })
      return Response.json({ message: "starting" }, { status: 503 })
    }
    if (kind === "html") await apiRequest("/auth/me")
    else await assert.rejects(apiRequest("/auth/me"))
    await waitForApiAvailability()
    assert.deepEqual(calls, [`${api}/auth/me`, `${api}/health`])
  }
})
