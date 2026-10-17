import type { Metadata } from "next"
import { Suspense } from "react"
import { ProductsCatalogPage } from "@/components/products/products-catalog-page"
import { ProductsCatalogRoute } from "@/components/products/products-catalog-route"

export const metadata: Metadata = {
  title: "Catálogo de inhaladores | INHALEX",
  description:
    "Explora el catálogo completo de inhaladores aromáticos INHALEX por línea, aroma, disponibilidad y precio.",
}

export default function ProductosPage() {
  return (
    <Suspense fallback={<ProductsCatalogPage />}>
      <ProductsCatalogRoute />
    </Suspense>
  )
}
