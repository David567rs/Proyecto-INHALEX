import type { Product } from "@/lib/types/product"

const AROMA_IMAGE_BY_KEY: Record<string, string> = {
  anis: "/aromas/anis.jpeg",
  "anis-estrella": "/aromas/anis.jpeg",
  bugambilia: "/aromas/bugambilia.jpeg",
  cafe: "/aromas/cafe.jpeg",
  canela: "/aromas/canela.jpeg",
  copal: "/aromas/copal.jpeg",
  eucalipto: "/aromas/eucalipto.jpeg",
  hierbabuena: "/aromas/hierbabuena.jpeg",
  jengibre: "/aromas/jengibre.jpeg",
  lavanda: "/aromas/lavanda.jpeg",
  manzanilla: "/aromas/manzanilla.jpeg",
  menta: "/aromas/menta.jpeg",
  mirra: "/aromas/mirra.jpeg",
  "mirra-azafran": "/aromas/mirra.jpeg",
  "mirra-y-azafran": "/aromas/mirra.jpeg",
  rosas: "/aromas/rosas.jpeg",
  "rosas-castilla": "/aromas/rosas.jpeg",
  "rosas-de-castilla": "/aromas/rosas.jpeg",
  toronjil: "/aromas/toronjil.jpeg",
  vaporub: "/aromas/vaporub.jpeg",
}

const PRODUCT_COLLECTION_IMAGE_BY_KEY: Record<string, string> = {
  anis: "/products/anis-estrella.jpg",
  "anis-estrella": "/products/anis-estrella.jpg",
  bugambilia: "/products/bugambilia.jpg",
  cafe: "/products/cafe.jpg",
  canela: "/products/canela.jpg",
  copal: "/products/copal.jpg",
  eucalipto: "/products/eucalipto.jpg",
  hierbabuena: "/products/hierbabuena.jpg",
  jengibre: "/products/jengibre.jpg",
  lavanda: "/products/lavanda.jpg",
  manzanilla: "/products/manzanilla.jpg",
  menta: "/products/menta.jpg",
  mirra: "/products/mirra-azafran.jpg",
  "mirra-azafran": "/products/mirra-azafran.jpg",
  "mirra-y-azafran": "/products/mirra-azafran.jpg",
  romero: "/products/romero.jpg",
  rosas: "/products/rosas-castilla.jpg",
  "rosas-castilla": "/products/rosas-castilla.jpg",
  "rosas-de-castilla": "/products/rosas-castilla.jpg",
  toronjil: "/products/toronjil.jpg",
  vaporub: "/products/vaporub.jpg",
}

const AROMA_IMAGE_POSITION_BY_KEY: Record<string, string> = {
  anis: "center 59%",
  "anis-estrella": "center 59%",
  bugambilia: "center 58%",
  cafe: "center 58%",
  canela: "center 58%",
  copal: "center 59%",
  eucalipto: "center 60%",
  hierbabuena: "center 60%",
  jengibre: "center 59%",
  lavanda: "center 61%",
  manzanilla: "center 60%",
  menta: "center 60%",
  mirra: "center 58%",
  "mirra-azafran": "center 58%",
  "mirra-y-azafran": "center 58%",
  rosas: "center 58%",
  "rosas-castilla": "center 58%",
  "rosas-de-castilla": "center 58%",
  toronjil: "center 61%",
  vaporub: "center 61%",
  "linea-insomnio": "center 61%",
  "linea-ansiedad-estres": "center 58%",
  "linea-resfriado": "center 60%",
  "linea-verde": "center 60%",
  "linea-estimulante": "center 58%",
}

const DEFAULT_MODAL_IMAGE_POSITION = "center 60%"

function normalizeKey(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function resolveProductDisplayImage(
  product: Pick<Product, "slug" | "name" | "aromas" | "image">
): string {
  const candidates = [product.slug, product.name, ...(product.aromas ?? [])]

  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate)
    const mappedImage = AROMA_IMAGE_BY_KEY[normalized]

    if (mappedImage) {
      return mappedImage
    }
  }

  return product.image || "/placeholder.svg"
}

export function resolveProductCollectionImage(
  product: Pick<Product, "slug" | "name" | "aromas" | "image">
): string {
  const candidates = [product.slug, product.name, ...(product.aromas ?? [])]

  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate)
    const mappedImage = PRODUCT_COLLECTION_IMAGE_BY_KEY[normalized]

    if (mappedImage) {
      return mappedImage
    }
  }

  return resolveProductDisplayImage(product)
}

export function resolveProductImagePosition(
  product: Pick<Product, "slug" | "name" | "aromas" | "category">,
  options?: { surface?: "default" | "modal" }
): string {
  if (options?.surface === "modal") {
    return DEFAULT_MODAL_IMAGE_POSITION
  }

  const candidates = [product.slug, product.name, product.category, ...(product.aromas ?? [])]

  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate)
    const mappedPosition = AROMA_IMAGE_POSITION_BY_KEY[normalized]

    if (mappedPosition) {
      return mappedPosition
    }
  }

  return "center 59%"
}
