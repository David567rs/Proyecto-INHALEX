"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { X, Check, ShoppingBag, Minus, Plus, Star, Sparkles, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  resolveProductDisplayImage,
  resolveProductImagePosition,
} from "@/lib/products/product-images"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types/product"

interface ProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product, quantity: number) => void
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    "linea-insomnio": "Linea insomnio",
    "linea-ansiedad-estres": "Linea ansiedad y estres",
    "linea-resfriado": "Linea resfriado",
    "linea-verde": "Linea verde",
    "linea-estimulante": "Linea estimulante",
  }

  return labels[category] ?? "Seleccion natural"
}

export function ProductModal({ product, isOpen, onClose, onAddToCart }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [isVisible, setIsVisible] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1)
      setImageLoaded(false)
      setImageError(false)
      const timer = setTimeout(() => setIsVisible(true), 50)
      return () => clearTimeout(timer)
    }

    setIsVisible(false)
  }, [isOpen, product])

  if (!product) return null
  const isUnavailable = !product.inStock && !product.allowBackorder
  const maxQuantity = product.allowBackorder
    ? 10
    : Math.max(1, Math.min(product.stockAvailable ?? 10, 10))

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(price)
  }

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(maxQuantity, prev + delta)))
  }

  const handleAddToCart = () => {
    onAddToCart(product, quantity)
    setQuantity(1)
    onClose()
  }

  const displayImage = resolveProductDisplayImage(product)
  const imagePosition = resolveProductImagePosition(product, { surface: "modal" })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="block max-h-[92vh] overflow-hidden rounded-[2.4rem] border border-primary/15 bg-white p-0 shadow-[0_25px_100px_-15px_rgba(0,0,0,0.24)] duration-500 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-[0.985] data-[state=open]:slide-in-from-bottom-4 sm:max-w-[940px]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="relative isolate overflow-hidden rounded-[inherit] bg-white">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white/96 text-neutral-400 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-500 hover:scale-110 hover:bg-white hover:text-neutral-900"
          >
            <X className="h-5 w-5" strokeWidth={1.6} />
            <span className="sr-only">Cerrar</span>
          </button>

          <div className="flex max-h-[92vh] flex-col overflow-y-auto rounded-[inherit] md:grid md:grid-cols-[0.88fr_1fr]">
            <div className="relative min-h-[420px] overflow-hidden bg-white md:min-h-[760px]">
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-1000 ease-out",
                  isVisible ? "opacity-100 scale-100" : "opacity-0 scale-[1.01]"
                )}
              >
                {imageError ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center">
                      <Leaf className="mx-auto mb-4 h-20 w-20 text-primary/35" />
                      <span className="text-2xl font-serif text-foreground/55">{product.name}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Image
                      src={displayImage}
                      alt={product.name}
                      fill
                      className={cn(
                        "object-cover object-center transition-all duration-700 ease-out",
                        imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.01]"
                      )}
                      style={{ objectPosition: imagePosition }}
                      sizes="(max-width: 768px) 100vw, 42vw"
                      priority
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                    />
                  </>
                )}

                <div
                  className={cn(
                    "absolute left-5 top-5 z-20 transition-all duration-700 delay-150",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
                  )}
                >
                  <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-neutral-400/80">
                    INHALEX
                  </span>
                </div>

                <div
                  className={cn(
                    "absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between gap-2 transition-all duration-700 delay-300 md:bottom-5 md:left-5 md:right-5",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  )}
                >
                  <span className="rounded-full bg-primary px-4 py-2 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-[0_20px_44px_-26px_rgba(16,112,58,0.42)]">
                    {getCategoryLabel(product.category)}
                  </span>
                  <span className="rounded-full border border-white/80 bg-white/92 px-3 py-1.5 text-[0.75rem] font-medium text-neutral-600 shadow-[0_18px_36px_-24px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                    {product.presentation}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative bg-white p-7 md:p-8 lg:p-10">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-neutral-50/50" />

              <div className="relative z-10 flex h-full flex-col">
              <div
                className={cn(
                  "mb-6 flex items-center justify-between gap-4 pr-16 transition-all duration-500 delay-100 md:pr-20",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
              >
                <div className="flex items-center gap-3 text-emerald-600">
                  {product.inStock ? (
                    <>
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                      </span>
                      <span className="text-base font-medium">Disponible</span>
                    </>
                  ) : product.allowBackorder ? (
                    <>
                      <span className="inline-flex h-3 w-3 rounded-full bg-amber-500" />
                      <span className="text-base font-medium text-amber-600">Bajo pedido</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex h-3 w-3 rounded-full bg-rose-500" />
                      <span className="text-base font-medium text-rose-600">Sin existencias</span>
                    </>
                  )}
                </div>

                {product.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-5 w-5",
                            i < Math.floor(product.rating! ?? 0)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-neutral-200 text-neutral-200"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-base text-neutral-400">({product.reviews ?? 0})</span>
                  </div>
                )}
              </div>

              <h2
                className={cn(
                  "text-balance font-serif text-4xl font-bold leading-[1.02] tracking-tight text-neutral-900 md:text-5xl",
                  "transition-all duration-700 delay-150",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                {product.name}
              </h2>

              <p
                className={cn(
                  "mt-5 max-w-md text-[15px] leading-relaxed text-neutral-500 transition-all duration-700 delay-200",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                {product.longDescription || product.description}
              </p>

              <div
                className={cn(
                  "mt-10 transition-all duration-700 delay-250",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary/60" />
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400">
                    Beneficios
                  </h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {product.benefits.slice(0, 3).map((benefit, index) => (
                    <span
                      key={benefit}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-neutral-100 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-600 shadow-[0_12px_24px_-22px_rgba(0,0,0,0.14)] transition-all duration-500",
                        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                      )}
                      style={{ transitionDelay: `${300 + index * 60}ms` }}
                    >
                      <Check className="h-3.5 w-3.5 text-primary" />
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  "mt-12 transition-all duration-700 delay-350",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl">
                    {formatPrice(product.price)}
                  </span>
                  <span className="pb-2 text-sm font-medium text-neutral-400">{product.currency}</span>
                </div>
              </div>

              <div className="flex-1 min-h-4" />

              <div
                className={cn(
                  "space-y-4 transition-all duration-700 delay-400",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                <div className="flex items-center justify-between rounded-[1.65rem] border border-neutral-100 bg-neutral-50/80 p-4 shadow-[0_16px_32px_-28px_rgba(0,0,0,0.14)]">
                  <span className="text-base font-medium text-neutral-600">Cantidad</span>
                  <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center text-lg font-bold text-neutral-900">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= maxQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  className="h-16 w-full rounded-[1.6rem] bg-primary text-base font-semibold text-primary-foreground shadow-[0_24px_52px_-26px_rgba(16,112,58,0.45)] transition-all duration-500 hover:scale-[1.02] hover:bg-primary/92 hover:shadow-[0_30px_56px_-24px_rgba(16,112,58,0.5)] active:scale-[0.985]"
                  onClick={handleAddToCart}
                  disabled={isUnavailable}
                >
                  <ShoppingBag className="mr-3 h-5 w-5" strokeWidth={2} />
                  {isUnavailable ? "Sin existencias" : "Agregar a la bolsa"}
                </Button>

                {!product.inStock && product.allowBackorder ? (
                  <p className="text-center text-xs leading-6 text-amber-700">
                    Este aroma se puede preparar bajo pedido. Confirmaremos tiempos contigo.
                  </p>
                ) : null}

                <div className="pt-2 text-center">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    {product.origin}
                  </span>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
