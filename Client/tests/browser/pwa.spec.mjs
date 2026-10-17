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

const publicRoutes = ["/", "/productos", "/nosotros", "/politicas", "/terminos", "/faq", "/contacto", "/instalar"]

async function waitForAutomaticCopy(page) {
  await expect.poll(() => page.evaluate(async routes => {
    const name = (await caches.keys()).find(key => key.startsWith("inhalex-pwa-pages-"))
    if (!name) return false
    const cache = await caches.open(name)
    const ready = await cache.match("/__pwa/pages-ready")
    if (!ready || !(await ready.json()).savedAt) return false
    return (await Promise.all(routes.map(route => cache.match(route)))).every(response => response?.ok)
  }, publicRoutes), { timeout: 60000 }).toBe(true)
}

async function homeAppearance(page) {
  await expect(page.locator("#catalogo article")).toHaveCount(2)
  await page.evaluate(() => document.fonts.ready)
  return page.evaluate(() => {
    const selectors = ["main h1", "#catalogo", "#catalogo article", "footer", "footer section:nth-of-type(2)", "footer a[href^='mailto:']"]
    const styles = selectors.map(selector => {
      const element = document.querySelector(selector)
      const css = getComputedStyle(element)
      return {
        selector,
        fontFamily: css.fontFamily,
        fontSize: css.fontSize,
        fontWeight: css.fontWeight,
        lineHeight: css.lineHeight,
        color: css.color,
        backgroundColor: css.backgroundColor,
        backgroundImage: css.backgroundImage,
        borderRadius: css.borderRadius,
        padding: css.padding,
        display: css.display,
        // Compare layout width, not a transient animation/hover transform.
        width: element.offsetWidth,
      }
    })
    return {
      styles,
      stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.href).sort(),
      // next/font local fallbacks may be touched before the webfont is ready on
      // a cold visit only; the actual Inter/Manrope faces must match offline.
      loadedFonts: [...document.fonts].filter(font => font.status === "loaded" && !/fallback/i.test(font.family)).map(font => `${font.family}:${font.weight}:${font.style}`).sort(),
    }
  })
}

test("one home visit saves the original public pages, CSS and fonts without using the download button", async ({ page, context, browser }) => {
  test.setTimeout(120000)
  const errors = []
  const documentVisits = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("request", request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentVisits.push(new URL(request.url()).pathname)
  })
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("El Respiro")
  await waitForAutomaticCopy(page)
  // Nothing was visited or downloaded manually: the first visit prepared the eight views.
  expect(documentVisits).toEqual(["/"])
  const original = await homeAppearance(page)
  expect(original.stylesheets.length).toBeGreaterThan(0)
  expect(original.loadedFonts.some(font => /inter/i.test(font))).toBe(true)
  expect(original.loadedFonts.some(font => /manrope/i.test(font))).toBe(true)
  const cachedUrls = await page.evaluate(async () => {
    const urls = []
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) urls.push(request.url)
    return urls
  })
  expect(cachedUrls.some(url => /\/_next\/static\/.*\.css(?:\?|$)/.test(url))).toBe(true)
  expect(cachedUrls.some(url => /\/_next\/static\/.*\.js(?:\?|$)/.test(url))).toBe(true)
  expect(cachedUrls.some(url => /\.woff2?(?:\?|$)/.test(url))).toBe(true)
  expect(cachedUrls.some(url => /\.mp4(?:\?|$)/.test(url))).toBe(false)
  expect(cachedUrls.some(url => /\/api\/(auth|orders|cart|notifications)(?:\/|\?|$)/.test(url))).toBe(false)
  await page.locator("#catalogo").scrollIntoViewIfNeeded()
  await page.screenshot({ path: "test-results/home-original-online.png", fullPage: true, animations: "disabled" })

  await context.setOffline(true)
  const pages = [
    { path: "/politicas", heading: "Privacidad de prueba", content: "Información pública de prueba. No contiene datos de clientes." },
    { path: "/terminos", heading: "Términos de prueba", content: "Consulta precios vigentes al reconectar." },
    { path: "/faq", heading: "Respuestas claras para navegar con mas confianza." },
    { path: "/contacto", heading: "Una entrada clara para hablar con INHALEX.", content: "Huejutla" },
  ]
  for (const view of pages) {
    await page.evaluate(() => { window.__offlineDocumentProbe = "old-document" })
    await page.locator(`footer a[href="${view.path}"]`).click()
    await expect(page).toHaveURL(view.path)
    await expect(page.getByRole("heading", { level: 1, name: view.heading })).toBeVisible()
    expect(await page.evaluate(() => window.__offlineDocumentProbe)).toBeUndefined()
    await expect(page.locator("header")).toHaveCount(1)
    await expect(page.locator("footer")).toHaveCount(1)
    if (view.content) await expect(page.locator("main")).toContainText(view.content)
    if (view.path === "/faq") {
      await page.getByRole("button", { name: "¿Puedo explorar sin conexión?" }).click()
      await expect(page.getByText("Sí, consulta la copia pública guardada.", { exact: true })).toBeVisible()
    }
  }
  await page.locator('header a[href="/nosotros"]').filter({ visible: true }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Misión, visión y valores" })).toBeVisible()
  await expect(page.locator("main")).toContainText("Acompañar tus pausas.")
  await page.goto("/productos")
  await expect(page.getByRole("heading", { name: "Lavanda", exact: true })).toBeVisible()
  await page.goto("/instalar")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Un espacio para tus aromas")
  await page.goto("/")
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toContainText("El Respiro")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Alivia")
  await expect(page.locator("#catalogo article")).toHaveCount(2)
  expect(await homeAppearance(page)).toEqual(original)
  await page.locator("#catalogo").scrollIntoViewIfNeeded()
  await page.screenshot({
    path: "test-results/home-original-offline.png", fullPage: true, animations: "disabled",
    style: 'aside[aria-label="Estado de INHALEX"] { visibility: hidden !important; }',
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: "test-results/home-original-offline-mobile.png", fullPage: true, animations: "disabled" })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.locator('footer a[href="/contacto"]').click()
  await expect(page.getByRole("heading", { level: 1, name: "Una entrada clara para hablar con INHALEX." })).toBeVisible()
  const measureOverflow = target => target.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll("body *")].filter(element => element.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 16).map(element => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 90), right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width, classes: element.className })),
  }))
  const initialMobileContact = await measureOverflow(page)
  const settle = target => target.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation => animation.finished.catch(() => {})))
  })
  await settle(page)
  const settledMobileContact = await measureOverflow(page)
  const baselineContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", baseURL: "http://localhost:43001" })
  try {
    const baselinePage = await baselineContext.newPage()
    await baselinePage.goto("/contacto")
    await expect(baselinePage.getByRole("heading", { level: 1, name: "Una entrada clara para hablar con INHALEX." })).toBeVisible()
    await settle(baselinePage)
    const onlineMobileContact = await measureOverflow(baselinePage)
    await test.info().attach("contact-mobile-layout-baseline", {
      body: JSON.stringify({ initialMobileContact, settledMobileContact, onlineMobileContact }, null, 2),
      contentType: "application/json",
    })
    // The original contact email/cards already overflow on small screens. Keep
    // that independent layout issue visible without redesigning it in a PWA fix.
    expect(settledMobileContact).toEqual(onlineMobileContact)
    if (onlineMobileContact.scrollWidth > onlineMobileContact.viewport) test.info().annotations.push({
      type: "existing-layout",
      description: `Original contact page: ${onlineMobileContact.scrollWidth}px content in a ${onlineMobileContact.viewport}px viewport, identical online/offline.`,
    })
    await baselinePage.screenshot({ path: "test-results/contact-original-online-mobile.png", fullPage: true, animations: "disabled" })
  } finally { await baselineContext.close() }
  await page.screenshot({ path: "test-results/contact-original-offline-mobile.png", fullPage: true, animations: "disabled" })
  expect(errors).toEqual([])
})

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

