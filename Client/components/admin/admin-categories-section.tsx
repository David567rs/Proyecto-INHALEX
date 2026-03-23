"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Save,
  Sparkles,
  Tags,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  createAdminProductCategory,
  listAdminProductCategories,
  updateAdminProductCategory,
  type AdminProductCategory,
} from "@/lib/admin/admin-api"
import { useAuth } from "@/components/auth/auth-provider"
import { cn } from "@/lib/utils"

interface CategoryDraft {
  name: string
  slug: string
  description: string
  isActive: "true" | "false"
  sortOrder: string
}

const INITIAL_NEW_CATEGORY: CategoryDraft = {
  name: "",
  slug: "",
  description: "",
  isActive: "true",
  sortOrder: "",
}

function buildCategoryDraft(category: AdminProductCategory): CategoryDraft {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    isActive: category.isActive ? "true" : "false",
    sortOrder: String(category.sortOrder),
  }
}

export function AdminCategoriesSection() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<AdminProductCategory[]>([])
  const [draftsById, setDraftsById] = useState<Record<string, CategoryDraft>>({})
  const [newCategory, setNewCategory] = useState<CategoryDraft>(INITIAL_NEW_CATEGORY)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [resultMessage, setResultMessage] = useState("")
  const [savingById, setSavingById] = useState<Record<string, boolean>>({})
  const [rowMessageById, setRowMessageById] = useState<Record<string, string>>({})
  const canManageCatalog = user?.role === "admin"

  const hasChanges = useCallback(
    (category: AdminProductCategory): boolean => {
      const draft = draftsById[category._id]
      if (!draft) return false

      const sortOrder = Number(draft.sortOrder)
      return (
        draft.name.trim() !== category.name ||
        draft.slug.trim() !== category.slug ||
        draft.description.trim() !== (category.description ?? "") ||
        (draft.isActive === "true") !== category.isActive ||
        (!Number.isNaN(sortOrder) && sortOrder !== category.sortOrder)
      )
    },
    [draftsById],
  )

  const totalActive = useMemo(
    () => categories.filter((category) => category.isActive).length,
    [categories],
  )
  const totalInactive = useMemo(
    () => categories.filter((category) => !category.isActive).length,
    [categories],
  )
  const totalWithProducts = useMemo(
    () => categories.filter((category) => category.productCount > 0).length,
    [categories],
  )
  const pendingChangesCount = useMemo(
    () => categories.filter((category) => hasChanges(category)).length,
    [categories, hasChanges],
  )
  const editingCategory = useMemo(
    () => categories.find((category) => category._id === editingCategoryId) ?? null,
    [categories, editingCategoryId],
  )

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")
    setResultMessage("")

    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      setIsLoading(false)
      return
    }

    try {
      const response = await listAdminProductCategories(token)
      setCategories(response)
      setDraftsById(
        response.reduce<Record<string, CategoryDraft>>((acc, category) => {
          acc[category._id] = buildCategoryDraft(category)
          return acc
        }, {}),
      )
      setEditingCategoryId((prev) =>
        prev && response.some((category) => category._id === prev) ? prev : null,
      )
      setRowMessageById({})
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar las categorias"
      setErrorMessage(message)
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const updateDraft = (categoryId: string, draft: Partial<CategoryDraft>) => {
    setEditingCategoryId(categoryId)
    setDraftsById((prev) => {
      const previous = prev[categoryId]
      if (!previous) return prev
      return {
        ...prev,
        [categoryId]: {
          ...previous,
          ...draft,
        },
      }
    })

    setRowMessageById((prev) => ({
      ...prev,
      [categoryId]: "",
    }))
  }

  const saveCategory = async (category: AdminProductCategory) => {
    const token = getAccessToken()
    if (!token) {
      setRowMessageById((prev) => ({
        ...prev,
        [category._id]: "No se encontro token",
      }))
      return
    }

    const draft = draftsById[category._id]
    if (!draft) return

    const payload: {
      name?: string
      slug?: string
      description?: string
      isActive?: boolean
      sortOrder?: number
    } = {}

    if (draft.name.trim() !== category.name) payload.name = draft.name.trim()
    if (draft.slug.trim() !== category.slug) payload.slug = draft.slug.trim()
    if (draft.description.trim() !== (category.description ?? "")) {
      payload.description = draft.description.trim()
    }

    const draftIsActive = draft.isActive === "true"
    if (draftIsActive !== category.isActive) payload.isActive = draftIsActive

    const parsedSortOrder = Number(draft.sortOrder)
    if (!Number.isNaN(parsedSortOrder) && parsedSortOrder !== category.sortOrder) {
      payload.sortOrder = parsedSortOrder
    }

    if (Object.keys(payload).length === 0) {
      setRowMessageById((prev) => ({
        ...prev,
        [category._id]: "No hay cambios",
      }))
      return
    }

    setSavingById((prev) => ({
      ...prev,
      [category._id]: true,
    }))

    try {
      const updatedCategory = await updateAdminProductCategory(category._id, payload, token)
      setCategories((prev) =>
        prev.map((item) => (item._id === updatedCategory._id ? updatedCategory : item)),
      )
      setDraftsById((prev) => ({
        ...prev,
        [category._id]: buildCategoryDraft(updatedCategory),
      }))
      setRowMessageById((prev) => ({
        ...prev,
        [category._id]: "Guardado",
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar la categoria"
      setRowMessageById((prev) => ({
        ...prev,
        [category._id]: message,
      }))
    } finally {
      setSavingById((prev) => ({
        ...prev,
        [category._id]: false,
      }))
    }
  }

  const createCategory = async () => {
    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      return
    }

    if (!newCategory.name.trim()) {
      setErrorMessage("El nombre de la categoria es obligatorio")
      return
    }

    const parsedSortOrder = Number(newCategory.sortOrder || "9999")
    if (Number.isNaN(parsedSortOrder) || parsedSortOrder < 1) {
      setErrorMessage("El orden debe ser mayor o igual a 1")
      return
    }

    setIsCreating(true)
    setErrorMessage("")
    setResultMessage("")

    try {
      const created = await createAdminProductCategory(
        {
          name: newCategory.name.trim(),
          slug: newCategory.slug.trim() || undefined,
          description: newCategory.description.trim() || undefined,
          isActive: newCategory.isActive === "true",
          sortOrder: parsedSortOrder,
        },
        token,
      )

      setCategories((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder))
      setDraftsById((prev) => ({
        ...prev,
        [created._id]: buildCategoryDraft(created),
      }))
      setEditingCategoryId(created._id)
      setNewCategory(INITIAL_NEW_CATEGORY)
      setResultMessage("Categoria creada correctamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la categoria"
      setErrorMessage(message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="admin-panel-shell admin-animate-card">
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-primary">Categorias</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestion conectada a <code>GET/POST/PATCH /api/admin/products/categories</code>.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="transition-all hover:-translate-y-0.5"
          onClick={() => void loadCategories()}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Recargar categorias
        </Button>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Total de lineas
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {categories.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Lineas disponibles.
          </p>
        </div>

        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Activas
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {totalActive}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {totalInactive} inactivas.
          </p>
        </div>

        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Con productos
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {totalWithProducts}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Lineas con productos asociados.
          </p>
        </div>

        <div className="admin-metric-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Cambios pendientes
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {pendingChangesCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Filas sin guardar.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        {canManageCatalog ? (
          <Collapsible
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            className="admin-form-card overflow-hidden"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-4 w-4" />
                  Centro de categorias
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                  Crear y organizar lineas del catalogo
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Define nombre, slug, estado y orden.
                </p>
              </div>

              <CollapsibleTrigger asChild>
                <Button variant="outline" type="button" className="sm:self-start">
                  {isCreateOpen ? "Ocultar formulario" : "Mostrar formulario"}
                  <ChevronDown
                    className={cn("ml-2 h-4 w-4 transition-transform", isCreateOpen && "rotate-180")}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2">
              <div className="mt-5 grid gap-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.1fr)_180px_180px]">
                    <Input
                      className="admin-input-surface"
                      placeholder="Nombre de categoria"
                      value={newCategory.name}
                      onChange={(event) =>
                        setNewCategory((prev) => ({ ...prev, name: event.target.value }))
                      }
                      disabled={isCreating}
                    />
                    <Input
                      className="admin-input-surface"
                      placeholder="Slug (opcional)"
                      value={newCategory.slug}
                      onChange={(event) =>
                        setNewCategory((prev) => ({ ...prev, slug: event.target.value }))
                      }
                      disabled={isCreating}
                    />
                    <Input
                      className="admin-input-surface"
                      placeholder="Orden"
                      type="number"
                      min={1}
                      value={newCategory.sortOrder}
                      onChange={(event) =>
                        setNewCategory((prev) => ({ ...prev, sortOrder: event.target.value }))
                      }
                      disabled={isCreating}
                    />
                    <Select
                      value={newCategory.isActive}
                      onValueChange={(value) =>
                        setNewCategory((prev) => ({ ...prev, isActive: value as "true" | "false" }))
                      }
                      disabled={isCreating}
                    >
                      <SelectTrigger className="admin-input-surface">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Activa</SelectItem>
                        <SelectItem value="false">Inactiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex xl:justify-end">
                    <Button
                      type="button"
                      onClick={() => void createCategory()}
                      disabled={isCreating}
                      className="h-12 w-full rounded-full px-5 text-base font-semibold transition-all hover:-translate-y-0.5 xl:min-w-[240px]"
                    >
                      <Tags className={`mr-2 h-4 w-4 ${isCreating ? "animate-spin" : ""}`} />
                      {isCreating ? "Creando..." : "Crear categoria"}
                    </Button>
                  </div>
                </div>

                <Textarea
                  className="admin-input-surface min-h-[92px]"
                  placeholder="Descripcion (opcional)"
                  value={newCategory.description}
                  onChange={(event) =>
                    setNewCategory((prev) => ({ ...prev, description: event.target.value }))
                  }
                  disabled={isCreating}
                />

                <p className="text-xs text-muted-foreground">
                  Las categorias se activan o desactivan; no se borran.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="admin-form-card">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              Centro de categorias
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Solo administradores pueden crear y editar categorias.
            </p>
          </div>
        )}

        <div className="admin-form-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Estado de edicion
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            {editingCategory ? editingCategory.name : "Sin categoria en foco"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {editingCategory
              ? "Resumen de la categoria en foco."
              : "Al editar una fila, aparece aqui."}
          </p>

          {editingCategory ? (
            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="admin-stat-chip">
                  <span className="font-medium">Slug:</span> {editingCategory.slug}
                </div>
                <div className="admin-stat-chip">
                  <span className="font-medium">Orden:</span> {editingCategory.sortOrder}
                </div>
                <div className="admin-stat-chip">
                  <span className="font-medium">Estado:</span>{" "}
                  {editingCategory.isActive ? "Activa" : "Inactiva"}
                </div>
                <div className="admin-stat-chip">
                  <span className="font-medium">Productos:</span> {editingCategory.productCount}
                </div>
              </div>

              {hasChanges(editingCategory) && (
                <Badge className="w-fit shadow-[0_10px_28px_-18px_rgba(22,163,74,0.75)]">
                  Cambio pendiente
                </Badge>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCategoryId(null)}
                >
                  Limpiar foco
                </Button>
              </div>
            </div>
          ) : (
            <div className="admin-empty-state mt-5 max-w-none items-start text-left">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Todavia no hay una categoria en edicion</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Al editar una fila, veras su resumen.
                </p>
              </div>
            </div>
          )}
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

      {resultMessage && (
        <div className="admin-section-card relative z-10 mt-4 rounded-xl bg-secondary/30 px-4 py-3 text-sm text-foreground">
          <span>{resultMessage}</span>
        </div>
      )}

      <div className="admin-table-shell relative z-10 mt-6">
        <div className="admin-table-scroll">
          <Table>
            <TableHeader>
              <TableRow className="admin-table-head-row">
                <TableHead className="admin-table-head-cell">Nombre</TableHead>
                <TableHead className="admin-table-head-cell">Slug</TableHead>
                <TableHead className="admin-table-head-cell">Estado</TableHead>
                <TableHead className="admin-table-head-cell">Orden</TableHead>
                <TableHead className="admin-table-head-cell">Productos</TableHead>
                <TableHead className="admin-table-head-cell">Descripcion</TableHead>
                <TableHead className="admin-table-head-cell">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="admin-table-body-compact">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow
                    key={`category-skeleton-${index}`}
                    className="animate-pulse bg-background/40"
                  >
                    <TableCell><div className="h-4 w-32 rounded bg-secondary/60" /></TableCell>
                    <TableCell><div className="h-4 w-36 rounded bg-secondary/60" /></TableCell>
                    <TableCell><div className="h-8 w-24 rounded bg-secondary/60" /></TableCell>
                    <TableCell><div className="h-8 w-20 rounded bg-secondary/60" /></TableCell>
                    <TableCell><div className="h-4 w-10 rounded bg-secondary/60" /></TableCell>
                    <TableCell><div className="h-4 w-44 rounded bg-secondary/60" /></TableCell>
                    <TableCell><div className="h-8 w-36 rounded bg-secondary/60" /></TableCell>
                  </TableRow>
                ))
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    <div className="admin-empty-state">
                      <div className="rounded-full bg-primary/10 p-3 text-primary">
                        <Tags className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-foreground">No hay categorias registradas</p>
                      <p className="text-xs text-muted-foreground">
                        Crea una categoria para organizar el catalogo.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category, index) => {
                  const draft = draftsById[category._id]
                  const isSaving = Boolean(savingById[category._id])
                  const hasPendingChanges = hasChanges(category)

                  return (
                    <TableRow
                      key={category._id}
                      className={cn(
                        "transition-colors hover:bg-secondary/20 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
                        hasPendingChanges && "bg-primary/[0.035]",
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell>
                        <div className="space-y-2">
                          <Input
                            value={draft?.name ?? category.name}
                            disabled={isSaving || !canManageCatalog}
                            onChange={(event) =>
                              updateDraft(category._id, { name: event.target.value })
                            }
                            className="admin-input-surface w-44"
                          />
                          {hasPendingChanges && (
                            <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              Cambio pendiente
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Input
                          value={draft?.slug ?? category.slug}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) =>
                            updateDraft(category._id, { slug: event.target.value })
                          }
                          className="admin-input-surface w-44"
                        />
                      </TableCell>

                      <TableCell>
                        <Select
                          value={draft?.isActive ?? (category.isActive ? "true" : "false")}
                          onValueChange={(value) =>
                            updateDraft(category._id, { isActive: value as "true" | "false" })
                          }
                          disabled={isSaving || !canManageCatalog}
                        >
                          <SelectTrigger className="admin-input-surface w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Activa</SelectItem>
                            <SelectItem value="false">Inactiva</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={draft?.sortOrder ?? String(category.sortOrder)}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) =>
                            updateDraft(category._id, { sortOrder: event.target.value })
                          }
                          className="admin-input-surface w-24"
                        />
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{category.productCount}</p>
                          <p className="text-xs text-muted-foreground">
                            {category.productCount > 0 ? "Con catalogo" : "Sin asignaciones"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Textarea
                          value={draft?.description ?? (category.description ?? "")}
                          disabled={isSaving || !canManageCatalog}
                          onChange={(event) =>
                            updateDraft(category._id, { description: event.target.value })
                          }
                          className="admin-input-surface min-h-[72px] w-72"
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            type="button"
                            className="transition-all hover:-translate-y-0.5"
                            onClick={() => void saveCategory(category)}
                            disabled={!canManageCatalog || !hasChanges(category) || isSaving}
                          >
                            <Save className="mr-1 h-4 w-4" />
                            {isSaving ? "Guardando..." : "Guardar"}
                          </Button>
                          {rowMessageById[category._id] && (
                            <span className="text-xs text-muted-foreground">
                              {rowMessageById[category._id]}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
