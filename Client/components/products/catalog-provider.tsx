"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  PRODUCT_CATEGORIES,
  type ProductCategoryOption,
} from "@/lib/products/categories"
import {
  fetchCatalogCategories,
  fetchCatalogProducts,
} from "@/lib/products/products-api"
import type { Product } from "@/lib/types/product"

interface CatalogContextValue {
  products: Product[]
  categories: ProductCategoryOption[]
  isLoading: boolean
  isLoaded: boolean
  errorMessage: string
  ensureLoaded: () => Promise<void>
  reloadCatalog: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

function withAllCategory(
  categories: ProductCategoryOption[],
): ProductCategoryOption[] {
  const categoryOptions = categories.filter((category) => category.id !== "all")
  return categoryOptions.length > 0
    ? [{ id: "all", name: "Todos" }, ...categoryOptions]
    : PRODUCT_CATEGORIES
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] =
    useState<ProductCategoryOption[]>(PRODUCT_CATEGORIES)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const isLoadedRef = useRef(false)
  const pendingRequestRef = useRef<Promise<void> | null>(null)

  const requestCatalog = useCallback(async (force = false) => {
    if (!force && isLoadedRef.current) return
    if (pendingRequestRef.current) return pendingRequestRef.current

    setIsLoading(true)
    setErrorMessage("")

    const request = Promise.all([
      fetchCatalogProducts(),
      fetchCatalogCategories(),
    ])
      .then(([catalogProducts, catalogCategories]) => {
        setProducts(catalogProducts)
        setCategories(withAllCategory(catalogCategories))
        isLoadedRef.current = true
        setIsLoaded(true)
      })
      .catch((error: unknown) => {
        isLoadedRef.current = false
        setIsLoaded(false)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No pudimos cargar el catálogo en este momento.",
        )
      })
      .finally(() => {
        setIsLoading(false)
        pendingRequestRef.current = null
      })

    pendingRequestRef.current = request
    return request
  }, [])

  const ensureLoaded = useCallback(() => requestCatalog(false), [requestCatalog])
  const reloadCatalog = useCallback(() => requestCatalog(true), [requestCatalog])

  const value = useMemo(
    () => ({
      products,
      categories,
      isLoading,
      isLoaded,
      errorMessage,
      ensureLoaded,
      reloadCatalog,
    }),
    [
      products,
      categories,
      isLoading,
      isLoaded,
      errorMessage,
      ensureLoaded,
      reloadCatalog,
    ],
  )

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext)

  if (!context) {
    throw new Error("useCatalog debe usarse dentro de CatalogProvider")
  }

  return context
}
