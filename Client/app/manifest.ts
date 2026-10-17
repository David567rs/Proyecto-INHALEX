import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "INHALEX · Aromas para tu día",
    short_name: "INHALEX",
    description: "Explora nuestros aromas y consulta tu catálogo guardado sin conexión.",
    lang: "es-MX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7faf7",
    theme_color: "#165c35",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Explorar aromas", url: "/productos", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Catálogo guardado", url: "/productos" },
      { name: "Contacto", url: "/contacto" },
    ],
  }
}