test("catalog search keeps the first repeated parameter online and offline without caching search URLs", async ({ page, context }) => {
  test.setTimeout(90000)
  await page.goto("/")
  await waitForAutomaticCopy(page)
  await page.goto("/productos?buscar=menta&buscar=lavanda")
  await expect(page.getByRole("heading", { name: "Menta", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Lavanda", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Quitar búsqueda menta", exact: true })).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Menta", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Lavanda", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Quitar búsqueda menta", exact: true })).toBeVisible()
  const cachedSearchUrls = await page.evaluate(async () => {
    const urls = []
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) {
        if (new URL(request.url).searchParams.has("buscar")) urls.push(request.url)
      }
    }
    return urls
  })
  expect(cachedSearchUrls).toEqual([])
})

test("saved catalog, product details, legal text and contact survive a real browser offline transition", async ({ page, context }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message))
  await save(page)
  await context.setOffline(true)
  expect(await page.evaluate(async () => {
    const response = await fetch("http://localhost:43200/api/products?limit=100&page=1", { credentials: "omit", cache: "no-store" })
    return { stale: response.headers.get("x-inhalex-offline"), count: (await response.json()).items.length }
  })).toEqual({ stale: "1", count: 2 })
  await page.goto("/offline.html")
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
  expect(urls.some(url => /\.mp4/.test(url))).toBe(false)
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

test("deleting an automatic copy keeps it deleted on the next home visit until the user saves again", async ({ page, context }) => {
  test.setTimeout(120000)
  await page.goto("/")
  await waitForAutomaticCopy(page)
  await ready(page)
  await page.getByRole("button", { name: "Eliminar información guardada" }).click()
  await page.getByRole("button", { name: "Eliminar copia", exact: true }).click()
  await expect(page.getByRole("status").filter({ hasText: "Se eliminó" })).toBeVisible()
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("El Respiro")
  await expect(page.locator("#catalogo article")).toHaveCount(2)
  const state = await page.evaluate(async () => {
    let disabled = false
    let pagesReady = false
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      const preference = await cache.match("/__pwa/auto-save")
      if (preference) disabled ||= (await preference.json()).disabled === true
      if (name.startsWith("inhalex-pwa-pages-")) pagesReady ||= Boolean(await cache.match("/__pwa/pages-ready"))
    }
    return { disabled, pagesReady }
  })
  expect(state).toEqual({ disabled: true, pagesReady: false })
  await context.setOffline(true)
  await page.goto("/offline.html")
  await expect(page.getByRole("heading", { name: "Aún no hay aromas guardados" })).toBeVisible()
  await context.setOffline(false)
  await save(page)
  await waitForAutomaticCopy(page)
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
