"use client"

import { Heart } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useFavorites } from "@/components/favorites/favorites-provider"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types/product"

interface FavoriteButtonProps {
  product: Product
  showLabel?: boolean
  className?: string
}

export function FavoriteButton({
  product,
  showLabel = false,
  className,
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth()
  const { isFavorite, isPending, toggleFavorite } = useFavorites()
  const { toast } = useToast()
  const favorite = isFavorite(product.id)
  const pending = isPending(product.id)

  const handleToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesion",
        description: "Accede a tu cuenta para guardar productos favoritos.",
      })
      return
    }

    try {
      const wasAdded = await toggleFavorite(product)
      toast({
        title: wasAdded ? "Guardado en favoritos" : "Eliminado de favoritos",
        description: wasAdded
          ? `${product.name} ahora aparece en tu cuenta.`
          : `${product.name} se elimino de tu lista.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar",
        description:
          error instanceof Error
            ? error.message
            : "Intenta nuevamente en unos segundos.",
      })
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "default" : "icon"}
      className={cn(
        "rounded-full border-emerald-100/80 bg-white/92 text-primary shadow-sm backdrop-blur-sm transition-all hover:border-primary/20 hover:bg-white",
        favorite && "border-primary/20 bg-primary/10",
        className,
      )}
      aria-label={
        favorite
          ? `Quitar ${product.name} de favoritos`
          : `Guardar ${product.name} en favoritos`
      }
      aria-pressed={favorite}
      disabled={pending}
      onClick={() => void handleToggle()}
    >
      <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
      {showLabel ? (
        <span className="ml-2">{favorite ? "Guardado" : "Guardar favorito"}</span>
      ) : null}
    </Button>
  )
}
