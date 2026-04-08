"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X, Check, ShoppingBag, Minus, Plus, Star, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types/product"

interface ProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product, quantity: number) => void
}

export function ProductModal({ product, isOpen, onClose, onAddToCart }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [isVisible, setIsVisible] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false)
      const timer = setTimeout(() => setIsVisible(true), 50)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!product) return null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price)
  }

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(10, prev + delta)))
  }

  const handleAddToCart = () => {
    onAddToCart(product, quantity)
    setQuantity(1)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[95vh] p-0 overflow-hidden border-0 shadow-[0_25px_100px_-15px_rgba(0,0,0,0.25)] rounded-[2rem]">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        
        {/* Close button - Floating elegant */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-50 h-12 w-12 rounded-full bg-white/90 backdrop-blur-xl flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-white transition-all duration-500 shadow-lg hover:shadow-xl hover:scale-110 border border-neutral-100"
        >
          <X className="h-5 w-5" strokeWidth={1.5} />
          <span className="sr-only">Cerrar</span>
        </button>

        <div className="flex flex-col md:grid md:grid-cols-[1.1fr_1fr] max-h-[95vh] overflow-y-auto">
          {/* Left Side - Product Image Hero - FULL BLEED */}
          <div className="relative min-h-[450px] md:min-h-[700px] overflow-hidden">
            {/* Product Image - FULL COVERAGE */}
            <div 
              className={cn(
                "absolute inset-0 transition-all duration-1000 ease-out",
                isVisible 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-105"
              )}
            >
              <Image
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                fill
                className={cn(
                  "object-cover object-center transition-all duration-700",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                onLoad={() => setImageLoaded(true)}
              />
            </div>

            {/* Brand watermark */}
            <div 
              className={cn(
                "absolute top-8 left-8 z-10 transition-all duration-700 delay-200",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
              )}
            >
              <span className="text-[10px] font-bold tracking-[0.3em] text-neutral-400 uppercase drop-shadow-sm">INHALEX</span>
            </div>

            {/* Floating badges - Bottom */}
            <div 
              className={cn(
                "absolute bottom-8 left-8 right-8 z-10 flex items-center justify-between transition-all duration-700 delay-400",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="px-4 py-2 bg-primary/90 text-white text-[10px] font-bold tracking-[0.15em] rounded-full uppercase backdrop-blur-sm shadow-lg">
                  {product.category}
                </span>
              </div>
              <span className="px-4 py-2 bg-white/95 backdrop-blur-sm text-neutral-600 text-[10px] font-semibold tracking-wider rounded-full shadow-lg">
                {product.presentation}
              </span>
            </div>
          </div>

          {/* Right Side - Product Details - Clean & Elegant */}
          <div className="p-8 md:p-10 lg:p-12 flex flex-col bg-white relative">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-neutral-50/50 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full">
              {/* Availability + Rating row */}
              <div 
                className={cn(
                  "flex items-center justify-between mb-6 transition-all duration-500 delay-100",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
              >
                {product.inStock && (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-medium text-emerald-600">Disponible</span>
                  </div>
                )}
                {product.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-3.5 h-3.5",
                            i < Math.floor(product.rating!)
                              ? "text-amber-400 fill-amber-400"
                              : "text-neutral-200 fill-neutral-200"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-neutral-400">
                      ({product.reviews})
                    </span>
                  </div>
                )}
              </div>

              {/* Product Name - Hero Typography */}
              <h2 
                className={cn(
                  "text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-4 leading-[1.1] tracking-tight transition-all duration-700 delay-150",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                {product.name}
              </h2>

              {/* Description - Elegant typography */}
              <p 
                className={cn(
                  "text-neutral-500 leading-relaxed mb-8 text-[15px] max-w-md transition-all duration-700 delay-200",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                {product.longDescription || product.description}
              </p>

              {/* Benefits - Minimal elegant list */}
              <div 
                className={cn(
                  "mb-8 transition-all duration-700 delay-250",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary/60" />
                  <h3 className="text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
                    Beneficios
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.benefits.map((benefit, index) => (
                    <span
                      key={benefit}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-full text-sm text-neutral-600 border border-neutral-100 transition-all duration-500",
                        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                      )}
                      style={{ transitionDelay: `${300 + index * 50}ms` }}
                    >
                      <Check className="w-3.5 h-3.5 text-primary" />
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price - Bold & Clean */}
              <div 
                className={cn(
                  "mb-8 transition-all duration-700 delay-350",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl md:text-5xl font-bold text-neutral-900 tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-sm text-neutral-400 font-medium">{product.currency}</span>
                </div>
              </div>

              {/* Spacer to push controls to bottom */}
              <div className="flex-1 min-h-4" />

              {/* Quantity + Add to Cart - Bottom sticky area */}
              <div 
                className={cn(
                  "space-y-4 transition-all duration-700 delay-400",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
              >
                {/* Quantity Selector - Minimal elegant */}
                <div className="flex items-center justify-between p-4 bg-neutral-50/80 rounded-2xl border border-neutral-100">
                  <span className="text-sm text-neutral-600 font-medium">Cantidad</span>
                  <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-sm border border-neutral-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-bold text-lg text-neutral-900">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Add to Cart Button - Premium CTA */}
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-16 text-base font-semibold rounded-2xl shadow-xl shadow-primary/25 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={handleAddToCart}
                >
                  <ShoppingBag className="w-5 h-5 mr-3" strokeWidth={2} />
                  Agregar a la bolsa
                </Button>

                {/* Origin badge */}
                <div className="text-center pt-2">
                  <span className="text-[11px] tracking-wider text-neutral-400 uppercase">{product.origin}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
