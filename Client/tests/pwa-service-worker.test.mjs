import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import vm from "node:vm"
import { test } from "node:test"
import { PUBLIC_PAGE_PATHS } from "../pwa/public-pages.mjs"

const source = await readFile(new URL("../pwa/service-worker.js", import.meta.url), "utf8")
const origin = "https://inhalex.test"
const api = "https://api.inhalex.test/api"
const json = value => Response.json(value, { headers: { "Cache-Control": "public,max-age=0,must-revalidate" } })
const request = (path, options = {}) => new Request(`${api}${path}`, { credentials: "omit", ...options })
const documentRequest = (path = "/", options = {}) => new Request(`${origin}${path}`, { credentials: "omit", ...options })
const documentResponse = (html = "<main>Original public page</main>", options = {}) => new Response(html, {
  status: options.status ?? 200,
  headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public,max-age=0,s-maxage=300",
    "X-INHALEX-Public-Page": "1",
    "X-INHALEX-PWA-Version": "test",
    ...options.headers,
  },
})

function publicFixtureResponse(req, label = "original") {
  const url = new URL(req.url)
  if (url.origin === new URL(api).origin) {
    if (url.pathname === "/api/products") return json({ items: [{ _id: "lavanda" }], total: 1, totalPages: 1 })
    if (url.pathname === "/api/products/categories") return json([])
    if (url.pathname === "/api/company-content") return json({ faqs: [] })
  }
  if (PUBLIC_PAGE_PATHS.includes(url.pathname)) return documentResponse(
    `<link rel="stylesheet" href="/_next/static/css/site.css"><script src="/_next/static/chunks/app.js"></script><main>${label}: ${url.pathname}</main><img src="/images/NuevoLogo.png">`,
  )
  if (url.pathname === "/_next/static/css/site.css") return new Response("@font-face{font-family:Inter;src:url('../media/inter.woff2')}", { headers: { "Content-Type": "text/css" } })
  if (url.pathname === "/_next/static/chunks/app.js") return new Response("/* original app */", { headers: { "Content-Type": "application/javascript" } })
  if (url.pathname === "/_next/static/media/inter.woff2") return new Response("font", { headers: { "Content-Type": "font/woff2" } })
  if (url.pathname === "/images/NuevoLogo.png") return new Response("logo", { headers: { "Content-Type": "image/png" } })
  throw new Error(`Unexpected fixture URL: ${url.href}`)
}

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
  const context = vm.createContext({ BUILD_VERSION: "test", API_BASE_URL: api, PUBLIC_PAGE_PATHS, PRECACHE_URLS: ["/offline.html", "/pwa/offline.js"], self: scope, caches, Request, Response, Headers, URL, Map, Promise, Date, AbortSignal, TextEncoder, TextDecoder, setTimeout, clearTimeout, fetch: (...args) => network(...args) })
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

test("saved documents require an anonymous allowlisted HTML response from the same build", () => {
  const sw = harness()
  for (const path of PUBLIC_PAGE_PATHS) assert.equal(sw.call("eligibleDocument", documentRequest(path), documentResponse()), true, path)
  for (const path of ["/cuenta", "/admin", "/bolsa", "/auth/login", "/politicas/otra", "/productos?buscar=private", "/?token=private"]) {
    assert.equal(sw.call("eligibleDocument", documentRequest(path), documentResponse()), false, path)
  }
  for (const options of [
    { credentials: "include" },
    { credentials: "same-origin" },
    { method: "POST", body: "{}" },
    { headers: { Authorization: "Bearer private" } },
    { headers: { Cookie: "session=private" } },
    { headers: { RSC: "1" } },
  ]) assert.equal(sw.call("eligibleDocument", documentRequest("/", options), documentResponse()), false, JSON.stringify(options))
  assert.equal(sw.call("eligibleDocument", new Request("https://external.test/", { credentials: "omit" }), documentResponse()), false)

  for (const options of [
    { status: 401 }, { status: 500 },
    { headers: { "Content-Type": "text/x-component" } },
    { headers: { "Cache-Control": "private, no-cache" } },
    { headers: { "Cache-Control": "public, no-store" } },
    { headers: { "X-INHALEX-Public-Page": "0" } },
    { headers: { "X-INHALEX-PWA-Version": "old-build" } },
    { headers: { "Set-Cookie": "session=private" } },
    { headers: { Vary: "Cookie" } },
    { headers: { Vary: "Authorization" } },
    { headers: { Vary: "*" } },
  ]) assert.equal(sw.call("eligibleDocument", documentRequest(), documentResponse(undefined, options)), false, JSON.stringify(options))
  for (const header of ["X-INHALEX-Public-Page", "X-INHALEX-PWA-Version"]) {
    const response = documentResponse(); response.headers.delete(header)
    assert.equal(sw.call("eligibleDocument", documentRequest(), response), false, header)
  }
  for (const [property, value] of [["redirected", true], ["type", "opaque"]]) {
    const response = documentResponse(); Object.defineProperty(response, property, { value })
    assert.equal(sw.call("eligibleDocument", documentRequest(), response), false, property)
  }
})

