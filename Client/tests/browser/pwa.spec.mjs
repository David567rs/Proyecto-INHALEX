import { expect, test } from "@playwright/test"

async function ready(page) {
  await page.goto("/instalar")
  await expect(page.getByRole("button", { name: "Guardar catálogo y ayuda" })).toBeEnabled()
}
async function save(page) {
  await ready(page)
  await page.getByRole("button", { name: "Guardar catálogo y ayuda" }).click()
  await expect(page.getByRole("status").filter({ hasText: "2 aromas" })).toBeVisible()
}

test("manifest, icon sizes, one shared shell and the download controls are valid", async ({ page, request }) => {
  const response = await request.get("/manifest.webmanifest")
  const manifest = await response.json()
  expect(manifest.id).toBe("/")
  expect(manifest.scope).toBe("/")
  expect(manifest.display).toBe("standalone")
  expect(manifest.icons.some(icon => icon.sizes === "512x512" && icon.purpose === "maskable")).toBe(true)
  const sw = await request.get("/sw.js")
  expect(sw.headers()["cache-control"]).toContain("no-store")
  expect(await sw.text()).toContain("http://localhost:43200/api")
  await ready(page)
  await expect(page.locator("header")).toHaveCount(1)
  await expect(page.locator("footer")).toHaveCount(1)
  expect(await page.evaluate(async () => {
    const img = new Image(); img.src = "/pwa/icon-maskable-512.png"; await img.decode(); return [img.naturalWidth, img.naturalHeight]
  })).toEqual([512, 512])
  await page.screenshot({ path: "test-results/install-desktop.png", fullPage: true })
})

test("saved catalog, product details, legal text and contact survive a real browser offline transition", async ({ page, context }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message))
  await save(page)
  await context.setOffline(true)
  expect(await page.evaluate(async () => {
    const response = await fetch("http://localhost:43200/api/products?limit=100&page=1", { credentials: "omit", cache: "no-store" })
    return { stale: response.headers.get("x-inhalex-offline"), count: (await response.json()).items.length }
  })).toEqual({ stale: "1", count: 2 })
  await page.goto("/productos")
  await expect(page.getByRole("heading", { name: "Lavanda", exact: true })).toBeVisible()
  await page.getByLabel("Busca tu aroma", { exact: true }).fill("menta")
  await expect(page.getByRole("heading", { name: "Menta", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Lavanda", exact: true })).toHaveCount(0)
  await page.locator("button.product").click()
  await expect(page.getByRole("dialog")).toContainText("Los pedidos necesitan conexión")
  await page.getByRole("button", { name: "Cerrar detalle" }).click()
  await page.getByRole("button", { name: "Privacidad", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Privacidad de prueba" })).toBeVisible()
  await expect(page.locator("#content-date")).toContainText("Copia guardada")
  await page.getByRole("button", { name: "Contacto", exact: true }).click()
  await expect(page.locator("#content-body")).toContainText("Huejutla")
  await page.getByRole("button", { name: "Aromas", exact: true }).click()
  await page.getByLabel("Busca tu aroma", { exact: true }).fill("")
  await page.screenshot({ path: "test-results/offline-desktop.png", fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: "test-results/offline-mobile.png", fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test("private routes fall back safely and their API responses never enter Cache Storage", async ({ page, context }) => {
  await save(page)
  await page.evaluate(async () => {
    await fetch("http://localhost:43200/api/auth/me", { credentials: "include" })
    await fetch("http://localhost:43200/api/orders", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" })
  })
  await context.setOffline(true)
  await page.goto("/cuenta")
  await expect(page.locator("#private-notice")).toBeVisible()
  const urls = await page.evaluate(async () => {
    const result = []
    for (const name of await caches.keys()) for (const key of await (await caches.open(name)).keys()) result.push(key.url)
    return result
  })
  expect(urls.some(url => /\/api\/(auth|orders|cart|notifications)/.test(url))).toBe(false)
  expect(urls.some(url => /\/(cuenta|admin|bolsa)(\/|$)/.test(new URL(url).pathname))).toBe(false)
  expect(urls.some(url => /\.mp4|L%C3%ADneas/.test(url))).toBe(false)
})

test("first-use empty state and clear-copy flow do not pretend to have downloaded data", async ({ page, context }) => {
  await ready(page)
  await page.getByRole("button", { name: "Eliminar información guardada" }).click()
  await page.getByRole("button", { name: "Eliminar copia", exact: true }).click()
  await expect(page.getByRole("status").filter({ hasText: "Se eliminó" })).toBeVisible()
  await context.setOffline(true)
  await page.goto("/offline.html")
  await expect(page.getByRole("heading", { name: "Aún no hay aromas guardados" })).toBeVisible()
})

test("voice search needs an explicit click and feeds the existing search without navigation", async ({ page }) => {
  await page.addInitScript(() => {
    window.__voiceStarted = 0
    window.SpeechRecognition = class {
      start() {
        window.__voiceStarted++
        setTimeout(() => { this.onstart?.(); this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "busca aroma de lavanda" } }] }) }, 50)
      }
      stop() {}
      abort() {}
    }
  })
  await ready(page)
  await page.getByRole("button", { name: "Abrir búsqueda por voz", exact: true }).filter({ visible: true }).click()
  await expect(page.getByText("Al activar el micrófono, tu navegador puede enviar el audio", { exact: false })).toBeVisible()
  expect(await page.evaluate(() => window.__voiceStarted)).toBe(0)
  await page.getByRole("button", { name: "Activar micrófono para buscar un aroma" }).click()
  await expect(page.locator('input[value="lavanda"]')).toBeVisible()
  expect(page.url()).toContain("/instalar")
  expect(await page.evaluate(() => window.__voiceStarted)).toBe(1)
  await page.screenshot({ path: "test-results/voice-desktop.png", fullPage: true, animations: "disabled" })
})

test("a waiting worker keeps the current page until the user accepts the update", async ({ page }) => {
  await ready(page)
  await page.evaluate(async () => {
    window.__unsavedPwaTest = "keep-this-page"
    // A different script URL exercises the real browser update lifecycle without changing files.
    await navigator.serviceWorker.register("/sw.js?pwa-test=next", { scope: "/", updateViaCache: "none" })
  })
  await expect(page.getByRole("button", { name: "Actualizar ahora", exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.__unsavedPwaTest)).toBe("keep-this-page")
  await Promise.all([
    page.waitForEvent("framenavigated", { predicate: frame => frame === page.mainFrame() }),
    page.getByRole("button", { name: "Actualizar ahora", exact: true }).click(),
  ])
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Un espacio para tus aromas")
  expect(await page.evaluate(() => window.__unsavedPwaTest)).toBeUndefined()
})
