"use client"

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast } from "@/hooks/use-toast"
import {
  confirmOrder,
  type ConfirmedOrder,
  previewOrderDraft,
  type DraftOrderIssue,
  type DraftOrderPreview,
  type DraftOrderPreviewItem,
} from "@/lib/orders/orders-api"
import { getAccessToken } from "@/lib/auth/token-storage"
import type { CartItem, Product } from "@/lib/types/product"

const CART_STORAGE_KEY = "inhalex-cart-v1"

interface CreateDraftPayload {
  customerName: string
  customerEmail: string
  customerPhone: string
  notes?: string
}

interface CartContextValue {
  items: CartItem[]
  preview: DraftOrderPreview | null
  itemCount: number
  subtotal: number
  isReady: boolean
  isSyncing: boolean
  syncError: string
  isSheetOpen: boolean
  lastDraft: ConfirmedOrder | null
  addItem: (product: Product, quantity?: number) => void
  updateItemQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  openSheet: () => void
  closeSheet: () => void
  setSheetOpen: (open: boolean) => void
  createDraft: (payload: CreateDraftPayload) => Promise<ConfirmedOrder>
  clearLastDraft: () => void
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

function isStoredCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<CartItem>
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    typeof item.currency === "string" &&
    typeof item.image === "string" &&
    typeof item.category === "string" &&
    typeof item.presentation === "string" &&
    typeof item.origin === "string" &&
    typeof item.inStock === "boolean" &&
    typeof item.quantity === "number"
  )
}

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isStoredCartItem).map((item) => ({
      ...item,
      benefits: Array.isArray(item.benefits) ? item.benefits : [],
      aromas: Array.isArray(item.aromas) ? item.aromas : [],
      quantity: Math.max(1, Math.min(25, Math.floor(item.quantity))),
    }))
  } catch {
    return []
  }
}

function buildCartSignature(items: Array<{ id: string; quantity: number }>) {
  return items
    .map((item) => `${item.id}:${item.quantity}`)
    .sort()
    .join("|")
}

function buildVisualCartSignature(items: CartItem[]) {
  return items
    .map((item) =>
      [
        item.id,
        item.quantity,
        item.price,
        item.name,
        item.presentation,
        item.origin,
        item.category,
        item.image,
      ].join(":"),
    )
    .sort()
    .join("|")
}

function mapPreviewItemToCartItem(item: DraftOrderPreviewItem): CartItem {
  return {
    id: item.productId,
    slug: item.productSlug,
    name: item.productName,
    description: item.message ?? item.presentation,
    price: item.unitPrice,
    currency: item.currency,
    image: item.image,
    category: item.category,
    benefits: [],
    aromas: [],
    presentation: item.presentation,
    origin: item.origin,
    inStock: item.fulfillment !== "backorder" || item.allowBackorder,
    stockAvailable: item.stockAvailable ?? undefined,
    allowBackorder: item.allowBackorder,
    quantity: item.quantity,
  }
}

