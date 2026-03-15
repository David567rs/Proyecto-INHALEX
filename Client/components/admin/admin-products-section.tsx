"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { AlertTriangle, Database, Download, FileSpreadsheet, Plus, RefreshCw, Save, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PRODUCT_CATEGORIES } from "@/lib/products/categories"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  createAdminProductCategory,
  exportAdminProductsCsv,
  exportAdminProductsTemplateCsv,
  importAdminProductsCsv,
  listAdminProductCategories,
  listAdminProducts,
  seedAdminProducts,
  updateAdminProduct,
  type AdminProductCategory,
  type AdminProduct,
} from "@/lib/admin/admin-api"
import type { ProductCategoryOption } from "@/lib/products/categories"
import { useAuth } from "@/components/auth/auth-provider"

interface ProductDraft {
  category: string
  price: string
  status: AdminProduct["status"]
  inStock: "true" | "false"
  sortOrder: string
}

interface ProductListMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ProductFilters {
  search: string
  category: string
  status: "all" | AdminProduct["status"]
  inStock: "all" | "true" | "false"
  page: number
  limit: number
}

const INITIAL_PRODUCT_FILTERS: ProductFilters = {
  search: "",
  category: "all",
  status: "all",
  inStock: "all",
  page: 1,
  limit: 10,
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

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
  }).format(value)
}

function statusVariant(status: AdminProduct["status"]): "default" | "secondary" | "outline" {
  if (status === "active") return "default"
  if (status === "draft") return "secondary"
  return "outline"
}

const PRODUCT_STATUS_LABELS: Record<AdminProduct["status"], string> = {
  draft: "Borrador",
  active: "Activo",
  archived: "Archivado",
}

function statusLabel(status: AdminProduct["status"]): string {
  return PRODUCT_STATUS_LABELS[status]
}

function stockLabel(inStock: "true" | "false"): string {
  return inStock === "true" ? "Disponible" : "Agotado"
}

function buildCategoryLabelMap(categories: ProductCategoryOption[]): Record<string, string> {
  return categories.reduce<Record<string, string>>((acc, category) => {
    acc[category.id] = category.name
    return acc
  }, {})
}

function buildCategoryOptions(categories: AdminProductCategory[]): ProductCategoryOption[] {
  return [
    { id: "all", name: "Todas" },
    ...categories.map((category) => ({
      id: category.slug,
      name: category.name,
    })),
  ]
}

function buildProductDraft(product: AdminProduct): ProductDraft {
  return {
    category: product.category,
    price: String(product.price),
    status: product.status,
    inStock: product.inStock ? "true" : "false",
    sortOrder: product.sortOrder !== undefined ? String(product.sortOrder) : "",
  }
}

function detectCsvDelimiter(raw: string): "," | ";" {
  const firstLine = raw.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? ""
  const semicolonCount = (firstLine.match(/;/g) ?? []).length
  const commaCount = (firstLine.match(/,/g) ?? []).length
  return semicolonCount > commaCount ? ";" : ","
}

function parseCsvMatrix(raw: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let currentCell = ""
  let inQuotes = false
  const text = raw.replace(/^\uFEFF/, "")

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = index + 1 < text.length ? text[index + 1] : ""

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentCell += "\""
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === delimiter) {
      row.push(currentCell)
      currentCell = ""
      continue
    }

    if (!inQuotes && char === "\n") {
      row.push(currentCell)
      rows.push(row)
      row = []
      currentCell = ""
      continue
    }

    if (!inQuotes && char === "\r") {
      continue
    }

    currentCell += char
  }

  row.push(currentCell)
  if (row.some((value) => value.trim() !== "")) {
    rows.push(row)
  }

  return rows
}

function normalizeCsvHeader(header: string): string {
  const normalized = header.trim().toLowerCase()
  switch (normalized) {
    case "id":
      return "id"
    case "slug":
      return "slug"
    case "nombre":
      return "nombre"
    case "categoria":
    case "categoría":
      return "categoria"
    case "precio":
      return "precio"
    case "moneda":
      return "moneda"
    case "presentacion":
    case "presentación":
      return "presentacion"
    case "presentation_ml":
    case "presentacion_ml":
    case "ml":
    case "mililitros":
      return "presentation_ml"
    case "estado":
      return "estado"
    case "disponible":
    case "instock":
      return "disponible"
    case "orden":
    case "sortorder":
      return "orden"
    default:
      return ""
  }
}

