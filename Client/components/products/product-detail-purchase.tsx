"use client"

import Link from "next/link"
import { Minus, Plus, ShoppingBag } from "lucide-react"
import { useState } from "react"
import { useCart } from "@/components/cart/cart-provider"
import { Button } from "@/components/ui/button"
import type { Product } from "@/lib/types/product"

interface ProductDetailPurchaseProps {
  product: Product
}

export function ProductDetailPurchase({ product }: ProductDetailPurchaseProps) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const isUnavailable = !product.inStock && !product.allowBackorder
  const maxQuantity = product.allowBackorder
    ? 10
    : Math.max(1, Math.min(product.stockAvailable ?? 10, 10))

  const handleAddToCart = () => {
    addItem(product, quantity)
    setQuantity(1)
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-stone-200/80 bg-white/85 p-5 shadow-[0_18px_36px_-32px_rgba(64,50,30,0.2)]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Cantidad</span>
          <div className="flex items-center gap-1 rounded-full border border-emerald-100 bg-secondary/30 p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center text-base font-semibold text-foreground">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
              disabled={quantity >= maxQuantity}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isUnavailable ? (
          <p className="mt-3 text-sm leading-6 text-rose-700">
            Este aroma ya no tiene existencias disponibles en este momento.
          </p>
        ) : product.allowBackorder && !product.inStock ? (
          <p className="mt-3 text-sm leading-6 text-amber-700">
            Disponible bajo pedido. Lo validaremos contigo antes de la confirmacion final.
          </p>
        ) : typeof product.stockAvailable === "number" ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Existencias inmediatas: {product.stockAvailable} unidades.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          className="rounded-full shadow-lg shadow-primary/20"
          onClick={handleAddToCart}
          disabled={isUnavailable}
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Agregar a la bolsa
        </Button>
        <Button
          variant="outline"
          className="rounded-full border-stone-200/80 bg-white shadow-[0_12px_24px_-20px_rgba(64,50,30,0.2)]"
          asChild
        >
          <Link href="/bolsa">Ir a mi bolsa</Link>
        </Button>
      </div>
    </div>
  )
}
