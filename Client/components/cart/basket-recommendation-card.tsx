"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { resolveProductDisplayImage } from "@/lib/products/product-images"
import { getProductDisplayPrice } from "@/lib/products/promotions"
import type {
  BasketRecommendation,
  RecommendationModel,
  RecommendationSource,
} from "@/lib/recommendations/recommendations-api"
import type { Product } from "@/lib/types/product"
import { cn } from "@/lib/utils"

interface BasketRecommendationCardProps {
  recommendation: BasketRecommendation | null
  model: RecommendationModel | null
  source: RecommendationSource
  isLoading?: boolean
  variant?: "compact" | "wide"
  onAdd: (product: Product) => void
}

function formatPrice(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(value)
}

function RecommendationLoading({
  variant,
}: {
  variant: "compact" | "wide"
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.6rem] border border-emerald-100/80 bg-white/78",
        variant === "compact" ? "p-4" : "p-5 lg:p-6",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/8 text-primary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-foreground">
            Buscando una combinación para tu bolsa
          </p>
          <p className="mt-0.5 text-xs">
            Tu pedido puede continuar mientras preparamos la sugerencia.
          </p>
        </div>
      </div>
    </div>
  )
}

export function BasketRecommendationCard({
  recommendation,
  model,
  source,
  isLoading = false,
  variant = "wide",
  onAdd,
}: BasketRecommendationCardProps) {
  if (isLoading && !recommendation) {
    return <RecommendationLoading variant={variant} />
  }

  if (!recommendation) {
    return null
  }

  const { product, basedOn, explanation } = recommendation
  const isCompact = variant === "compact"
  const isExperimental = Boolean(model?.isSynthetic)
  const isAvailable =
    product.inStock ||
    product.allowBackorder ||
    (typeof product.stockAvailable === "number" && product.stockAvailable > 0)
  const price = getProductDisplayPrice(product)
  const productHref = product.slug
    ? `/productos/${encodeURIComponent(product.slug)}`
    : "/productos"

  return (
    <section
      className={cn(
        "group relative overflow-hidden border border-emerald-200/80 bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.2),transparent_36%),linear-gradient(145deg,rgba(240,253,244,0.98),rgba(255,255,255,0.98))] shadow-[0_24px_60px_-42px_rgba(16,112,58,0.38)]",
        isCompact ? "rounded-[1.6rem] p-4" : "rounded-[2rem] p-5 lg:p-6",
      )}
      aria-label={`Recomendación para tu bolsa: ${product.name}`}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-200/35 blur-3xl transition-transform duration-700 group-hover:scale-125"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/88 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {isExperimental
              ? "Recomendación experimental"
              : "Sugerencia para tu bolsa"}
          </span>
          {source === "fallback" ? (
            <span className="text-[0.68rem] font-medium text-muted-foreground">
              Alternativa del catálogo
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-4 flex",
            isCompact
              ? "items-start gap-3"
              : "flex-col gap-5 sm:flex-row sm:items-center",
          )}
        >
          <Link
            href={productHref}
            className={cn(
              "relative shrink-0 overflow-hidden border border-white/90 bg-white shadow-[0_18px_38px_-30px_rgba(15,84,43,0.42)] outline-none transition duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isCompact
                ? "h-24 w-20 rounded-[1.15rem]"
                : "h-44 w-full rounded-[1.45rem] sm:w-36",
            )}
            aria-label={`Ver detalles de ${product.name}`}
          >
            <Image
              src={resolveProductDisplayImage(product)}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.035]"
              sizes={isCompact ? "80px" : "(max-width: 640px) 100vw, 144px"}
            />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[0.68rem] font-medium",
                  isAvailable
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 bg-stone-50 text-stone-600",
                )}
              >
                {isAvailable ? "Disponible" : "No disponible"}
              </span>
              {!isCompact ? (
                <span className="text-xs text-muted-foreground">
                  {product.presentation} · {product.origin}
                </span>
              ) : null}
            </div>

            <div
              className={cn(
                "mt-2 gap-3",
                isCompact
                  ? "block"
                  : "flex flex-wrap items-start justify-between",
              )}
            >
              <div className="min-w-0">
                <Link
                  href={productHref}
                  className="outline-none transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <h3
                    className={cn(
                      "truncate font-semibold text-foreground",
                      isCompact ? "text-lg" : "text-2xl",
                    )}
                  >
                    {product.name}
                  </h3>
                </Link>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatPrice(price, product.currency)}
                </p>
              </div>
            </div>

            <p
              className={cn(
                "mt-2 text-muted-foreground",
                isCompact
                  ? "line-clamp-2 text-xs leading-5"
                  : "max-w-2xl text-sm leading-6",
              )}
            >
              {explanation}
            </p>

            {basedOn.length > 0 ? (
              <p
                className={cn(
                  "mt-2 flex items-center gap-1.5 font-medium text-emerald-800",
                  isCompact ? "text-[0.7rem]" : "text-xs",
                )}
              >
                <span className="truncate">
                  A partir de {basedOn.join(", ")}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{product.name}</span>
              </p>
            ) : null}

            <div
              className={cn(
                "mt-4 flex gap-3",
                isCompact
                  ? "flex-col"
                  : "flex-col sm:flex-row sm:items-center sm:justify-between",
              )}
            >
              <span className="text-[0.68rem] leading-5 text-muted-foreground">
                {isExperimental
                  ? "Afinidad calculada con el conjunto académico de INHALEX."
                  : source === "apriori"
                    ? "Sugerencia basada en productos elegidos juntos anteriormente."
                    : "Alternativa seleccionada entre los aromas disponibles."}
              </span>

              <Button
                type="button"
                size={isCompact ? "sm" : "default"}
                className={cn(
                  "shrink-0 rounded-full shadow-[0_18px_34px_-22px_rgba(16,112,58,0.52)]",
                  isCompact ? "w-full" : "px-5",
                )}
                disabled={!isAvailable}
                onClick={() => onAdd(product)}
                aria-label={`Agregar ${product.name} a la bolsa`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Agregar a mi bolsa
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