function parseCsvObjects(raw: string): Array<Record<string, string>> {
  const delimiter = detectCsvDelimiter(raw)
  const matrix = parseCsvMatrix(raw, delimiter)
  if (matrix.length === 0) return []

  const headers = matrix[0].map((cell) => normalizeCsvHeader(cell))
  const rows: Array<Record<string, string>> = []

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const matrixRow = matrix[rowIndex]
    const row: Record<string, string> = {}
    let hasValue = false

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      const header = headers[columnIndex]
      if (!header) continue
      const value = (matrixRow[columnIndex] ?? "").trim()
      if (value !== "") {
        row[header] = value
        hasValue = true
      }
    }

    if (hasValue) {
      rows.push(row)
    }
  }

  return rows
}

export function AdminProductsSection() {
  const { user } = useAuth()
  const csvFileInputRef = useRef<HTMLInputElement | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categoryOptions, setCategoryOptions] = useState<ProductCategoryOption[]>(PRODUCT_CATEGORIES)
  const [productDraftsById, setProductDraftsById] = useState<Record<string, ProductDraft>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSeedingProducts, setIsSeedingProducts] = useState(false)
  const [seedProductsMessage, setSeedProductsMessage] = useState("")
  const [isExportingProductsCsv, setIsExportingProductsCsv] = useState(false)
  const [isExportingProductsTemplate, setIsExportingProductsTemplate] = useState(false)
  const [isImportingProductsCsv, setIsImportingProductsCsv] = useState(false)
  const [csvMessage, setCsvMessage] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [createCategoryMessage, setCreateCategoryMessage] = useState("")
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [savingProductById, setSavingProductById] = useState<Record<string, boolean>>({})
  const [rowMessageById, setRowMessageById] = useState<Record<string, string>>({})
  const [filters, setFilters] = useState<ProductFilters>(INITIAL_PRODUCT_FILTERS)
  const [searchInput, setSearchInput] = useState("")
  const [meta, setMeta] = useState<ProductListMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  })
  const canManageCatalog = user?.role === "admin"

  const totalActiveProductsInPage = useMemo(
    () => products.filter((product) => product.status === "active").length,
    [products],
  )

  const productCategoryOptions = useMemo(
    () => categoryOptions.filter((category) => category.id !== "all"),
    [categoryOptions],
  )
  const categoryLabelById = useMemo(
    () => buildCategoryLabelMap(categoryOptions),
    [categoryOptions],
  )
  const editingProduct = useMemo(
    () => products.find((product) => product._id === editingProductId) ?? null,
    [products, editingProductId],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev
        return {
          ...prev,
          search: searchInput,
          page: 1,
        }
      })
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const setFilter = useCallback((patch: Partial<ProductFilters>, resetPage = true) => {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? prev.page),
    }))
  }, [])

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")

    const token = getAccessToken()
    if (!token) {
      setProducts([])
      setErrorMessage("No se encontro token de acceso")
      setIsLoading(false)
      return
    }

    try {
      const [response, categoriesResponse] = await Promise.all([
        listAdminProducts(token, {
          search: filters.search.trim() || undefined,
          category: filters.category !== "all" ? filters.category : undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          inStock: filters.inStock === "all" ? undefined : filters.inStock === "true",
          page: filters.page,
          limit: filters.limit,
        }),
        listAdminProductCategories(token),
      ])

      const dynamicCategoryOptions = buildCategoryOptions(categoriesResponse)
      setCategoryOptions(
        dynamicCategoryOptions.length > 1 ? dynamicCategoryOptions : PRODUCT_CATEGORIES,
      )

      setProducts(response.items)
      setMeta({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      })
      setProductDraftsById(
        response.items.reduce<Record<string, ProductDraft>>((acc, product) => {
          acc[product._id] = buildProductDraft(product)
          return acc
        }, {}),
      )
      if (editingProductId && !response.items.some((product) => product._id === editingProductId)) {
        setEditingProductId(null)
      }
      setRowMessageById({})
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar los productos"
      setErrorMessage(message)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportProductsCsv = async () => {
    const token = getAccessToken()
    if (!token) {
      setCsvMessage("No se encontro token")
      return
    }

    setIsExportingProductsCsv(true)
    setCsvMessage("")

    try {
      const exported = await exportAdminProductsCsv(token, {
        search: filters.search.trim() || undefined,
        category: filters.category !== "all" ? filters.category : undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        inStock: filters.inStock === "all" ? undefined : filters.inStock === "true",
      })
      triggerBlobDownload(exported.blob, exported.fileName)
      setCsvMessage("CSV de productos descargado correctamente.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo exportar el CSV de productos"
      setCsvMessage(message)
    } finally {
      setIsExportingProductsCsv(false)
    }
  }

  const handleExportProductsTemplate = async () => {
    const token = getAccessToken()
    if (!token) {
      setCsvMessage("No se encontro token")
      return
    }

    setIsExportingProductsTemplate(true)
    setCsvMessage("")

    try {
      const exported = await exportAdminProductsTemplateCsv(token)
      triggerBlobDownload(exported.blob, exported.fileName)
      setCsvMessage("Plantilla CSV descargada. Puedes abrirla en Excel y editar en bloque.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo descargar la plantilla CSV"
      setCsvMessage(message)
    } finally {
      setIsExportingProductsTemplate(false)
    }
  }

  const handleImportProductsCsvFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const token = getAccessToken()
    if (!token) {
      setCsvMessage("No se encontro token")
      event.target.value = ""
      return
    }

    setIsImportingProductsCsv(true)
    setCsvMessage("")

    try {
      const fileContent = await file.text()
      const rows = parseCsvObjects(fileContent)

      if (rows.length === 0) {
        setCsvMessage("El archivo no tiene filas validas para importar.")
        return
      }

      const result = await importAdminProductsCsv(rows, token)
      const firstError = result.errors[0]
      const errorHint = firstError
        ? ` Primera falla: fila ${firstError.row} (${firstError.idOrSlug}) - ${firstError.message}.`
        : ""
      setCsvMessage(
        `Importacion completada. Actualizados: ${result.updated}, omitidos: ${result.skipped}, fallidos: ${result.failed}.${errorHint}`,
      )
      await loadProducts()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo importar el CSV de productos"
      setCsvMessage(message)
    } finally {
      setIsImportingProductsCsv(false)
      event.target.value = ""
    }
  }

  const updateProductDraft = (productId: string, draft: Partial<ProductDraft>) => {
    setEditingProductId(productId)
    setProductDraftsById((prev) => {
      const previous = prev[productId]
      if (!previous) return prev
      return {
        ...prev,
        [productId]: {
          ...previous,
          ...draft,
        },
      }
    })

    setRowMessageById((prev) => ({
      ...prev,
      [productId]: "",
    }))
  }

  const hasChanges = (product: AdminProduct): boolean => {
    const draft = productDraftsById[product._id]
    if (!draft) return false

    const draftPrice = Number(draft.price)
    const draftInStock = draft.inStock === "true"
    const draftSortOrder = draft.sortOrder.trim() === "" ? product.sortOrder : Number(draft.sortOrder)

    if (draft.category !== product.category) return true
    if (!Number.isNaN(draftPrice) && draftPrice !== product.price) return true
    if (draft.status !== product.status) return true
    if (draftInStock !== product.inStock) return true
    if (draftSortOrder !== product.sortOrder) return true
    return false
  }

  const saveProduct = async (product: AdminProduct) => {
    const token = getAccessToken()
    if (!token) {
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "No se encontro token",
      }))
      return
    }

    const draft = productDraftsById[product._id]
    if (!draft) return

    const payload: {
      category?: string
      price?: number
      status?: AdminProduct["status"]
      inStock?: boolean
      sortOrder?: number
    } = {}

    if (draft.category.trim() === "") {
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "Categoria invalida",
      }))
      return
    }

    if (draft.category !== product.category) payload.category = draft.category

    if (draft.price.trim() === "") {
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "Precio invalido",
      }))
      return
    }

    const parsedPrice = Number(draft.price)
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "Precio invalido",
      }))
      return
    }

    if (parsedPrice !== product.price) payload.price = parsedPrice
    if (draft.status !== product.status) payload.status = draft.status

    const draftInStock = draft.inStock === "true"
    if (draftInStock !== product.inStock) payload.inStock = draftInStock

    if (draft.sortOrder.trim() !== "") {
      const parsedSortOrder = Number(draft.sortOrder)
      if (Number.isNaN(parsedSortOrder) || parsedSortOrder < 1) {
        setRowMessageById((prev) => ({
          ...prev,
          [product._id]: "Orden invalido",
        }))
        return
      }
      if (parsedSortOrder !== product.sortOrder) payload.sortOrder = parsedSortOrder
    }

    if (Object.keys(payload).length === 0) {
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "No hay cambios",
      }))
      return
    }

    setSavingProductById((prev) => ({
      ...prev,
      [product._id]: true,
    }))

    try {
      const updatedProduct = await updateAdminProduct(product._id, payload, token)

      setProducts((prev) =>
        prev.map((currentProduct) =>
          currentProduct._id === updatedProduct._id ? updatedProduct : currentProduct,
        ),
      )

      setProductDraftsById((prev) => ({
        ...prev,
        [product._id]: buildProductDraft(updatedProduct),
      }))

      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: "Guardado",
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar el producto"
      setRowMessageById((prev) => ({
        ...prev,
        [product._id]: message,
      }))
    } finally {
      setSavingProductById((prev) => ({
        ...prev,
        [product._id]: false,
      }))
    }
  }

  const handleSeedProducts = async () => {
    const token = getAccessToken()
    if (!token) {
      setSeedProductsMessage("No se encontro token")
      return
    }

    setIsSeedingProducts(true)
    setSeedProductsMessage("")

    try {
      const response = await seedAdminProducts(token)
      setSeedProductsMessage(
        `Catalogo sembrado. Creados: ${response.created}, actualizados: ${response.updated}.`,
      )
      await loadProducts()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo sembrar el catalogo"
      setSeedProductsMessage(message)
    } finally {
      setIsSeedingProducts(false)
    }
  }

  const handleCreateCategory = async () => {
    const token = getAccessToken()
    if (!token) {
      setCreateCategoryMessage("No se encontro token")
      return
    }

    const normalizedName = newCategoryName.trim()
    if (normalizedName.length < 2) {
      setCreateCategoryMessage("Escribe un nombre de categoria valido")
      return
    }

    setIsCreatingCategory(true)
    setCreateCategoryMessage("")

    try {
      const createdCategory = await createAdminProductCategory(
        { name: normalizedName, isActive: true },
        token,
      )
      setCategoryOptions((prev) => {
        const alreadyExists = prev.some((category) => category.id === createdCategory.slug)
        if (alreadyExists) return prev

        const next = [
          ...prev,
          {
            id: createdCategory.slug,
            name: createdCategory.name,
          },
        ]

        const [allOption, ...rest] = next
        rest.sort((a, b) => a.name.localeCompare(b.name, "es-MX"))
        return allOption ? [allOption, ...rest] : rest
      })
      setFilter({ category: createdCategory.slug })
      if (editingProductId) {
        setProductDraftsById((prev) => {
          const productDraft = prev[editingProductId]
          if (!productDraft) return prev
          return {
            ...prev,
            [editingProductId]: {
              ...productDraft,
              category: createdCategory.slug,
            },
          }
        })
        setRowMessageById((prev) => ({
          ...prev,
          [editingProductId]: "Categoria nueva asignada. Falta guardar.",
        }))
        setCreateCategoryMessage(`Categoria creada y asignada: ${createdCategory.name}`)
      } else {
        setCreateCategoryMessage(`Categoria creada: ${createdCategory.name}`)
      }
      setNewCategoryName("")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la categoria"
      setCreateCategoryMessage(message)
    } finally {
      setIsCreatingCategory(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur">
      <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-amber-300/10 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-primary">Productos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Catalogo conectado a <code>GET/PATCH /api/admin/products</code> y precarga con
            <code> POST /api/admin/products/seed-defaults</code>. Flujo CSV en
            <code> GET /api/admin/products/csv</code> y
            <code> POST /api/admin/products/csv/import</code>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="transition-all hover:-translate-y-0.5"
            onClick={() => void loadProducts()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Recargar productos
          </Button>
          {canManageCatalog && (
            <Button
              type="button"
              variant="outline"
              className="transition-all hover:-translate-y-0.5"
              onClick={() => void handleExportProductsTemplate()}
              disabled={isExportingProductsTemplate}
            >
              <FileSpreadsheet
                className={`mr-2 h-4 w-4 ${isExportingProductsTemplate ? "animate-spin" : ""}`}
              />
              {isExportingProductsTemplate ? "Descargando..." : "Plantilla CSV"}
            </Button>
          )}
          {canManageCatalog && (
            <Button
              type="button"
              variant="outline"
              className="transition-all hover:-translate-y-0.5"
              onClick={() => void handleExportProductsCsv()}
              disabled={isExportingProductsCsv}
            >
              <Download className={`mr-2 h-4 w-4 ${isExportingProductsCsv ? "animate-spin" : ""}`} />
              {isExportingProductsCsv ? "Exportando..." : "Exportar CSV"}
            </Button>
          )}
          {canManageCatalog && (
            <Button
              type="button"
              variant="outline"
              className="transition-all hover:-translate-y-0.5"
              onClick={() => csvFileInputRef.current?.click()}
              disabled={isImportingProductsCsv}
            >
              <Upload className={`mr-2 h-4 w-4 ${isImportingProductsCsv ? "animate-spin" : ""}`} />
              {isImportingProductsCsv ? "Importando..." : "Importar CSV"}
            </Button>
          )}
          {canManageCatalog && (
            <Button
              type="button"
              className="transition-all hover:-translate-y-0.5"
              onClick={() => void handleSeedProducts()}
              disabled={isSeedingProducts}
            >
              <Database className={`mr-2 h-4 w-4 ${isSeedingProducts ? "animate-spin" : ""}`} />
              {isSeedingProducts ? "Sembrando..." : "Sembrar catalogo"}
            </Button>
          )}
        </div>
      </div>

      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => void handleImportProductsCsvFile(event)}
      />

      {canManageCatalog && (
        <div className="relative z-10 mt-4 rounded-xl border border-border/60 bg-secondary/20 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Nueva categoria (ej. Linea relajante)"
              value={newCategoryName}
              maxLength={80}
              onChange={(event) => {
                setNewCategoryName(event.target.value)
                setCreateCategoryMessage("")
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="sm:w-auto"
              onClick={() => void handleCreateCategory()}
              disabled={isCreatingCategory}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCreatingCategory ? "Creando..." : "Crear categoria"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {editingProduct
              ? `Producto en edicion: ${editingProduct.name}. La categoria nueva se asignara automaticamente a esta fila.`
              : "Selecciona o edita una fila para asignar la nueva categoria automaticamente."}
          </p>
          {createCategoryMessage && (
            <p className="mt-2 text-xs text-muted-foreground">{createCategoryMessage}</p>
          )}
        </div>
      )}

      <div className="relative z-10 mt-6 flex flex-wrap gap-3">
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/35">
          <span className="font-medium">Total filtrados:</span> {meta.total}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/35">
          <span className="font-medium">Activos en pagina:</span> {totalActiveProductsInPage}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/35">
          <span className="font-medium">Pagina:</span> {meta.page} / {meta.totalPages}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Input
          className="min-w-[240px] flex-[2_1_300px]"
          placeholder="Buscar por nombre o descripcion"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />

        <div className="min-w-[180px] flex-1">
          <Select value={filters.category} onValueChange={(value) => setFilter({ category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {productCategoryOptions.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px] flex-1">
          <Select
            value={filters.status}
            onValueChange={(value) => setFilter({ status: value as ProductFilters["status"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">{statusLabel("draft")}</SelectItem>
              <SelectItem value="active">{statusLabel("active")}</SelectItem>
              <SelectItem value="archived">{statusLabel("archived")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px] flex-1">
          <Select
            value={filters.inStock}
            onValueChange={(value) => setFilter({ inStock: value as ProductFilters["inStock"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Disponibilidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">{stockLabel("true")}</SelectItem>
              <SelectItem value="false">{stockLabel("false")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[120px] flex-1">
          <Select value={String(filters.limit)} onValueChange={(value) => setFilter({ limit: Number(value) })}>
            <SelectTrigger>
              <SelectValue placeholder="Registros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {errorMessage && (
        <div className="relative z-10 mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        </div>
      )}

      {seedProductsMessage && (
        <div className="relative z-10 mt-4 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-foreground">
          <p className="inline-flex items-start gap-2">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{seedProductsMessage}</span>
          </p>
        </div>
      )}

      {csvMessage && (
        <div className="relative z-10 mt-4 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-foreground">
          <p className="inline-flex items-start gap-2">
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{csvMessage}</span>
          </p>
        </div>
      )}

      <div className="relative z-10 mt-6 hidden overflow-hidden rounded-xl border border-border/60 bg-card/80 2xl:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30">
              <TableHead>Producto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Disponibilidad</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`product-skeleton-${index}`} className="animate-pulse">
                  <TableCell>
                    <div className="space-y-2">
                      <div className="h-4 w-36 rounded bg-secondary/60" />
                      <div className="h-3 w-24 rounded bg-secondary/50" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-28 rounded bg-secondary/60" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="h-9 w-28 rounded-md bg-secondary/60" />
                      <div className="h-3 w-20 rounded bg-secondary/50" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-9 w-32 rounded-md bg-secondary/60" />
                  </TableCell>
                  <TableCell>
                    <div className="h-9 w-32 rounded-md bg-secondary/60" />
                  </TableCell>
                  <TableCell>
                    <div className="h-9 w-20 rounded-md bg-secondary/60" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-40 rounded bg-secondary/60" />
                  </TableCell>
                  <TableCell>
                    <div className="h-9 w-32 rounded-md bg-secondary/60" />
                  </TableCell>
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-6 py-8">
                    <div className="rounded-full bg-primary/10 p-3 text-primary">
                      <Database className="h-5 w-5" />
                    </div>
                    <p className="font-medium text-foreground">No hay productos para mostrar</p>
                    <p className="text-xs">Ajusta filtros o usa la precarga para poblar el catalogo.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product, index) => {
                const draft = productDraftsById[product._id]
                const isSaving = Boolean(savingProductById[product._id])
                const rowMessage = rowMessageById[product._id]
                const selectedCategory = draft?.category ?? product.category
                const selectedCategoryExists = productCategoryOptions.some(
                  (category) => category.id === selectedCategory,
                )

                return (
                  <TableRow
                    key={product._id}
                    className="transition-colors hover:bg-secondary/20 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{product.name}</span>
                        <span className="text-xs text-muted-foreground">/{product.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-40 flex-col gap-1">
                        <Select
                          value={selectedCategory}
                          onValueChange={(value) => updateProductDraft(product._id, { category: value })}
                          disabled={isSaving || !canManageCatalog}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {!selectedCategoryExists && (
                              <SelectItem value={selectedCategory}>
                                {categoryLabelById[selectedCategory] ?? selectedCategory}
                              </SelectItem>
                            )}
                            {productCategoryOptions.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">
                          {categoryLabelById[selectedCategory] ?? selectedCategory}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-24"
                        value={draft?.price ?? String(product.price)}
                        disabled={isSaving || !canManageCatalog}
                        onChange={(event) => updateProductDraft(product._id, { price: event.target.value })}
                      />
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatPrice(product.price, product.currency)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={draft?.status ?? product.status}
                        onValueChange={(value) =>
                          updateProductDraft(product._id, { status: value as AdminProduct["status"] })
                        }
                        disabled={isSaving || !canManageCatalog}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">{statusLabel("draft")}</SelectItem>
                          <SelectItem value="active">{statusLabel("active")}</SelectItem>
                          <SelectItem value="archived">{statusLabel("archived")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={draft?.inStock ?? (product.inStock ? "true" : "false")}
                        onValueChange={(value) =>
                          updateProductDraft(product._id, { inStock: value as "true" | "false" })
                        }
                        disabled={isSaving || !canManageCatalog}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">{stockLabel("true")}</SelectItem>
                          <SelectItem value="false">{stockLabel("false")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        value={draft?.sortOrder ?? ""}
                        disabled={isSaving || !canManageCatalog}
                        onChange={(event) => updateProductDraft(product._id, { sortOrder: event.target.value })}
                      />
                    </TableCell>
                    <TableCell>{formatDate(product.updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          type="button"
                          className="transition-all hover:-translate-y-0.5"
                          onClick={() => void saveProduct(product)}
                          disabled={!canManageCatalog || !hasChanges(product) || isSaving}
                        >
                          <Save className="mr-1 h-4 w-4" />
                          {isSaving ? "Guardando..." : "Guardar"}
                        </Button>
                        <Button variant="link" size="sm" asChild>
                          <Link href={`/productos/${product.slug}`}>Ver</Link>
                        </Button>
                        {rowMessage && <span className="text-xs text-muted-foreground">{rowMessage}</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 2xl:hidden">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`product-card-skeleton-${index}`}
              className="rounded-xl border border-border/60 bg-card/80 p-4 animate-pulse"
            >
              <div className="h-5 w-48 rounded bg-secondary/60" />
              <div className="mt-2 h-4 w-32 rounded bg-secondary/50" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="h-10 rounded bg-secondary/60" />
                <div className="h-10 rounded bg-secondary/60" />
                <div className="h-10 rounded bg-secondary/60" />
                <div className="h-10 rounded bg-secondary/60" />
              </div>
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-6 py-8 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <p className="font-medium text-foreground">No hay productos para mostrar</p>
            <p className="text-xs text-muted-foreground">
              Ajusta filtros o usa la precarga para poblar el catalogo.
            </p>
          </div>
        ) : (
          products.map((product, index) => {
            const draft = productDraftsById[product._id]
            const isSaving = Boolean(savingProductById[product._id])
            const rowMessage = rowMessageById[product._id]
            const selectedCategory = draft?.category ?? product.category
            const selectedCategoryExists = productCategoryOptions.some(
              (category) => category.id === selectedCategory,
            )
            const currentStatus = draft?.status ?? product.status
            const currentStock = draft?.inStock ?? (product.inStock ? "true" : "false")

            return (
              <div
                key={product._id}
                className="rounded-xl border border-border/60 bg-card/80 p-4 transition-colors hover:bg-secondary/10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">/{product.slug}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Actualizado: {formatDate(product.updatedAt)}</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Categoria</p>
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => updateProductDraft(product._id, { category: value })}
                      disabled={isSaving || !canManageCatalog}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedCategoryExists && (
                          <SelectItem value={selectedCategory}>
                            {categoryLabelById[selectedCategory] ?? selectedCategory}
                          </SelectItem>
                        )}
                        {productCategoryOptions.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Precio</p>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft?.price ?? String(product.price)}
                      disabled={isSaving || !canManageCatalog}
                      onChange={(event) => updateProductDraft(product._id, { price: event.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(product.price, product.currency)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Select
                      value={currentStatus}
                      onValueChange={(value) =>
                        updateProductDraft(product._id, { status: value as AdminProduct["status"] })
                      }
                      disabled={isSaving || !canManageCatalog}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">{statusLabel("draft")}</SelectItem>
                        <SelectItem value="active">{statusLabel("active")}</SelectItem>
                        <SelectItem value="archived">{statusLabel("archived")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Disponibilidad</p>
                    <Select
                      value={currentStock}
                      onValueChange={(value) =>
                        updateProductDraft(product._id, { inStock: value as "true" | "false" })
                      }
                      disabled={isSaving || !canManageCatalog}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{stockLabel("true")}</SelectItem>
                        <SelectItem value="false">{stockLabel("false")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:max-w-[160px]">
                    <p className="text-xs text-muted-foreground">Orden</p>
                    <Input
                      type="number"
                      min={1}
                      value={draft?.sortOrder ?? ""}
                      disabled={isSaving || !canManageCatalog}
                      onChange={(event) => updateProductDraft(product._id, { sortOrder: event.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(currentStatus)}>{statusLabel(currentStatus)}</Badge>
                  <Badge variant={currentStock === "true" ? "outline" : "destructive"}>
                    {stockLabel(currentStock)}
                  </Badge>
                  <Button
                    size="sm"
                    type="button"
                    className="transition-all hover:-translate-y-0.5"
                    onClick={() => void saveProduct(product)}
                    disabled={!canManageCatalog || !hasChanges(product) || isSaving}
                  >
                    <Save className="mr-1 h-4 w-4" />
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button variant="link" size="sm" asChild className="px-0">
                    <Link href={`/productos/${product.slug}`}>Ver</Link>
                  </Button>
                  {rowMessage && <span className="text-xs text-muted-foreground">{rowMessage}</span>}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filters.page <= 1 || isLoading}
          onClick={() => setFilter({ page: filters.page - 1 }, false)}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          Pagina {meta.page} de {meta.totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filters.page >= meta.totalPages || isLoading}
          onClick={() => setFilter({ page: filters.page + 1 }, false)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}


