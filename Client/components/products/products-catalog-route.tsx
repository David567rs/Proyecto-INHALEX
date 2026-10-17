"use client"

import { useSearchParams } from "next/navigation"
import { ProductsCatalogPage } from "@/components/products/products-catalog-page"

export function ProductsCatalogRoute() {
  const searchParams = useSearchParams()

  // Keep searches client-side so the saved document never contains a visitor's
  // query. URLSearchParams.get preserves the first-value behavior of the route.
  return <ProductsCatalogPage initialSearchQuery={searchParams.get("buscar") ?? ""} />
}