function buildIssueSignature(issues: DraftOrderIssue[]) {
  return issues
    .map((issue) => `${issue.code}:${issue.productId ?? "general"}:${issue.description}`)
    .join("|")
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [preview, setPreview] = useState<DraftOrderPreview | null>(null)
  const [lastDraft, setLastDraft] = useState<ConfirmedOrder | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState("")
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const lastIssueSignatureRef = useRef("")

  useEffect(() => {
    startTransition(() => {
      setItems(readStoredCart())
      setIsReady(true)
    })
  }, [])

  useEffect(() => {
    if (!isReady || typeof window === "undefined") return
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [isReady, items])

  useEffect(() => {
    if (!isReady) return

    if (items.length === 0) {
      setPreview(null)
      setSyncError("")
      return
    }

    const payload = {
      items: items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
    }
    const localSignature = buildCartSignature(
      payload.items.map((item) => ({ id: item.productId, quantity: item.quantity })),
    )
    const localVisualSignature = buildVisualCartSignature(items)

    let isCancelled = false
    const timeoutId = window.setTimeout(async () => {
      setIsSyncing(true)
      try {
        const response = await previewOrderDraft(payload)
        if (isCancelled) return

        setPreview(response)
        setSyncError("")

        const normalizedItems = response.items.map(mapPreviewItemToCartItem)
        const normalizedSignature = buildCartSignature(
          normalizedItems.map((item) => ({ id: item.id, quantity: item.quantity })),
        )
        const normalizedVisualSignature = buildVisualCartSignature(normalizedItems)

        if (
          normalizedSignature !== localSignature ||
          normalizedVisualSignature !== localVisualSignature
        ) {
          startTransition(() => {
            setItems(normalizedItems)
          })
        }

        const issueSignature = buildIssueSignature(response.issues)
        if (response.issues.length > 0 && issueSignature !== lastIssueSignatureRef.current) {
          lastIssueSignatureRef.current = issueSignature
          const firstIssue = response.issues[0]
          toast({
            title: firstIssue.title,
            description: firstIssue.description,
            variant: firstIssue.severity === "error" ? "destructive" : "default",
          })
        }
      } catch (error) {
        if (isCancelled) return
        setSyncError(
          error instanceof Error
            ? error.message
            : "No pudimos validar tu bolsa con el inventario en este momento.",
        )
      } finally {
        if (!isCancelled) {
          setIsSyncing(false)
        }
      }
    }, 260)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [isReady, items])

  const addItem = useCallback((product: Product, quantity = 1) => {
    const safeQuantity = Math.max(1, Math.min(25, Math.floor(quantity)))
    setLastDraft(null)
    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex((item) => item.id === product.id)
      if (existingIndex === -1) {
        return [...currentItems, { ...product, quantity: safeQuantity }]
      }

      return currentItems.map((item, index) =>
        index === existingIndex
          ? { ...item, quantity: Math.min(25, item.quantity + safeQuantity) }
          : item,
      )
    })

    toast({
      title: "Agregado a la bolsa",
      description: `${product.name} ya esta listo en tu bolsa.`,
    })
  }, [])

  const updateItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((currentItems) => currentItems.filter((item) => item.id !== productId))
      return
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId
          ? { ...item, quantity: Math.max(1, Math.min(25, Math.floor(quantity))) }
          : item,
      ),
    )
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setPreview(null)
    setSyncError("")
  }, [])

  const createDraft = useCallback(
    async (payload: CreateDraftPayload) => {
      if (!preview?.signature) {
        throw new Error(
          "No pudimos validar la version actual de tu bolsa. Espera un momento e intenta de nuevo.",
        )
      }

      try {
        const response = await confirmOrder(
          {
            ...payload,
            items: items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
            })),
            previewSignature: preview.signature,
          },
          getAccessToken() ?? undefined,
        )

        setLastDraft(response)
        setItems([])
        setPreview(null)
        setSyncError("")
        setIsSheetOpen(false)

        toast({
          title: "Pedido confirmado",
          description: `Tu folio ${response.reference} ya quedo registrado.`,
        })

        return response
      } catch (error) {
        try {
          const refreshedPreview = await previewOrderDraft({
            items: items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
            })),
          })
          setPreview(refreshedPreview)
          setSyncError("")

          const normalizedItems = refreshedPreview.items.map(mapPreviewItemToCartItem)
          const currentSignature = buildCartSignature(
            items.map((item) => ({ id: item.id, quantity: item.quantity })),
          )
          const refreshedSignature = buildCartSignature(
            normalizedItems.map((item) => ({ id: item.id, quantity: item.quantity })),
          )
          const currentVisualSignature = buildVisualCartSignature(items)
          const refreshedVisualSignature = buildVisualCartSignature(normalizedItems)

          if (
            refreshedSignature !== currentSignature ||
            refreshedVisualSignature !== currentVisualSignature
          ) {
            startTransition(() => {
              setItems(normalizedItems)
            })
          }
        } catch {
          // If revalidation fails, keep the original confirm error as the main signal.
        }

        throw error
      }
    },
    [items, preview?.signature],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      preview,
      itemCount: preview?.totalItems ?? items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal:
        preview?.subtotal ??
        items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      isReady,
      isSyncing,
      syncError,
      isSheetOpen,
      lastDraft,
      addItem,
      updateItemQuantity,
      removeItem,
      clearCart,
      openSheet: () => setIsSheetOpen(true),
      closeSheet: () => setIsSheetOpen(false),
      setSheetOpen: (open) => setIsSheetOpen(open),
      createDraft,
      clearLastDraft: () => setLastDraft(null),
    }),
    [
      addItem,
      clearCart,
      createDraft,
      isReady,
      isSheetOpen,
      isSyncing,
      items,
      lastDraft,
      preview,
      removeItem,
      syncError,
      updateItemQuantity,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within CartProvider")
  }
  return context
}
