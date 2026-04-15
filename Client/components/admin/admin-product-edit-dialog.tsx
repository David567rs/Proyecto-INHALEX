"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import {
  ArrowUpRight,
  Eye,
  History,
  Loader2,
  PackageCheck,
  PencilLine,
  Save,
  ShieldAlert,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  listAdminInventoryMovements,
  type AdminInventoryMovement,
  updateAdminProduct,
  type AdminProduct,
  type UpdateAdminProductInput,
} from "@/lib/admin/admin-api"
import {
  getAvailableUnits,
  getInventoryHealth,
  getMinimumStock,
  getReservedUnits,
  hasTrackedInventory,
} from "@/lib/admin/product-inventory"
import type { ProductCategoryOption } from "@/lib/products/categories"
import { resolveProductDisplayImage } from "@/lib/products/product-images"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ProductEditDraft {
  name: string
  slug: string
  category: string
  price: string
  status: AdminProduct["status"]
  presentation: string
  origin: string
  image: string
  rawMaterialName: string
  rawMaterialInitialStockMl: string
  rawMaterialConsumptionPerBatchMl: string
  rawMaterialBatchYieldUnits: string
  description: string
  longDescription: string
  benefitsText: string
  aromasText: string
  stockMin: string
  allowBackorder: boolean
  sortOrder: string
}

interface AdminProductEditDialogProps {
  product: AdminProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: ProductCategoryOption[]
  categoryLabelById: Record<string, string>
  canManageCatalog: boolean
  onProductSaved: (product: AdminProduct) => Promise<void> | void
}

const PRODUCT_STATUS_LABELS: Record<AdminProduct["status"], string> = {
  draft: "Desactivado",
  active: "Activado",
  archived: "Archivado",
}

const INVENTORY_MOVEMENT_LABELS: Record<string, string> = {
  initialize: "Inventario inicial",
  restock: "Entrada",
  deduct: "Salida",
  set_available: "Ajuste manual",
  reserve: "Reserva",
  release: "Liberacion",
  commit_reserved: "Venta cerrada",
}

function buildDraft(product: AdminProduct): ProductEditDraft {
  return {
    name: product.name ?? "",
    slug: product.slug ?? "",
    category: product.category,
    price: String(product.price),
    status: product.status,
    presentation: product.presentation ?? "",
    origin: product.origin ?? "",
    image: product.image ?? "",
    rawMaterialName: product.rawMaterialName ?? "",
    rawMaterialInitialStockMl:
      typeof product.rawMaterialInitialStockMl === "number"
        ? String(product.rawMaterialInitialStockMl)
        : "",
    rawMaterialConsumptionPerBatchMl:
      typeof product.rawMaterialConsumptionPerBatchMl === "number"
        ? String(product.rawMaterialConsumptionPerBatchMl)
        : "",
    rawMaterialBatchYieldUnits:
      typeof product.rawMaterialBatchYieldUnits === "number"
        ? String(product.rawMaterialBatchYieldUnits)
        : "",
    description: product.description ?? "",
    longDescription: product.longDescription ?? "",
    benefitsText: (product.benefits ?? []).join("\n"),
    aromasText: (product.aromas ?? []).join("\n"),
    stockMin:
      typeof product.stockMin === "number" ? String(product.stockMin) : "0",
    allowBackorder: Boolean(product.allowBackorder),
    sortOrder:
      typeof product.sortOrder === "number" ? String(product.sortOrder) : "",
  }
}

function formatDate(value?: string): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function blockInvalidNumberKey(event: KeyboardEvent<HTMLInputElement>) {
  if (["e", "E", "+", "-"].includes(event.key)) {
    event.preventDefault()
  }
}

function parseLineList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function haveSameList(left: string[] | undefined, right: string[]) {
  const normalizedLeft = (left ?? []).map((item) => item.trim()).filter(Boolean)
  if (normalizedLeft.length !== right.length) return false
  return normalizedLeft.every((item, index) => item === right[index])
}

