"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { X, Check, ShoppingBag, Minus, Plus, Star, Leaf } from "lucide-react"
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
  const [imageError, setImageError] = useState(false)

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

  const getAromaImage = (name: string) => {
    const normalized = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

    const aromaMap: Record<string, string> = {
      "anis estrella": "/aromas/anis.jpeg",
      bugambilia: "/aromas/bugambilia.jpeg",
      cafe: "/aromas/cafe.jpeg",
      canela: "/aromas/canela.jpeg",
      copal: "/aromas/copal.jpeg",
      eucalipto: "/aromas/eucalipto.jpeg",
      hierbabuena: "/aromas/hierbabuena.jpeg",
      jengibre: "/aromas/jengibre.jpeg",
      lavanda: "/aromas/lavanda.jpeg",
      manzanilla: "/aromas/manzanilla.jpeg",
      menta: "/aromas/menta.jpeg",
      "mirra y azafran": "/aromas/mirra.jpeg",
      "rosas de castilla": "/aromas/rosas.jpeg",
      toronjil: "/aromas/toronjil.jpeg",
      vaporub: "/aromas/vaporub.jpeg",
      romero: "",
    }

    return aromaMap[normalized] || ""
  }

  const aromaImage = getAromaImage(product.name)
  const productHref = `/productos/${product.slug ?? product.id}`

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] p-0 overflow-hidden bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-all duration-300"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </button>

        <div className="flex flex-col md:flex-row max-h-[90vh] overflow-y-auto">
          {/* Image Section */}
          <div className="relative w-full md:w-[45%] bg-muted overflow-hidden">
            <div className="relative aspect-[4/5] md:aspect-[3/4] px-8 pt-16 pb-6">
              {imageError || !aromaImage ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                  <div className="text-center p-8">
                    <Leaf className="w-20 h-20 mx-auto text-primary/40 mb-4" />
                    <span className="text-2xl font-serif text-primary/60">{product.name}</span>
                  </div>
                </div>
              ) : (
                <Image
                  src={aromaImage}
                  alt={`Aroma de ${product.name}`}
                  fill
                  className="object-contain object-center translate-y-6 md:translate-y-10"
                  onError={() => setImageError(true)}
                  sizes="(max-width: 768px) 100vw, 320px"
                />
              )}
            </div>

            <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-sm font-bold tracking-wider text-primary">INHALEX</span>
            </div>

            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-6">
              <h2 className="text-2xl font-serif font-bold text-white">{product.name}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70 mt-2">
                Aroma
              </p>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-5 flex flex-col md:w-[55%]">
            {/* Title */}
            <h2 className="text-xl font-serif font-bold text-foreground mb-2">
              {product.name}
            </h2>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-4 h-4",
                        i < Math.floor(product.rating!)
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.reviews} resenas)
                </span>
              </div>
            )}

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {product.longDescription || product.description}
            </p>

            {/* Benefits */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Beneficios</h3>
              <ul className="space-y-2">
                {product.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Specifications */}
            <div className="flex items-center gap-4 mb-4 p-2.5 bg-secondary/50 rounded-lg text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Presentacion:</span>
                <span className="text-sm font-medium text-foreground ml-1">{product.presentation}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div>
                <span className="text-xs text-muted-foreground">Origen:</span>
                <span className="text-sm font-medium text-foreground ml-1">{product.origin}</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(product.price)}
              </span>
              <span className="text-xs text-muted-foreground">{product.currency}</span>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-foreground">Cantidad:</span>
              <div className="flex items-center gap-2 bg-secondary rounded-full p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-background"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-background"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-auto">
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-5 text-sm font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
                onClick={handleAddToCart}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Agregar a la Bolsa
              </Button>
              <Button
                variant="outline"
                className="py-5 px-4 border-2 hover:bg-primary/5 hover:border-primary transition-all duration-300 bg-transparent text-sm"
                asChild
              >
                <Link href={productHref} onClick={onClose}>
                  Ver detalle
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

