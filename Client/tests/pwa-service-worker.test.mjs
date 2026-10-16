import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import { test } from "node:test"

const source = await readFile(new URL("../pwa/service-worker.js", import.meta.url), "utf8")
const origin = "https://inhalex.test"
const api = "https://api.inhalex.test/api"
const json = value => Response.json(value, { headers: { "Cache-Control": "public,max-age=0,must-revalidate" } })
const request = (path, options = {}) => new Request(`${api}${path}`, { credentials: "omit", ...options })

function harness() {
  const handlers = new Map(), cacheMap = new Map(), messages = [], notices = []
  let network = async () => { throw new TypeError("offline") }
  let quota = false
  const key = item => typeof item === "string" ? new URL(item, origin).href : item.url
  const caches = {
    async open(name) {
      if (!cacheMap.has(name)) cacheMap.set(name, new Map())
      const entries = cacheMap.get(name)
      return {
        async put(input, response) { if (quota) throw new Error("quota"); entries.set(key(input), { request: typeof input === "string" ? new Request(key(input)) : input, response: response.clone() }) },
        async match(input) { return entries.get(key(input))?.response.clone() },
        async keys() { return [...entries.values()].map(entry => entry.request) },
        async delete(input) { return entries.delete(key(input)) },
        async addAll(urls) { for (const url of urls) entries.set(key(url), { request: url, response: new Response("shell") }) },
      }
    },
    async keys() { return [...cacheMap.keys()] },
    async delete(name) { return cacheMap.delete(name) },
  }
  const scope = { location: { origin }, clients: { get: async () => ({ postMessage: value => messages.push(value) }), claim: async () => {}, matchAll: async () => [], openWindow: async url => messages.push(url) }, registration: { showNotification: async (...args) => notices.push(args), getNotifications: async () => [] }, addEventListener: (name, handler) => handlers.set(name, handler), skipWaiting: async () => messages.push("skipWaiting") }
  const context = vm.createContext({ BUILD_VERSION: "test", API_BASE_URL: api, PRECACHE_URLS: ["/offline.html", "/pwa/offline.js"], self: scope, caches, Request, Response, Headers, URL, Map, Promise, Date, AbortSignal, setTimeout, clearTimeout, fetch: (...args) => network(...args) })
  vm.runInContext(source, context)
  const call = (name, ...args) => { context.args = args; return vm.runInContext(`${name}(...args)`, context) }
  async function emit(name, fields = {}) {
    const promises = []
    let response
    handlers.get(name)({ ...fields, waitUntil: promise => promises.push(promise), respondWith: promise => { response = Promise.resolve(promise) } })
    const result = response ? await response : undefined
    await Promise.all(promises)
    return result
  }
  return { call, emit, caches, cacheMap, messages, notices, setNetwork: handler => { network = handler }, setQuota: value => { quota = value } }
}

test("only anonymous allowlisted public reads are cache candidates", () => {
  const sw = harness()
  for (const route of ["/products?limit=100&page=1", "/products/categories", "/company-content"]) assert.equal(sw.call("eligiblePublicRequest", request(route)), true)
  for (const route of ["/auth/me", "/cart", "/orders", "/admin/products", "/notifications", "/products?q=private-search", "/products?limit=999", "/products?page=11", "/company-content?token=secret"]) assert.equal(sw.call("eligiblePublicRequest", request(route)), false, route)
  assert.equal(sw.call("eligiblePublicRequest", request("/products", { credentials: "include" })), false)
  assert.equal(sw.call("eligiblePublicRequest", request("/products", { headers: { Authorization: "Bearer secret" } })), false)
  assert.equal(sw.call("eligiblePublicRequest", request("/products", { method: "POST", body: "{}" })), false)
  assert.equal(sw.call("eligiblePublicRequest", new Request("https://other.test/api/products", { credentials: "omit" })), false)
})

test("private, no-store, non-JSON, failed and oversized responses never persist", async () => {
  const sw = harness(), req = request("/products")
  for (const response of [Response.json({}, { headers: { "Cache-Control": "private,no-store" } }), Response.json({}), new Response("html", { headers: { "Cache-Control": "public" } }), Response.json({}, { status: 401 }), Response.json({}, { headers: { "Cache-Control": "public", Vary: "Authorization" } }), json({ value: "x".repeat(2 * 1024 * 1024) })]) assert.equal(await sw.call("storePublic", req, response), false)
  assert.equal(await sw.call("storePublic", req, json({ items: [] })), true)
})

test("offline reads return a dated public copy and notify the page", async () => {
  const sw = harness(), req = request("/products?limit=100&page=1")
  await sw.call("storePublic", req, json({ items: [{ _id: "lavanda" }] }))
  const response = await sw.emit("fetch", { request: req, clientId: "test" })
  assert.equal(response.headers.get("x-inhalex-offline"), "1")
  assert.equal((await response.json()).items[0]._id, "lavanda")
  assert.equal(sw.messages.at(-1).type, "PWA_PUBLIC_STALE")
})

