import type { Metadata } from "next"
import { ProductsCatalogPage } from "@/components/products/products-catalog-page"

export const metadata: Metadata = {
  title: "Catálogo de inhaladores | INHALEX",
  description:
    "Explora el catálogo completo de inhaladores aromáticos INHALEX por línea, aroma, disponibilidad y precio.",
}

interface ProductosPageProps {
  searchParams: Promise<{
    buscar?: string | string[]
  }>
}

export default async function ProductosPage({
  searchParams,
}: ProductosPageProps) {
  const params = await searchParams
  const searchValue = Array.isArray(params.buscar)
    ? params.buscar[0]
    : params.buscar

  return <ProductsCatalogPage initialSearchQuery={searchValue ?? ""} />
}