test("document dependencies allow local original assets but exclude videos, APIs and external URLs", () => {
  const sw = harness()
  for (const path of ["/_next/static/chunks/app.js", "/_next/static/css/site.css", "/_next/static/media/inter.woff2", "/_next/static/media/inter.woff", "/images/NuevoLogo.png", "/aromas/lavanda.webp", "/products/menta.jpg", "/L%C3%ADneas/verde.webp", "/pwa/icon.svg"]) {
    assert.equal(sw.call("publicAsset", path), `${origin}${path}`, path)
  }
  assert.equal(sw.call("publicAsset", "../media/inter.woff2", `${origin}/_next/static/css/site.css`), `${origin}/_next/static/media/inter.woff2`)
  assert.equal(sw.call("publicAsset", "/_next/static/chunks/app.js?dpl=one&amp;dpl=two"), `${origin}/_next/static/chunks/app.js?dpl=one&dpl=two`)
  for (const value of ["https://external.test/site.css", "//external.test/images/logo.png", "data:image/png;base64,AA", "javascript:alert(1)", "/videos/Aplicar.mp4", "/api/products", "/cuenta", "/_next/static/chunks/app.js?token=secret", "/_next/static/chunks/app.js#fragment", "/images/NuevoLogo.png?token=secret", "/_next/static/source.map", `https://user:password@inhalex.test/images/logo.png`]) {
    assert.equal(sw.call("publicAsset", value), null, value)
  }
  const urls = Array.from(sw.call("documentAssets", `
    <link href="/_next/static/css/site.css"><script src='/_next/static/chunks/app.js'></script>
    <img src="/images/NuevoLogo.png"><img src="/images/NuevoLogo.png">
    <video poster="/images/modo-de-uso.webp"><source src="/videos/Aplicar.mp4"></video>
    <a href="/cuenta">Private</a><script src="https://external.test/x.js"></script><img src="/api/avatar">
  `))
  assert.deepEqual(urls, ["/_next/static/css/site.css", "/_next/static/chunks/app.js", "/images/NuevoLogo.png", "/images/modo-de-uso.webp"].map(path => `${origin}${path}`))
})

test("preparation saves all original pages and their CSS font dependencies once for concurrent callers", async () => {
  const sw = harness(), requests = []
  sw.setNetwork(async req => { requests.push(req); return publicFixtureResponse(req) })
  const results = await Promise.all([sw.call("preparePublicContent", true), sw.call("preparePublicContent", true), sw.call("preparePublicContent", true)])
  assert.equal(results.every(result => result.products.length === 1), true)
  assert.equal(requests.filter(req => new URL(req.url).pathname === "/api/products").length, 1)
  for (const route of PUBLIC_PAGE_PATHS) {
    assert.equal(requests.filter(req => req.url === `${origin}${route}`).length, 1, route)
    const page = await sw.call("savedPage", new URL(route, origin))
    assert.equal(await page.text(), await publicFixtureResponse(documentRequest(route)).text())
    assert.equal(Number.isFinite(Date.parse(page.headers.get("x-inhalex-saved-at"))), true)
  }
  assert.equal(requests.every(req => req.credentials === "omit"), true)
  assert.equal(requests.filter(req => req.url === `${origin}/_next/static/media/inter.woff2`).length, 1)
  const assets = await sw.caches.open("inhalex-pwa-assets-test")
  assert.equal((await assets.keys()).length, 4)
  const count = requests.length
  assert.equal(await sw.call("preparePublicContent", true), null)
  assert.equal(requests.length, count, "fresh automatic preparation must not download again")
})

test("clearing public content opts out of automatic saving until an explicit manual download", async () => {
  const sw = harness()
  let requests = 0
  sw.setNetwork(async req => { requests++; return publicFixtureResponse(req) })
  await sw.call("preparePublicContent", true)
  await sw.emit("message", { source: { url: `${origin}/instalar` }, data: { type: "CLEAR_PUBLIC_CONTENT" }, ports: [] })
  assert.equal(sw.cacheMap.has("inhalex-pwa-pages-test"), false)
  assert.equal(sw.cacheMap.has("inhalex-pwa-assets-test"), false)
  const previous = requests
  assert.equal(await sw.call("preparePublicContent", true), null)
  assert.equal(requests, previous)
  const preferences = await sw.caches.open("inhalex-pwa-preferences-v1")
  assert.deepEqual(await (await preferences.match(`${origin}/__pwa/auto-save`)).json(), { disabled: true })
  assert.equal((await sw.call("preparePublicContent", false)).products.length, 1)
  assert.equal(await preferences.match(`${origin}/__pwa/auto-save`), undefined)
  assert.notEqual(await sw.call("savedPage", new URL("/politicas", origin)), null)
})