test("401 does not turn into stale success; quota failure does not break live API", async () => {
  const sw = harness(), req = request("/products")
  await sw.call("storePublic", req, json({ items: [] }))
  sw.setNetwork(async () => new Response("denied", { status: 401 }))
  assert.equal((await sw.emit("fetch", { request: req })).status, 401)
  sw.setQuota(true); sw.setNetwork(async () => json({ items: [{ _id: "live" }] }))
  assert.equal((await (await sw.emit("fetch", { request: req })).json()).items[0]._id, "live")
})

test("expired API entries are removed and cannot become an offline response", async () => {
  const sw = harness(), req = request("/products")
  const cache = await sw.caches.open("inhalex-pwa-public-v1")
  await cache.put(req, Response.json({}, { headers: { "x-inhalex-saved-at": "2001-01-01" } }))
  assert.equal(await sw.call("savedResponse", req), null)
  assert.equal((await cache.keys()).length, 0)
})

test("completed download replaces catalog and removes deleted products from snapshot", async () => {
  const sw = harness()
  let items = [{ _id: "keep" }, { _id: "removed" }]
  sw.setNetwork(async req => new URL(req.url).pathname.endsWith("/products") ? json({ items, total: items.length, totalPages: 1 }) : json({ faqs: [] }))
  await sw.call("savePublicContent")
  items = [{ _id: "keep" }]
  await sw.call("savePublicContent")
  const saved = await sw.call("snapshot")
  assert.deepEqual(saved.products.map(item => item._id), ["keep"])
  sw.setNetwork(async () => { throw new TypeError("offline") })
  await assert.rejects(sw.call("savePublicContent"))
  assert.equal((await sw.call("snapshot")).products.length, 1)
})

test("private navigation uses the safe offline shell without caching HTML; mutations bypass", async () => {
  const sw = harness()
  await sw.emit("install")
  const req = { method: "GET", headers: new Headers(), url: `${origin}/cuenta`, credentials: "include", mode: "navigate" }
  assert.equal(await (await sw.emit("fetch", { request: req })).text(), "shell")
  assert.equal(await sw.emit("fetch", { request: request("/orders", { method: "POST" }) }), undefined)
  assert.equal(sw.cacheMap.has("inhalex-pwa-public-v1"), false)
  for (const entries of sw.cacheMap.values()) assert.equal(entries.has(`${origin}/cuenta`), false)
})

test("activation only removes this app's obsolete caches and update requires a message", async () => {
  const sw = harness()
  await sw.caches.open("another-app-cache"); await sw.caches.open("inhalex-pwa-shell-old")
  await sw.emit("install"); assert.equal(sw.messages.includes("skipWaiting"), false)
  await sw.emit("activate")
  assert.equal(sw.cacheMap.has("another-app-cache"), true)
  assert.equal(sw.cacheMap.has("inhalex-pwa-shell-old"), false)
  await sw.emit("message", { source: { url: `${origin}/instalar` }, data: { type: "SKIP_WAITING" } })
  assert.equal(sw.messages.includes("skipWaiting"), true)
})

test("push requires current opt-in; payload cannot insert PII or an external click target", async () => {
  const sw = harness()
  await sw.emit("push"); assert.equal(sw.notices.length, 0)
  await sw.emit("message", { source: { url: `${origin}/cuenta` }, data: { type: "PUSH_ENABLED" }, ports: [] })
  await sw.emit("push", { data: { json: () => ({ title: "PRIVATE", url: "https://evil.test" }) } })
  assert.equal(sw.notices[0][0], "INHALEX")
  assert.equal(sw.notices[0][1].data.url, "/cuenta")
  await sw.emit("message", { source: { url: `${origin}/cuenta` }, data: { type: "PUSH_DISABLED" }, ports: [] })
  await sw.emit("push"); assert.equal(sw.notices.length, 1)
})

test("clearing in another tab cancels an in-flight download instead of recreating the copy", async () => {
  const sw = harness()
  let finish
  sw.setNetwork(() => new Promise(resolve => { finish = resolve }))
  const saving = assert.rejects(sw.call("savePublicContent"))
  await sw.emit("message", { source: { url: `${origin}/instalar` }, data: { type: "CLEAR_PUBLIC_CONTENT" }, ports: [] })
  finish(json({ items: [{ _id: "must-not-return" }], total: 1, totalPages: 1 }))
  await saving
  assert.equal((await sw.call("snapshot")).products.length, 0)
})

test("concurrent push consent updates preserve the latest disable intent", async () => {
  const sw = harness()
  await Promise.all([
    sw.emit("message", { source: { url: `${origin}/cuenta` }, data: { type: "PUSH_ENABLED" }, ports: [] }),
    sw.emit("message", { source: { url: `${origin}/cuenta` }, data: { type: "PUSH_DISABLED" }, ports: [] }),
  ])
  await sw.emit("push")
  assert.equal(sw.notices.length, 0)
})
