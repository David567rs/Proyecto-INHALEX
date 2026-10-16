import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://localhost:43001", viewport: { width: 1440, height: 1000 }, serviceWorkers: "allow", trace: "retain-on-failure" },
  webServer: [
    { command: `"${process.execPath}" tests/fixtures/pwa-api.mjs`, url: "http://localhost:43200/api/health", reuseExistingServer: false },
    { command: `"${process.execPath}" node_modules/next/dist/bin/next start -p 43001`, url: "http://localhost:43001/instalar", reuseExistingServer: false, timeout: 60000, env: { NEXT_PUBLIC_API_URL: "http://localhost:43200/api" } },
  ],
})
