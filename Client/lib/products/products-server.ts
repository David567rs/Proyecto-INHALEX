import "server-only"

import type { Product } from "@/lib/types/product"
import { mapApiProduct, type ProductApiItem } from "./products-api"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"

interface ProductsListResponse {
  items: ProductApiItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function fetchCatalogProductsServer(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/products?limit=100&page=1`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("No se pudo cargar el catalogo")
  }

  const payload = (await response.json()) as ProductsListResponse
  return payload.items.map(mapApiProduct)
}

export async function fetchProductBySlugServer(slugOrId: string): Promise<Product | null> {
  const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(slugOrId)}`, {
    cache: "no-store",
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error("No se pudo cargar el producto")
  }

  const payload = (await response.json()) as ProductApiItem
  return mapApiProduct(payload)
}

