"use client"

import { useState } from "react"
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
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  // Generate gradient backgrounds based on product category
  const getCategoryGradient = (category: string) => {
    const gradients: Record<string, string> = {
      "Relajantes": "from-green-600/80 via-emerald-500/60 to-teal-400/40",
      "Energizantes": "from-amber-500/80 via-orange-400/60 to-yellow-300/40",
      "Respiratorios": "from-cyan-600/80 via-sky-500/60 to-blue-400/40",
      "Aromáticos": "from-purple-600/80 via-fuchsia-500/60 to-pink-400/40",
      "Purificadores": "from-amber-700/80 via-orange-600/60 to-red-500/40",
    }
    return gradients[category] || "from-green-600/80 via-emerald-500/60 to-teal-400/40"
  }

  return (
    <article
      className={cn(
        "group relative bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50",
        "transition-all duration-500 ease-out",
        "hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2 hover:border-primary/20"
      )}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {/* Category gradient overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t opacity-0 transition-opacity duration-500 z-10",
          getCategoryGradient(product.category),
          isHovered && "opacity-60"
        )} />

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
                "object-cover transition-transform duration-700 ease-out",
                isHovered && "scale-110"
              )}
              onError={() => setImageError(true)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          )}
        </div>

        {/* INHALEX Brand Overlay */}
        <div className={cn(
          "absolute left-4 top-4 z-20 transition-all duration-500",
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}>
          <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-xs font-bold tracking-wider text-primary">INHALEX</span>
          </div>
        </div>

        {/* Product Name Overlay */}
        <div className={cn(
          "absolute inset-x-0 bottom-0 z-20 p-4",
          "bg-gradient-to-t from-black/60 via-black/30 to-transparent"
        )}>
          <h3 className={cn(
            "text-xl font-serif font-semibold text-white",
            "transition-transform duration-500",
            isHovered && "translate-y-0"
          )}>
            {product.name}
          </h3>
        </div>

        {/* Quick View Button */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center z-20",
          "transition-all duration-500",
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/95 hover:bg-white text-foreground shadow-lg transform transition-all duration-300 hover:scale-105"
            onClick={() => onQuickView(product)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Vista Rápida
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title & Rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
            {product.name}
          </h3>
          {product.rating && (
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-medium">{product.rating}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Price & Add to Cart */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-xl font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs text-muted-foreground ml-1">{product.currency}</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-10 w-10 rounded-full",
              "bg-primary/10 hover:bg-primary hover:text-primary-foreground",
              "transition-all duration-300 hover:scale-110"
            )}
            onClick={() => onAddToCart(product)}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="sr-only">Agregar {product.name} a la bolsa</span>
          </Button>
        </div>
      </div>
    </article>
  )
}
