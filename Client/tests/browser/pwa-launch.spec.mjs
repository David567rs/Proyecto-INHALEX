import { chromium, expect, test } from "@playwright/test"

const selector = "[data-pwa-launch-splash]"
const appWindow = "data:text/html,INHALEX"

test("only a standalone launch shows the splash while the initial scripts are loading", async ({ page, baseURL }, testInfo) => {
  await page.goto("/")
  await expect(page.locator("main h1")).toContainText("El Respiro")
  await expect(page.locator(selector)).toBeHidden()

  const launchOptions = testInfo.project.use.launchOptions
  const app = await chromium.launchPersistentContext("", {
    ...launchOptions,
    channel: testInfo.project.use.channel ?? "chromium",
    headless: testInfo.project.use.headless,
    args: [...(launchOptions?.args ?? []), `--app=${appWindow}`],
    viewport: { width: 980, height: 620 },
  })
  try {
    const launch = app.pages().find(tab => tab.url() === appWindow)
    expect(launch).toBeDefined()
    expect(await launch.evaluate(() => matchMedia("(display-mode: standalone)").matches)).toBe(true)

    let releaseScripts
    const scriptsCanRun = new Promise(resolve => { releaseScripts = resolve })
    await launch.route("**/_next/static/**/*.js*", async route => {
      await scriptsCanRun
      await route.continue()
    })
    try {
      await launch.goto(baseURL, { waitUntil: "commit" })
      const splash = launch.locator(selector)
      await expect(splash).toBeVisible({ timeout: 1400 })
      await expect(splash).toHaveCSS("opacity", "1", { timeout: 1400 })
      await expect(splash).toContainText("INHALEX")
      await launch.screenshot({ path: testInfo.outputPath("splash-standalone.png") })
      // The CSS timeout must reveal the page even while JavaScript is blocked.
      await expect(splash).toHaveCSS("opacity", "0", { timeout: 3500 })
      await expect(splash).toHaveCount(1)
    } finally {
      releaseScripts()
    }

    await expect(launch.locator(selector)).toHaveCount(0)
    await expect(launch.locator("main h1")).toContainText("El Respiro")
  } finally {
    await app.close()
  }
})
