"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart } from "lucide-react"
import { FavoriteButton } from "@/components/favorites/favorite-button"
import { useFavorites } from "@/components/favorites/favorites-provider"
import { Button } from "@/components/ui/button"
import {
  formatProductPrice,
  getProductDisplayPrice,
  hasActiveProductOffer,
} from "@/lib/products/promotions"

export function AccountFavorites() {
  const { favoriteProducts, isLoading } = useFavorites()

  return (
    <section className="rounded-[1.6rem] border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <Heart className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Mis favoritos</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Guarda aromas de interes para encontrarlos rapidamente.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-5 rounded-xl bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
          Cargando tus favoritos...
        </p>
      ) : favoriteProducts.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Todavia no guardaste productos favoritos.
          </p>
          <Button asChild variant="outline" className="mt-4 rounded-full">
            <Link href="/#catalogo">Explorar productos</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {favoriteProducts.map((product) => (
            <article
              key={product.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/85 p-3"
            >
              <Link
                href={`/productos/${product.slug ?? product.id}`}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary"
              >
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/productos/${product.slug ?? product.id}`}
                  className="font-medium text-foreground transition-colors hover:text-primary"
                >
                  {product.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatProductPrice(product, getProductDisplayPrice(product))}
                  {hasActiveProductOffer(product) ? (
                    <span className="ml-2 text-xs line-through">
                      {formatProductPrice(product, product.price)}
                    </span>
                  ) : null}
                </p>
              </div>
              <FavoriteButton product={product} />
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