function buildStatusConfirmation(productName: string, status: AdminProduct["status"]) {
  if (status === "active") {
    return {
      title: "Activar producto",
      description: `Vas a activar "${productName}" para que pueda mostrarse en el catálogo cuando tenga disponibilidad comercial.`,
      actionLabel: "Sí, activar",
    }
  }

  if (status === "draft") {
    return {
      title: "Desactivar producto",
      description: `Vas a desactivar "${productName}". Dejará de operar como producto visible para venta normal hasta que vuelva a activarse.`,
      actionLabel: "Sí, desactivar",
    }
  }

  return {
    title: "Archivar producto",
    description: `Vas a archivar "${productName}". Lo retiraremos del flujo comercial activo, pero conservando historial, ventas e inventario por seguridad.`,
    actionLabel: "Sí, archivar",
  }
}

function getMovementTone(type: string) {
  if (type === "commit_reserved")
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (type === "reserve") return "border-sky-200 bg-sky-50 text-sky-700"
  if (type === "release") return "border-amber-200 bg-amber-50 text-amber-700"
  if (type === "deduct") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-border/70 bg-background text-foreground"
}

export function AdminProductEditDialog({
  product,
  open,
  onOpenChange,
  categories,
  categoryLabelById,
  canManageCatalog,
  onProductSaved,
}: AdminProductEditDialogProps) {
  const { toast } = useToast()
  const [draft, setDraft] = useState<ProductEditDraft | null>(null)
  const [formMessage, setFormMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingPayload, setPendingPayload] =
    useState<UpdateAdminProductInput | null>(null)
  const [historyItems, setHistoryItems] = useState<AdminInventoryMovement[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyMessage, setHistoryMessage] = useState("")

  useEffect(() => {
    if (!product) {
      setDraft(null)
      setFormMessage("")
      setShowAdvanced(false)
      setConfirmOpen(false)
      setPendingPayload(null)
      setHistoryItems([])
      setHistoryMessage("")
      return
    }

    setDraft(buildDraft(product))
    setFormMessage("")
    setShowAdvanced(false)
    setConfirmOpen(false)
    setPendingPayload(null)
  }, [product])

  useEffect(() => {
    if (!product || !open) {
      setHistoryItems([])
      setHistoryMessage("")
      return
    }

    const token = getAccessToken()
    if (!token) {
      setHistoryItems([])
      setHistoryMessage("No pudimos cargar la actividad del producto.")
      return
    }

    let cancelled = false
    setIsHistoryLoading(true)
    setHistoryMessage("")

    void listAdminInventoryMovements(product._id, token, 6)
      .then((response) => {
        if (cancelled) return
        setHistoryItems(response.items)
      })
      .catch((error) => {
        if (cancelled) return
        setHistoryItems([])
        setHistoryMessage(
          error instanceof Error
            ? error.message
            : "No pudimos cargar la actividad del producto.",
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsHistoryLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, product])

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.id !== "all"),
    [categories],
  )

  const inventoryHealth = product ? getInventoryHealth(product) : null
  const previewImage = useMemo(() => {
    if (!product || !draft) return "/placeholder.svg"
    return (
      draft.image.trim() ||
      resolveProductDisplayImage({
        slug: draft.slug || product.slug,
        name: draft.name || product.name,
        image: product.image,
        aromas: parseLineList(draft.aromasText),
      })
    )
  }, [draft, product])
  const currentCategoryLabel = draft
    ? categoryLabelById[draft.category] ?? draft.category
    : product
      ? categoryLabelById[product.category] ?? product.category
      : "-"
  const availableUnitsLabel = product
    ? hasTrackedInventory(product)
      ? String(getAvailableUnits(product))
      : "Sin carga"
    : "-"
  const reservedUnitsLabel = product
    ? hasTrackedInventory(product)
      ? String(getReservedUnits(product))
      : "Sin carga"
    : "-"
  const minimumStockLabel = draft
    ? draft.stockMin.trim() || "0"
    : product
      ? String(getMinimumStock(product))
      : "-"
  const backorderLabel = draft
    ? draft.allowBackorder
      ? "Si"
      : "No"
    : product
      ? product.allowBackorder
        ? "Si"
        : "No"
      : "-"
  const updatedAtLabel = product ? formatDate(product.updatedAt) : "-"
  const rawMaterialPerPieceLabel = useMemo(() => {
    if (!draft) return "-"
    const batchConsumption = Number(draft.rawMaterialConsumptionPerBatchMl)
    const batchYield = Number(draft.rawMaterialBatchYieldUnits)
    if (
      !Number.isFinite(batchConsumption) ||
      !Number.isFinite(batchYield) ||
      batchConsumption <= 0 ||
      batchYield <= 0
    ) {
      return "-"
    }
    return `${(batchConsumption / batchYield).toFixed(2)} ml por pieza`
  }, [draft])

  const buildPayload = (): {
    payload: UpdateAdminProductInput
    hasChanges: boolean
    error?: string
  } => {
    if (!product || !draft) {
      return { payload: {}, hasChanges: false, error: "Producto no disponible." }
    }

    const payload: UpdateAdminProductInput = {}
    const normalizedName = draft.name.trim()
    const normalizedSlug = draft.slug.trim()
    const normalizedDescription = draft.description.trim()
    const normalizedLongDescription = draft.longDescription.trim()
    const normalizedPresentation = draft.presentation.trim()
    const normalizedOrigin = draft.origin.trim()
    const normalizedImage = draft.image.trim()
    const normalizedRawMaterialName = draft.rawMaterialName.trim()
    const normalizedBenefits = parseLineList(draft.benefitsText)
    const normalizedAromas = parseLineList(draft.aromasText)

    if (normalizedName.length < 2) {
      return {
        payload,
        hasChanges: false,
        error: "El nombre debe tener al menos 2 caracteres.",
      }
    }

    if (normalizedSlug.length < 2) {
      return {
        payload,
        hasChanges: false,
        error: "Define un slug valido para este producto.",
      }
    }

    if (!draft.category.trim()) {
      return {
        payload,
        hasChanges: false,
        error: "Selecciona una categoría válida.",
      }
    }

    if (normalizedName !== product.name) {
      payload.name = normalizedName
    }

    if (normalizedSlug !== product.slug) {
      payload.slug = normalizedSlug
    }

    if (draft.category !== product.category) {
      payload.category = draft.category
    }

    const normalizedPrice = draft.price.trim().replace(",", ".")
    if (!normalizedPrice) {
      return {
        payload,
        hasChanges: false,
        error: "Ingresa un precio válido.",
      }
    }

    const parsedPrice = Number(normalizedPrice)
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return {
        payload,
        hasChanges: false,
        error: "El precio no puede ser negativo.",
      }
    }

    const roundedPrice = Number(parsedPrice.toFixed(2))
    if (roundedPrice !== product.price) {
      payload.price = roundedPrice
    }

    if (normalizedDescription.length < 10) {
      return {
        payload,
        hasChanges: false,
        error: "La descripcion corta debe tener al menos 10 caracteres.",
      }
    }

    if (!normalizedPresentation) {
      return {
        payload,
        hasChanges: false,
        error: "Indica la presentacion comercial del producto.",
      }
    }

    if (!normalizedOrigin) {
      return {
        payload,
        hasChanges: false,
        error: "Indica el origen o linea del producto.",
      }
    }

    if (!normalizedImage) {
      return {
        payload,
        hasChanges: false,
        error: "Agrega una ruta o URL de imagen para el producto.",
      }
    }

    if (normalizedDescription !== product.description) {
      payload.description = normalizedDescription
    }

    if (normalizedLongDescription !== (product.longDescription ?? "")) {
      payload.longDescription = normalizedLongDescription
    }

    if (normalizedPresentation !== (product.presentation ?? "")) {
      payload.presentation = normalizedPresentation
    }

    if (normalizedOrigin !== (product.origin ?? "")) {
      payload.origin = normalizedOrigin
    }

    if (normalizedImage !== product.image) {
      payload.image = normalizedImage
    }

    const hasAnyRawMaterialValue = [
      normalizedRawMaterialName,
      draft.rawMaterialInitialStockMl.trim(),
      draft.rawMaterialConsumptionPerBatchMl.trim(),
      draft.rawMaterialBatchYieldUnits.trim(),
    ].some(Boolean)

    if (hasAnyRawMaterialValue) {
      const parsedInitialStockMl = Number(
        draft.rawMaterialInitialStockMl.trim().replace(",", "."),
      )
      if (!Number.isFinite(parsedInitialStockMl) || parsedInitialStockMl <= 0) {
        return {
          payload,
          hasChanges: false,
          error:
            "El stock inicial de materia prima debe ser mayor a 0.",
        }
      }

      const parsedConsumptionPerBatchMl = Number(
        draft.rawMaterialConsumptionPerBatchMl.trim().replace(",", "."),
      )
      if (
        !Number.isFinite(parsedConsumptionPerBatchMl) ||
        parsedConsumptionPerBatchMl <= 0
      ) {
        return {
          payload,
          hasChanges: false,
          error: "El consumo por lote debe ser mayor a 0.",
        }
      }

      const parsedBatchYieldUnits = Number(draft.rawMaterialBatchYieldUnits.trim())
      if (!Number.isInteger(parsedBatchYieldUnits) || parsedBatchYieldUnits <= 0) {
        return {
          payload,
          hasChanges: false,
          error: "El rendimiento por lote debe ser un entero mayor a 0.",
        }
      }

      if (!normalizedRawMaterialName) {
        return {
          payload,
          hasChanges: false,
          error: "Indica la materia prima principal para esta prediccion.",
        }
      }

      if (normalizedRawMaterialName !== (product.rawMaterialName ?? "")) {
        payload.rawMaterialName = normalizedRawMaterialName
      }

      if (
        parsedInitialStockMl !== (product.rawMaterialInitialStockMl ?? undefined)
      ) {
        payload.rawMaterialInitialStockMl = Number(parsedInitialStockMl.toFixed(2))
      }

      if (
        parsedConsumptionPerBatchMl !==
        (product.rawMaterialConsumptionPerBatchMl ?? undefined)
      ) {
        payload.rawMaterialConsumptionPerBatchMl = Number(
          parsedConsumptionPerBatchMl.toFixed(2),
        )
      }

      if (
        parsedBatchYieldUnits !== (product.rawMaterialBatchYieldUnits ?? undefined)
      ) {
        payload.rawMaterialBatchYieldUnits = parsedBatchYieldUnits
      }
    }

    if (!haveSameList(product.benefits, normalizedBenefits)) {
      payload.benefits = normalizedBenefits
    }

    if (!haveSameList(product.aromas, normalizedAromas)) {
      payload.aromas = normalizedAromas
    }

    if (draft.status !== product.status) {
      payload.status = draft.status
    }

    const parsedStockMin = draft.stockMin.trim() ? Number(draft.stockMin) : 0
    if (!Number.isInteger(parsedStockMin) || parsedStockMin < 0) {
      return {
        payload,
        hasChanges: false,
        error: "El stock minimo debe ser un entero mayor o igual a 0.",
      }
    }

    if (hasAnyRawMaterialValue && parsedStockMin <= 0) {
      return {
        payload,
        hasChanges: false,
        error:
          "Para calcular agotamiento define un stock minimo mayor a 0.",
      }
    }

    if (parsedStockMin !== (product.stockMin ?? 0)) {
      payload.stockMin = parsedStockMin
    }

    if (draft.allowBackorder !== Boolean(product.allowBackorder)) {
      payload.allowBackorder = draft.allowBackorder
    }

    if (draft.sortOrder.trim()) {
      const parsedSortOrder = Number(draft.sortOrder)
      if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 1) {
        return {
          payload,
          hasChanges: false,
          error: "El orden debe ser un número entero mayor a 0.",
        }
      }

      if (parsedSortOrder !== product.sortOrder) {
        payload.sortOrder = parsedSortOrder
      }
    }

    return {
      payload,
      hasChanges: Object.keys(payload).length > 0,
    }
  }

  const hasChanges = useMemo(() => buildPayload().hasChanges, [draft, product])

  const submitUpdate = async (payload: UpdateAdminProductInput) => {
    if (!product) return

    const token = getAccessToken()
    if (!token) {
      setFormMessage("Tu sesión no está disponible. Inicia sesión de nuevo.")
      return
    }

    setIsSaving(true)
    setFormMessage("")

    try {
      const updatedProduct = await updateAdminProduct(product._id, payload, token)
      await onProductSaved(updatedProduct)
      toast({
        title: "Producto actualizado",
        description: `${updatedProduct.name} se guardó correctamente.`,
      })
      onOpenChange(false)
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el producto.",
      )
    } finally {
      setIsSaving(false)
      setConfirmOpen(false)
      setPendingPayload(null)
    }
  }

  const handleSave = async () => {
    if (!product) return

    const result = buildPayload()
    if (result.error) {
      setFormMessage(result.error)
      return
    }

    if (!result.hasChanges) {
      setFormMessage("No hay cambios por guardar.")
      return
    }

    if (result.payload.status && result.payload.status !== product.status) {
      setPendingPayload(result.payload)
      setConfirmOpen(true)
      return
    }

    await submitUpdate(result.payload)
  }

  const confirmationCopy = product
    ? buildStatusConfirmation(product.name, draft?.status ?? product.status)
    : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] overflow-hidden p-0 sm:max-w-[min(1120px,calc(100vw-2rem))]">
          <ScrollArea className="max-h-[88vh]">
            <div className="p-5 sm:p-6">
              <DialogHeader className="gap-3 text-left">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PencilLine className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
                    Editar producto
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                    Ajusta la información comercial del catálogo. Las existencias se
                    administran desde inventario para conservar historial y auditoría.
                  </DialogDescription>
                </div>
              </DialogHeader>

              {!product || !draft ? (
                <div className="py-10 text-sm text-muted-foreground">
                  No encontramos el producto seleccionado.
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18.5rem,20rem)] xl:items-start">
                    <section className="admin-section-card min-w-0 p-5 sm:p-6">
                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,21rem)] xl:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                Producto
                              </p>
                              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                                {draft.name || product.name}
                              </h3>
                              <p className="mt-3 text-base leading-8 text-muted-foreground">
                                {currentCategoryLabel}
                                {" / "}
                                {draft.presentation || product.presentation || "-"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="rounded-full">
                                {PRODUCT_STATUS_LABELS[draft.status]}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn("rounded-full", inventoryHealth?.className)}
                              >
                                {inventoryHealth?.label}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-3 text-sm text-foreground">
                            <div className="flex items-start gap-3">
                              <PackageCheck className="mt-0.5 h-4 w-4 text-primary" />
                              <p>{inventoryHealth?.helper}</p>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="min-w-0 rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Slug publico
                              </p>
                              <p className="mt-2 break-all text-base font-medium text-foreground">
                                {draft.slug || product.slug}
                              </p>
                            </div>

                            <div className="min-w-0 rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Actualizado
                              </p>
                              <p className="mt-2 text-base font-medium leading-7 text-foreground">
                                {updatedAtLabel}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 space-y-4">
                          <div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
                            <div className="relative aspect-[4/3] w-full bg-muted/20">
                              <img
                                src={previewImage}
                                alt={draft.name || product.name}
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute left-3 top-3 rounded-full border border-black/10 bg-white/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                                Vista previa
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Imagen del catalogo
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              La vista previa toma la imagen configurada para este
                              producto y se actualiza al cambiar la ruta o URL.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline" className="rounded-full bg-background/90">
                                {draft.presentation || product.presentation || "-"}
                              </Badge>
                              <Badge variant="outline" className="rounded-full bg-background/90">
                                {draft.slug || product.slug}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="admin-section-card min-w-0 p-4 sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Operacion
                      </p>
                      <div className="mt-4 grid gap-3">
                        <Button
                          asChild
                          variant="outline"
                          className="h-11 justify-start rounded-xl"
                        >
                          <Link href={`/admin/catalogo/inventario?producto=${product._id}`}>
                            <PackageCheck className="mr-2 h-4 w-4" />
                            Abrir inventario
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="h-11 justify-start rounded-xl"
                        >
                          <Link href={`/productos/${product.slug}`} target="_blank">
                            <Eye className="mr-2 h-4 w-4" />
                            Ver en el sitio
                            <ArrowUpRight className="ml-auto h-4 w-4" />
                          </Link>
                        </Button>
                      </div>

                      <div className="mt-4 rounded-xl border border-border/60 bg-secondary/20 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Resumen de inventario
                          </p>
                          <Badge
                            variant="outline"
                            className={cn("rounded-full", inventoryHealth?.className)}
                          >
                            {inventoryHealth?.label}
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
                            <p className="text-xs text-muted-foreground">Libres</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">
                              {availableUnitsLabel}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
                            <p className="text-xs text-muted-foreground">Reservadas</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">
                              {reservedUnitsLabel}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
                            <p className="text-xs text-muted-foreground">Stock minimo</p>
                            <p className="mt-1 text-xl font-semibold text-foreground">
                              {minimumStockLabel}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
                            <p className="text-xs text-muted-foreground">Bajo pedido</p>
                            <p className="mt-1 text-xl font-semibold text-foreground">
                              {backorderLabel}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <div className="flex items-start gap-3">
                          <ShieldAlert className="mt-0.5 h-4 w-4" />
                          <p>
                            Para retirar un producto del flujo comercial usamos{" "}
                            <span className="font-semibold">Archivado</span> en lugar
                            de borrado físico. Así protegemos ventas, pedidos,
                            inventario y auditoría.
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>

                  <section className="admin-section-card p-4">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">
                        Actividad reciente
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ultimos movimientos de inventario ligados a este producto.
                    </p>

                    {isHistoryLoading ? (
                      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Cargando actividad...
                      </div>
                    ) : historyMessage ? (
                      <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {historyMessage}
                      </div>
                    ) : historyItems.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                        Aun no hay movimientos registrados para este producto.
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {historyItems.map((movement) => (
                          <div
                            key={movement.id}
                            className="rounded-xl border border-border/60 bg-background/70 px-4 py-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full",
                                    getMovementTone(movement.type),
                                  )}
                                >
                                  {INVENTORY_MOVEMENT_LABELS[movement.type] ??
                                    movement.type}
                                </Badge>
                                <p className="mt-2 text-sm font-semibold text-foreground">
                                  {movement.quantity} unidades
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatDate(movement.createdAt)}
                                </p>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>
                                  Disponible: {movement.nextAvailable} / Reservado:{" "}
                                  {movement.nextReserved}
                                </p>
                                {movement.actorEmail ? (
                                  <p className="mt-1">{movement.actorEmail}</p>
                                ) : null}
                              </div>
                            </div>
                            {movement.note ? (
                              <p className="mt-3 text-sm text-muted-foreground">
                                {movement.note}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="admin-section-card p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Datos comerciales
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aquí ajustas lo que afecta la venta y la visibilidad del
                      catálogo.
                    </p>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="product-name">Nombre</Label>
                        <Input
                          id="product-name"
                          className="admin-input-surface"
                          value={draft.name}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) => {
                            setDraft((prev) =>
                              prev ? { ...prev, name: event.target.value } : prev,
                            )
                            setFormMessage("")
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="product-slug">Slug publico</Label>
                        <Input
                          id="product-slug"
                          className="admin-input-surface"
                          value={draft.slug}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) => {
                            setDraft((prev) =>
                              prev ? { ...prev, slug: event.target.value } : prev,
                            )
                            setFormMessage("")
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="product-presentation">Presentacion</Label>
                        <Input
                          id="product-presentation"
                          className="admin-input-surface"
                          value={draft.presentation}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) => {
                            setDraft((prev) =>
                              prev
                                ? { ...prev, presentation: event.target.value }
                                : prev,
                            )
                            setFormMessage("")
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="product-origin">Origen o linea</Label>
                        <Input
                          id="product-origin"
                          className="admin-input-surface"
                          value={draft.origin}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) => {
                            setDraft((prev) =>
                              prev ? { ...prev, origin: event.target.value } : prev,
                            )
                            setFormMessage("")
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Categoría
                        </p>
                        <Select
                          value={draft.category}
                          onValueChange={(value) => {
                            setDraft((prev) =>
                              prev ? { ...prev, category: value } : prev,
                            )
                            setFormMessage("")
                          }}
                          disabled={isSaving || !canManageCatalog}
                        >
                          <SelectTrigger className="admin-input-surface">
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Precio
                        </p>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          className="admin-input-surface"
                          value={draft.price}
                          disabled={isSaving || !canManageCatalog}
                          onKeyDown={blockInvalidNumberKey}
                          onChange={(event) => {
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    price: event.target.value.replace("-", ""),
                                  }
                                : prev,
                            )
                            setFormMessage("")
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Estado
                        </p>
                        <Select
                          value={draft.status}
                          onValueChange={(value) => {
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    status: value as AdminProduct["status"],
                                  }
                                : prev,
                            )
                            setFormMessage("")
                          }}
                          disabled={isSaving || !canManageCatalog}
                        >
                          <SelectTrigger className="admin-input-surface">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activado</SelectItem>
                            <SelectItem value="draft">Desactivado</SelectItem>
                            <SelectItem value="archived">Archivado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div className="space-y-2 xl:col-span-2">
                        <Label htmlFor="product-image">Ruta o URL de imagen</Label>
                        <Input
                          id="product-image"
                          className="admin-input-surface"
                          value={draft.image}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) => {
                            setDraft((prev) =>
                              prev ? { ...prev, image: event.target.value } : prev,
                            )
                            setFormMessage("")
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="product-description">Descripcion corta</Label>
                        <Textarea
                          id="product-description"
                          className="admin-input-surface min-h-[120px]"
                          value={draft.description}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) => {
                            setDraft((prev) =>
                              prev
                                ? { ...prev, description: event.target.value }
                                : prev,
                            )
                            setFormMessage("")
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="product-long-description">
                          Descripcion extendida
                        </Label>
                        <Textarea
                          id="product-long-description"
                          className="admin-input-surface min-h-[120px]"
                          value={draft.longDescription}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) => {
                            setDraft((prev) =>
                              prev
                                ? { ...prev, longDescription: event.target.value }
                                : prev,
                            )
                            setFormMessage("")
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="product-benefits">Beneficios</Label>
                        <Textarea
                          id="product-benefits"
                          className="admin-input-surface min-h-[132px]"
                          value={draft.benefitsText}
                          disabled={isSaving || !canManageCatalog}
                          placeholder={"Relajacion\nBienestar respiratorio"}
                          onChange={(event) => {
                            setDraft((prev) =>
                              prev
                                ? { ...prev, benefitsText: event.target.value }
                                : prev,
                            )
                            setFormMessage("")
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="product-aromas">Aromas o claves</Label>
                        <Textarea
                          id="product-aromas"
                          className="admin-input-surface min-h-[132px]"
                          value={draft.aromasText}
                          disabled={isSaving || !canManageCatalog}
                          placeholder={"toronjil\nmelisa"}
                          onChange={(event) => {
                            setDraft((prev) =>
                              prev
                                ? { ...prev, aromasText: event.target.value }
                                : prev,
                            )
                            setFormMessage("")
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-border/60 bg-secondary/15 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Materia prima y agotamiento
                          </p>
                          <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            Esta configuracion alimenta la prediccion de agotamiento
                            en Ventas. El nivel critico se toma del stock minimo.
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-full bg-background/80">
                          {rawMaterialPerPieceLabel}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="product-raw-material-name">
                            Materia prima principal
                          </Label>
                          <Input
                            id="product-raw-material-name"
                            className="admin-input-surface"
                            value={draft.rawMaterialName}
                            disabled={isSaving || !canManageCatalog}
                            placeholder="Compuesto de lavanda"
                            onChange={(event) => {
                              setDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      rawMaterialName: event.target.value,
                                    }
                                  : prev,
                              )
                              setFormMessage("")
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="product-raw-material-stock">
                            Stock inicial (ml)
                          </Label>
                          <Input
                            id="product-raw-material-stock"
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            className="admin-input-surface"
                            value={draft.rawMaterialInitialStockMl}
                            disabled={isSaving || !canManageCatalog}
                            onKeyDown={blockInvalidNumberKey}
                            onChange={(event) => {
                              setDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      rawMaterialInitialStockMl: event.target.value.replace(
                                        "-",
                                        "",
                                      ),
                                    }
                                  : prev,
                              )
                              setFormMessage("")
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="product-raw-material-consumption">
                            Consumo por lote (ml)
                          </Label>
                          <Input
                            id="product-raw-material-consumption"
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            className="admin-input-surface"
                            value={draft.rawMaterialConsumptionPerBatchMl}
                            disabled={isSaving || !canManageCatalog}
                            onKeyDown={blockInvalidNumberKey}
                            onChange={(event) => {
                              setDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      rawMaterialConsumptionPerBatchMl:
                                        event.target.value.replace("-", ""),
                                    }
                                  : prev,
                              )
                              setFormMessage("")
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="product-raw-material-yield">
                            Rendimiento por lote (piezas)
                          </Label>
                          <Input
                            id="product-raw-material-yield"
                            type="number"
                            min={1}
                            step="1"
                            inputMode="numeric"
                            className="admin-input-surface"
                            value={draft.rawMaterialBatchYieldUnits}
                            disabled={isSaving || !canManageCatalog}
                            onKeyDown={blockInvalidNumberKey}
                            onChange={(event) => {
                              setDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      rawMaterialBatchYieldUnits:
                                        event.target.value.replace("-", ""),
                                    }
                                  : prev,
                              )
                              setFormMessage("")
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-4 text-sm font-medium text-primary transition-opacity hover:opacity-80"
                      onClick={() => setShowAdvanced((prev) => !prev)}
                    >
                      {showAdvanced ? "Ocultar ajustes avanzados" : "Mostrar ajustes avanzados"}
                    </button>

                    {showAdvanced ? (
                      <div className="mt-4 grid gap-4 rounded-xl border border-border/60 bg-background/70 p-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="product-stock-min">Stock minimo</Label>
                          <Input
                            id="product-stock-min"
                            type="number"
                            min={0}
                            step="1"
                            inputMode="numeric"
                            className="admin-input-surface"
                            value={draft.stockMin}
                            disabled={isSaving || !canManageCatalog}
                            onKeyDown={blockInvalidNumberKey}
                            onChange={(event) => {
                              setDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      stockMin: event.target.value.replace("-", ""),
                                    }
                                  : prev,
                              )
                              setFormMessage("")
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Orden en catálogo
                          </p>
                          <Input
                            type="number"
                            min={1}
                            step="1"
                            inputMode="numeric"
                            className="admin-input-surface"
                            value={draft.sortOrder}
                            disabled={isSaving || !canManageCatalog}
                            onKeyDown={blockInvalidNumberKey}
                            onChange={(event) => {
                              setDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      sortOrder: event.target.value.replace("-", ""),
                                    }
                                  : prev,
                              )
                              setFormMessage("")
                            }}
                          />
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background px-4 py-3 md:col-span-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Label htmlFor="product-backorder">
                                Permitir bajo pedido
                              </Label>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Si no hay piezas libres, el producto puede seguir
                                aceptando pedidos para revision comercial.
                              </p>
                            </div>
                            <Switch
                              id="product-backorder"
                              checked={draft.allowBackorder}
                              disabled={isSaving || !canManageCatalog}
                              onCheckedChange={(checked) => {
                                setDraft((prev) =>
                                  prev
                                    ? { ...prev, allowBackorder: checked }
                                    : prev,
                                )
                                setFormMessage("")
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Información
                          </p>
                          <div className="admin-input-surface flex min-h-10 items-center rounded-md px-3 text-sm text-muted-foreground">
                            Este campo es opcional y solo afecta el orden visual.
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {formMessage ? (
                      <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {formMessage}
                      </div>
                    ) : null}
                  </section>
                </div>
              )}

              <DialogFooter className="mt-6 border-t border-border/60 px-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!product || !canManageCatalog || isSaving || !hasChanges}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar cambios
                </Button>
              </DialogFooter>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationCopy?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(event) => {
                event.preventDefault()
                if (!pendingPayload) {
                  setConfirmOpen(false)
                  return
                }
                void submitUpdate(pendingPayload)
              }}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {confirmationCopy?.actionLabel ?? "Continuar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