test("failed documents or dependencies keep previously complete original pages unchanged", async () => {
  const sw = harness()
  sw.setNetwork(async req => publicFixtureResponse(req, "previous"))
  await sw.call("preparePublicContent", false)
  const pages = await sw.caches.open("inhalex-pwa-pages-test")
  const previousReady = await (await pages.match(`${origin}/__pwa/pages-ready`)).text()
  for (const failingPath of ["/terminos", "/_next/static/media/inter.woff2"]) {
    sw.setNetwork(async req => new URL(req.url).pathname === failingPath ? new Response("unavailable", { status: 503 }) : publicFixtureResponse(req, "must-not-replace"))
    await assert.rejects(sw.call("preparePublicContent", false))
    for (const route of PUBLIC_PAGE_PATHS) assert.match(await (await pages.match(`${origin}${route}`)).text(), /previous:/)
    assert.equal(await (await pages.match(`${origin}/__pwa/pages-ready`)).text(), previousReady)
  }
})

test("clearing cancels a pending page preparation without recreating documents or assets", async () => {
  const sw = harness()
  let finishFont, markStarted
  const fontStarted = new Promise(resolve => { markStarted = resolve })
  sw.setNetwork(async req => {
    if (new URL(req.url).pathname === "/_next/static/media/inter.woff2") {
      markStarted()
      return new Promise(resolve => { finishFont = () => resolve(publicFixtureResponse(req)) })
    }
    return publicFixtureResponse(req)
  })
  const preparation = assert.rejects(sw.call("preparePublicContent", true))
  await fontStarted
  await sw.emit("message", { source: { url: `${origin}/instalar` }, data: { type: "CLEAR_PUBLIC_CONTENT" }, ports: [] })
  finishFont()
  await preparation
  for (const name of ["inhalex-pwa-public-v1", "inhalex-pwa-images-v1", "inhalex-pwa-pages-test", "inhalex-pwa-assets-test"]) assert.equal(sw.cacheMap.has(name), false, name)
  assert.equal(await sw.call("preparePublicContent", true), null)
})

test("product searches reuse only the base saved document without persisting search queries", async () => {
  const sw = harness()
  let requests = 0
  sw.setNetwork(async req => { requests++; return publicFixtureResponse(req) })
  await sw.call("preparePublicContent", true)
  const pages = await sw.caches.open("inhalex-pwa-pages-test")
  const keysBefore = (await pages.keys()).map(key => key.url)
  const originalHtml = await (await pages.match(`${origin}/productos`)).text()
  const requestsBefore = requests

  for (const path of ["/productos?buscar=private-search", "/productos?buscar=lavanda&buscar=menta", "/productos?buscar="]) {
    const response = await sw.call("savedPage", new URL(path, origin))
    assert.notEqual(response, null, path)
    assert.equal(await response.text(), originalHtml)
    assert.equal(sw.call("eligibleDocument", documentRequest(path), documentResponse()), false, "query-bearing documents remain ineligible for storage")
  }
  for (const url of [
    `${origin}/politicas?buscar=private-search`,
    `${origin}/?buscar=private-search`,
    `${origin}/productos?token=secret`,
    `${origin}/productos?buscar=lavanda&page=2`,
    `${origin}/cuenta?buscar=private-search`,
    "https://external.test/productos?buscar=private-search",
  ]) assert.equal(await sw.call("savedPage", new URL(url)), null, url)

  assert.equal(requests, requestsBefore, "reading the saved base document must not issue a request")
  assert.deepEqual((await pages.keys()).map(key => key.url), keysBefore)
  assert.equal(keysBefore.some(key => new URL(key).search), false)
  assert.equal(originalHtml.includes("private-search"), false)
})

test("previously installed PWA launch URLs reuse the original home without saving query keys", async () => {
  const sw = harness()
  let requests = 0
  sw.setNetwork(async req => { requests++; return publicFixtureResponse(req) })
  await sw.call("preparePublicContent", true)
  const pages = await sw.caches.open("inhalex-pwa-pages-test")
  const keysBefore = (await pages.keys()).map(key => key.url)
  const originalHtml = await (await pages.match(`${origin}/`)).text()
  const requestsBefore = requests
  const response = await sw.call("savedPage", new URL("/?source=pwa", origin))

  assert.notEqual(response, null)
  assert.equal(await response.text(), originalHtml)
  assert.equal(sw.call("eligibleDocument", documentRequest("/?source=pwa"), documentResponse()), false, "legacy launch query is a read-only alias, never a cacheable document")
  for (const url of [
    `${origin}/?source=other`,
    `${origin}/?source=pwa&token=secret`,
    `${origin}/?source=pwa&source=pwa`,
    `${origin}/?token=secret`,
    `${origin}/contacto?source=pwa`,
    `${origin}/productos?source=pwa`,
    "https://external.test/?source=pwa",
  ]) assert.equal(await sw.call("savedPage", new URL(url)), null, url)

  assert.equal(requests, requestsBefore)
  assert.deepEqual((await pages.keys()).map(key => key.url), keysBefore)
  assert.equal(keysBefore.some(key => new URL(key).search), false)
})
