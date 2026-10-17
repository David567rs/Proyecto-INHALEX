import { readFileSync } from "node:fs"
import { PUBLIC_PAGE_PATHS } from "./pwa/public-pages.mjs"

let pwaVersion = null
try {
  const build = JSON.parse(readFileSync(new URL("./public/pwa-build.json", import.meta.url), "utf8"))
  if (typeof build.version !== "string" || !/^[a-f0-9]{16}$/.test(build.version)) {
    throw new Error("public/pwa-build.json must contain a valid PWA build version")
  }
  pwaVersion = build.version
} catch (error) {
  if (error.code !== "ENOENT") throw error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      ...PUBLIC_PAGE_PATHS.map(source => ({
        source,
        headers: [
          { key: "X-INHALEX-Public-Page", value: "1" },
          ...(pwaVersion ? [{ key: "X-INHALEX-PWA-Version", value: pwaVersion }] : []),
        ],
      })),
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; connect-src 'self' https: http://localhost:* http://127.0.0.1:*" },
        ],
      },
      {
        source: "/offline.html",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ]
  },
}

export default nextConfig
