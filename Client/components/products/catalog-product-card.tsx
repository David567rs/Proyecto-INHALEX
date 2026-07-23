"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react"
import { FavoriteButton } from "@/components/favorites/favorite-button"
import { Button } from "@/components/ui/button"
import { getLineaConfig, LINEA_CONFIGS } from "@/lib/products/lineas"
import { resolveProductCollectionImage } from "@/lib/products/product-images"
import {
  formatProductPrice,
  getProductDisplayPrice,
  getProductOfferLabel,
  hasActiveProductOffer,
} from "@/lib/products/promotions"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types/product"

interface CatalogProductCardProps {
  product: Product
  index?: number
  onAddToCart: (product: Product) => void
}

function formatDisplayText(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function CatalogProductCard({
  product,
  index = 0,
  onAddToCart,
}: CatalogProductCardProps) {
  const linea = getLineaConfig(product.category) ?? LINEA_CONFIGS[0]
  const productHref = `/productos/${product.slug ?? product.id}`
  const hasOffer = hasActiveProductOffer(product)
  const isUnavailable = !product.inStock && !product.allowBackorder
  const visibleAromas = (product.aromas ?? []).slice(0, 4)

  return (
    <article
      className="page-fade-up public-card-lift group flex h-full flex-col overflow-hidden rounded-[2rem] border border-border/65 bg-white/94 shadow-[0_22px_66px_-44px_rgba(15,23,42,0.2)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-[0_34px_84px_-44px_rgba(15,23,42,0.24)] motion-reduce:transform-none motion-reduce:transition-none"
      style={{ animationDelay: `${Math.min(index, 5) * 70}ms` }}
    >
      <div className="relative p-3.5 sm:p-4">
        <div
          className={cn(
            "absolute inset-x-10 top-9 h-24 rounded-full opacity-65 blur-3xl",
            linea.heroGlow,
          )}
        />

        <div className="rounded-[1.7rem] border border-white/70 bg-white/74 p-px shadow-[0_20px_48px_-34px_rgba(15,23,42,0.14)]">
          <div className="relative aspect-square overflow-hidden rounded-[1.62rem] border border-border/55 bg-[radial-gradient(circle_at_top,rgba(255,255,255,1),rgba(250,251,250,0.96)_56%,rgba(244,246,244,0.98))]">
            <Link
              href={productHref}
              scroll
              aria-label={`Ver información de ${product.name}`}
              className="absolute inset-0 z-10"
            />
            <Image
              src={resolveProductCollectionImage(product)}
              alt={product.name}
              fill
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.035] motion-reduce:transition-none"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent_24%,transparent_70%,rgba(15,23,42,0.08))]" />
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/50" />

            <div className="pointer-events-none absolute left-4 top-4 z-20 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-2">
              <span className="rounded-full border border-primary/10 bg-white/94 px-3.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-primary shadow-sm backdrop-blur-md">
                INHALEX
              </span>
              <span
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] shadow-sm backdrop-blur-md",
                  linea.badgeSurface,
                )}
              >
                {linea.name}
              </span>
              {hasOffer ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50/95 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-amber-700 shadow-sm backdrop-blur-md">
                  <Sparkles className="h-3 w-3" />
                  {getProductOfferLabel(product)}
                </span>
              ) : null}
            </div>

            <FavoriteButton
              product={product}
              className="absolute right-4 top-4 z-30 h-10 w-10 border-white/80 bg-white/94"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
              <Link
                href={productHref}
                scroll
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {product.name}
              </Link>
            </h2>
            <p className="mt-1.5 text-sm font-medium text-muted-foreground">
              {product.presentation} <span aria-hidden="true">|</span> {product.origin}
            </p>
          </div>

          <div className="shrink-0 text-right">
            {typeof product.rating === "number" ? (
              <div className="inline-flex items-center gap-1 rounded-full border border-amber-100/90 bg-amber-50/92 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{product.rating.toFixed(1)}</span>
                {typeof product.reviews === "number" ? (
                  <span className="font-normal text-amber-800/60">({product.reviews})</span>
                ) : null}
              </div>
            ) : null}
            {hasOffer ? (
              <p className="mt-2 text-xs font-medium text-muted-foreground line-through">
                {formatProductPrice(product, product.price)}
              </p>
            ) : null}
            <p className="mt-2 text-xl font-semibold text-foreground">
              {formatProductPrice(product, getProductDisplayPrice(product))}
            </p>
          </div>
        </div>

        <p className="mt-4 line-clamp-3 min-h-[5.25rem] text-[0.96rem] leading-7 text-muted-foreground">
          {product.description}
        </p>

        {visibleAromas.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Notas aromáticas">
            {visibleAromas.map((aroma) => (
              <span
                key={`${product.id}-${aroma}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  linea.chipSurface,
                )}
              >
                {formatDisplayText(aroma)}
              </span>
            ))}
          </div>
        ) : null}

        <ul className="mt-5 space-y-2" aria-label={`Características de ${product.name}`}>
          {product.benefits.slice(0, 3).map((benefit) => (
            <li
              key={`${product.id}-${benefit}`}
              className="flex items-start gap-2.5 text-sm leading-6 text-foreground/75"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/9 text-primary">
                <Check className="h-3 w-3" />
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
          <span
            className={cn(
              "text-sm font-medium",
              product.inStock
                ? "text-emerald-700"
                : product.allowBackorder
                  ? "text-amber-700"
                  : "text-rose-700",
            )}
          >
            {product.inStock
              ? "Disponible ahora"
              : product.allowBackorder
                ? "Disponible bajo pedido"
                : "Temporalmente agotado"}
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-primary/15 bg-white text-primary hover:bg-primary/8"
              onClick={() => onAddToCart(product)}
              disabled={isUnavailable}
              aria-label={`Agregar ${product.name} a la bolsa`}
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
            <Button
              asChild
              className="h-10 rounded-full px-5 shadow-[0_18px_32px_-24px_rgba(16,112,58,0.5)]"
            >
              <Link href={productHref} scroll>
                Ver aroma
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
