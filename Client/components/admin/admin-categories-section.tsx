"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, RefreshCw, Save, Tags, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  removeAdminProductCategory,
  updateAdminProductCategory,
  type AdminProductCategory,
} from "@/lib/admin/admin-api"
import { useAuth } from "@/components/auth/auth-provider"

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
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [resultMessage, setResultMessage] = useState("")
  const [savingById, setSavingById] = useState<Record<string, boolean>>({})
  const [deletingById, setDeletingById] = useState<Record<string, boolean>>({})
  const [rowMessageById, setRowMessageById] = useState<Record<string, string>>({})
  const canManageCatalog = user?.role === "admin"

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

  const totalActive = useMemo(
    () => categories.filter((category) => category.isActive).length,
    [categories],
  )

  const updateDraft = (categoryId: string, draft: Partial<CategoryDraft>) => {
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

  const hasChanges = (category: AdminProductCategory): boolean => {
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

      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder),
      )
      setDraftsById((prev) => ({
        ...prev,
        [created._id]: buildCategoryDraft(created),
      }))
      setNewCategory(INITIAL_NEW_CATEGORY)
      setResultMessage("Categoria creada correctamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la categoria"
      setErrorMessage(message)
    } finally {
      setIsCreating(false)
    }
  }

  const removeCategory = async (category: AdminProductCategory) => {
    const token = getAccessToken()
    if (!token) {
      setErrorMessage("No se encontro token de acceso")
      return
    }

    const accepted = window.confirm(
      `Se eliminara la categoria "${category.name}". Esta accion no se puede deshacer.`,
    )
    if (!accepted) return

    setDeletingById((prev) => ({
      ...prev,
      [category._id]: true,
    }))
    setErrorMessage("")
    setResultMessage("")

    try {
      await removeAdminProductCategory(category._id, token)
      setCategories((prev) => prev.filter((item) => item._id !== category._id))
      setDraftsById((prev) => {
        const next = { ...prev }
        delete next[category._id]
        return next
      })
      setRowMessageById((prev) => {
        const next = { ...prev }
        delete next[category._id]
        return next
      })
      setResultMessage("Categoria eliminada")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la categoria"
      setErrorMessage(message)
    } finally {
      setDeletingById((prev) => ({
        ...prev,
        [category._id]: false,
      }))
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur">
      <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-amber-300/10 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-primary">Categorias</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            CRUD conectado a <code>GET/POST/PATCH/DELETE /api/admin/products/categories</code>
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

      <div className="relative z-10 mt-6 flex flex-wrap gap-3">
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm">
          <span className="font-medium">Total categorias:</span> {categories.length}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm">
          <span className="font-medium">Activas:</span> {totalActive}
        </div>
      </div>

      {canManageCatalog && (
        <div className="mt-6 grid gap-3 rounded-xl border border-border/60 bg-card/80 p-4 md:grid-cols-5">
        <Input
          placeholder="Nombre de categoria"
          value={newCategory.name}
          onChange={(event) =>
            setNewCategory((prev) => ({ ...prev, name: event.target.value }))
          }
          disabled={isCreating}
        />
        <Input
          placeholder="Slug (opcional)"
          value={newCategory.slug}
          onChange={(event) =>
            setNewCategory((prev) => ({ ...prev, slug: event.target.value }))
          }
          disabled={isCreating}
        />
        <Input
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
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Activa</SelectItem>
            <SelectItem value="false">Inactiva</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={() => void createCategory()}
          disabled={isCreating}
          className="transition-all hover:-translate-y-0.5"
        >
          <Tags className={`mr-2 h-4 w-4 ${isCreating ? "animate-spin" : ""}`} />
          {isCreating ? "Creando..." : "Crear categoria"}
        </Button>

        <div className="md:col-span-5">
          <Textarea
            placeholder="Descripcion (opcional)"
            value={newCategory.description}
            onChange={(event) =>
              setNewCategory((prev) => ({ ...prev, description: event.target.value }))
            }
            className="min-h-[80px]"
            disabled={isCreating}
          />
        </div>
        </div>
      )}

      {errorMessage && (
        <div className="relative z-10 mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        </div>
      )}

      {resultMessage && (
        <div className="relative z-10 mt-4 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-foreground">
          <span>{resultMessage}</span>
        </div>
      )}

      <div className="relative z-10 mt-6 overflow-hidden rounded-xl border border-border/60 bg-card/80">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30">
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={`category-skeleton-${index}`} className="animate-pulse">
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
                  No hay categorias registradas
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => {
                const draft = draftsById[category._id]
                const isSaving = Boolean(savingById[category._id])
                const isDeleting = Boolean(deletingById[category._id])

                return (
                  <TableRow key={category._id} className="transition-colors hover:bg-secondary/20">
                    <TableCell>
                      <Input
                        value={draft?.name ?? category.name}
                        disabled={isSaving || isDeleting || !canManageCatalog}
                        onChange={(event) =>
                          updateDraft(category._id, { name: event.target.value })
                        }
                        className="w-44"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={draft?.slug ?? category.slug}
                        disabled={isSaving || isDeleting || !canManageCatalog}
                        onChange={(event) =>
                          updateDraft(category._id, { slug: event.target.value })
                        }
                        className="w-44"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={draft?.isActive ?? (category.isActive ? "true" : "false")}
                          onValueChange={(value) =>
                            updateDraft(category._id, { isActive: value as "true" | "false" })
                          }
                          disabled={isSaving || isDeleting || !canManageCatalog}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Activa</SelectItem>
                            <SelectItem value="false">Inactiva</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant={(draft?.isActive ?? (category.isActive ? "true" : "false")) === "true" ? "outline" : "secondary"}>
                          {(draft?.isActive ?? (category.isActive ? "true" : "false")) === "true"
                            ? "Activa"
                            : "Inactiva"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={draft?.sortOrder ?? String(category.sortOrder)}
                        disabled={isSaving || isDeleting || !canManageCatalog}
                        onChange={(event) =>
                          updateDraft(category._id, { sortOrder: event.target.value })
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>{category.productCount}</TableCell>
                    <TableCell>
                      <Textarea
                        value={draft?.description ?? (category.description ?? "")}
                        disabled={isSaving || isDeleting || !canManageCatalog}
                        onChange={(event) =>
                          updateDraft(category._id, { description: event.target.value })
                        }
                        className="min-h-[72px] w-72"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          type="button"
                          className="transition-all hover:-translate-y-0.5"
                          onClick={() => void saveCategory(category)}
                          disabled={!canManageCatalog || !hasChanges(category) || isSaving || isDeleting}
                        >
                          <Save className="mr-1 h-4 w-4" />
                          {isSaving ? "Guardando..." : "Guardar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          type="button"
                          onClick={() => void removeCategory(category)}
                          disabled={isSaving || isDeleting || !canManageCatalog}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          {isDeleting ? "Eliminando..." : "Eliminar"}
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
  )
}
