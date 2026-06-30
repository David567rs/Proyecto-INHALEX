import type { Product } from "@/lib/types/product"

export function hasActiveProductOffer(product: Product): boolean {
  const endsAt = product.promoEndsAt ? new Date(product.promoEndsAt) : null
  const isCurrent =
    !endsAt || Number.isNaN(endsAt.getTime()) || endsAt.getTime() >= Date.now()

  return Boolean(
    product.promoActive &&
      isCurrent &&
      typeof product.promoPrice === "number" &&
      product.promoPrice > 0 &&
      product.promoPrice < product.price,
  )
}

export function getProductDisplayPrice(product: Product): number {
  return hasActiveProductOffer(product) ? product.promoPrice! : product.price
}

export function getProductOfferLabel(product: Product): string {
  return product.promoLabel?.trim() || "Oferta"
}

export function formatProductPrice(product: Product, value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: product.currency || "MXN",
  }).format(value)
}
