"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShoppingBag, Eye, Star, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types/product"

interface ProductCardProps {
  product: Product
  onQuickView: (product: Product) => void
  onAddToCart: (product: Product) => void
  index?: number
}

export function ProductCard({ product, onQuickView, onAddToCart, index = 0 }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const isUnavailable = !product.inStock && !product.allowBackorder

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      "linea-insomnio": "Linea insomnio",
      "linea-ansiedad-estres": "Linea ansiedad y estres",
      "linea-resfriado": "Linea resfriado",
      "linea-verde": "Linea verde",
      "linea-estimulante": "Linea estimulante",
    }

    return labels[category] ?? "Seleccion natural"
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  // Generate gradient backgrounds based on product category
  const getCategoryGradient = (category: string) => {
    const gradients: Record<string, string> = {
      "linea-insomnio": "from-emerald-600/80 via-teal-500/60 to-green-400/40",
      "linea-ansiedad-estres": "from-rose-500/80 via-pink-500/60 to-fuchsia-400/40",
      "linea-resfriado": "from-amber-600/80 via-orange-500/60 to-yellow-400/40",
      "linea-verde": "from-cyan-600/80 via-sky-500/60 to-blue-400/40",
      "linea-estimulante": "from-lime-600/80 via-emerald-500/60 to-teal-400/40",
    }
    return gradients[category] || "from-emerald-600/80 via-teal-500/60 to-green-400/40"
  }

  const productHref = `/productos/${product.slug ?? product.id}`

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-emerald-100/80 bg-white/90 shadow-[0_16px_40px_-30px_rgba(15,84,43,0.45)] backdrop-blur-[2px]",
        "transform-gpu transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translateZ(0)]",
        "hover:-translate-y-2 hover:border-primary/25 hover:shadow-[0_28px_70px_-36px_rgba(16,112,58,0.42)]"
      )}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <div className="absolute -left-1/3 top-0 z-10 h-full w-1/2 -translate-x-full rotate-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 blur-xl transition-all duration-700 group-hover:translate-x-[260%] group-hover:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-primary/8 opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/15 via-black/5 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Category gradient overlay */}
        <div
          className={cn(
            "absolute inset-0 z-10 bg-gradient-to-t opacity-0 transition-opacity duration-500 group-hover:opacity-60",
            getCategoryGradient(product.category)
          )}
        />

        {/* Product Image */}
        <div className="relative w-full h-full">
          {imageError ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <div className="text-center">
                <Leaf className="w-16 h-16 mx-auto text-primary/40 mb-2" />
                <span className="text-lg font-serif text-primary/60">{product.name}</span>
              </div>
            </div>
          ) : (
            <Image
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              fill
              className={cn(
                "object-cover transition-all duration-700 ease-out group-hover:scale-[1.06]",
                isImageLoaded ? "opacity-100" : "opacity-0"
              )}
              onError={() => {
                setImageError(true)
                setIsImageLoaded(true)
              }}
              onLoad={() => setIsImageLoaded(true)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          )}
        </div>

        {/* INHALEX Brand Overlay */}
        <div className="absolute left-4 top-4 z-20 translate-y-0 opacity-70 transition-all duration-500 group-hover:opacity-100">
          <div className="rounded-full border border-white/50 bg-card/85 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="text-xs font-bold tracking-wider text-primary">INHALEX</span>
          </div>
        </div>

        <div className="absolute left-4 top-[4.35rem] z-20 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/45 bg-black/18 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/92 backdrop-blur-md transition-all duration-500 group-hover:border-white/65 group-hover:bg-black/26">
            {getCategoryLabel(product.category)}
          </span>
          <span className="rounded-full border border-emerald-100/70 bg-emerald-50/90 px-3 py-1 text-[0.72rem] font-medium text-emerald-700 shadow-sm backdrop-blur-sm">
            {product.origin}
          </span>
        </div>

        {/* Quick View Button */}
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex translate-y-3 items-center justify-center opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <Button
            variant="secondary"
            size="sm"
            className="pointer-events-auto rounded-full border border-white/60 bg-white/92 px-4 text-foreground shadow-lg shadow-black/10 backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:bg-white"
            onClick={() => onQuickView(product)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Vista rapida
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col bg-white/95 px-5 pb-5 pt-4">
        {/* Title & Rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[1.35rem] font-semibold leading-tight text-foreground transition-colors duration-300 group-hover:text-primary">
            <Link href={productHref} className="hover:text-primary transition-colors">
              {product.name}
            </Link>
          </h3>
          {product.rating && (
            <div className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-600 ring-1 ring-amber-100">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-medium">{product.rating}</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-[0.72rem] font-medium text-emerald-700">
            {product.presentation}
          </span>
          {product.inStock ? (
            <span className="rounded-full border border-primary/10 bg-primary/8 px-2.5 py-1 text-[0.72rem] font-medium text-primary">
              Disponible
            </span>
          ) : product.allowBackorder ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.72rem] font-medium text-amber-700">
              Bajo pedido
            </span>
          ) : (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[0.72rem] font-medium text-rose-700">
              Sin stock
            </span>
          )}
        </div>

        {/* Description */}
        <p className="mt-3 min-h-[4.9rem] text-[0.98rem] leading-8 text-muted-foreground line-clamp-3">
          {product.description}
        </p>

        {/* Price & Add to Cart */}
        <div className="mt-auto flex items-end justify-between gap-4 border-t border-emerald-100/80 pt-4">
          <div>
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">
              Precio unitario
            </p>
            <span className="text-[2rem] font-bold leading-none text-foreground">
              {formatPrice(product.price)}
            </span>
            <span className="ml-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
              {product.currency}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-12 w-12 shrink-0 rounded-full",
              isUnavailable
                ? "border border-rose-100 bg-rose-50 text-rose-400 hover:bg-rose-50 hover:text-rose-400"
                : "border border-primary/10 bg-primary/8 text-primary hover:bg-primary hover:text-primary-foreground",
              "transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
            )}
            onClick={() => onAddToCart(product)}
            disabled={isUnavailable}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="sr-only">Agregar {product.name} a la bolsa</span>
          </Button>
        </div>
      </div>
    </article>
  )
}

