"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  addFavoriteProduct,
  listFavoriteProducts,
  removeFavoriteProduct,
} from "@/lib/favorites/favorites-api"
import type { Product } from "@/lib/types/product"

interface FavoritesContextValue {
  favoriteProducts: Product[]
  isLoading: boolean
  isFavorite: (productId: string) => boolean
  isPending: (productId: string) => boolean
  toggleFavorite: (product: Product) => Promise<boolean>
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([])
  const [pendingProductIds, setPendingProductIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isActive = true

    if (isAuthLoading) {
      return () => {
        isActive = false
      }
    }

    if (!user) {
      setFavoriteProducts([])
      setIsLoading(false)
      return () => {
        isActive = false
      }
    }

    const token = getAccessToken()
    if (!token) {
      setFavoriteProducts([])
      setIsLoading(false)
      return () => {
        isActive = false
      }
    }

    setIsLoading(true)
    void listFavoriteProducts(token)
      .then((products) => {
        if (isActive) setFavoriteProducts(products)
      })
      .catch(() => {
        if (isActive) setFavoriteProducts([])
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [isAuthLoading, user])

  const isFavorite = useCallback(
    (productId: string) =>
      favoriteProducts.some((product) => product.id === productId),
    [favoriteProducts],
  )

  const isPending = useCallback(
    (productId: string) => pendingProductIds.includes(productId),
    [pendingProductIds],
  )

  const toggleFavorite = useCallback(
    async (product: Product): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) {
        throw new Error("Inicia sesion para guardar productos favoritos.")
      }

      const wasFavorite = favoriteProducts.some(
        (favoriteProduct) => favoriteProduct.id === product.id,
      )
      setPendingProductIds((current) => [...current, product.id])
      setFavoriteProducts((current) =>
        wasFavorite
          ? current.filter((favoriteProduct) => favoriteProduct.id !== product.id)
          : [...current, product],
      )

      try {
        if (wasFavorite) {
          await removeFavoriteProduct(product.id, token)
        } else {
          await addFavoriteProduct(product.id, token)
        }

        return !wasFavorite
      } catch (error) {
        setFavoriteProducts((current) =>
          wasFavorite
            ? current.some((favoriteProduct) => favoriteProduct.id === product.id)
              ? current
              : [...current, product]
            : current.filter(
                (favoriteProduct) => favoriteProduct.id !== product.id,
              ),
        )
        throw error
      } finally {
        setPendingProductIds((current) =>
          current.filter((productId) => productId !== product.id),
        )
      }
    },
    [favoriteProducts],
  )

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteProducts,
      isLoading,
      isFavorite,
      isPending,
      toggleFavorite,
    }),
    [favoriteProducts, isFavorite, isLoading, isPending, toggleFavorite],
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext)

  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider")
  }

  return context
}
