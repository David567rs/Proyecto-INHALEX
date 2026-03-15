"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react"
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
import { getAccessToken } from "@/lib/auth/token-storage"
import { listAdminAuditLogs, type AdminAuditLog } from "@/lib/admin/admin-api"

interface AuditFilters {
  search: string
  view: "important" | "all"
  method: "all" | "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  action: "all" | AdminAuditLog["action"]
  collection:
    | "all"
    | "usuarios"
    | "productos"
    | "categorias_producto"
    | "contenidos_empresa"
    | "respaldos"
    | "sistema"
  success: "all" | "true" | "false"
  page: number
  limit: number
}

interface AuditListMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

const INITIAL_FILTERS: AuditFilters = {
  search: "",
  view: "important",
  method: "all",
  action: "all",
  collection: "all",
  success: "all",
  page: 1,
  limit: 20,
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

function actionLabel(action: AdminAuditLog["action"]): string {
  switch (action) {
    case "read":
      return "Lectura"
    case "create":
      return "Creacion"
    case "update":
      return "Actualizacion"
    case "delete":
      return "Eliminacion"
    default:
      return "Otro"
  }
}

function actionVariant(action: AdminAuditLog["action"]): "default" | "secondary" | "outline" {
  if (action === "create") return "default"
  if (action === "update") return "secondary"
  return "outline"
}

function collectionLabel(collection: string): string {
  if (collection === "usuarios") return "Usuarios"
  if (collection === "productos") return "Productos"
  if (collection === "categorias_producto") return "Categorias"
  if (collection === "contenidos_empresa") return "Contenidos"
  if (collection === "respaldos") return "Respaldos"
  return "Sistema"
}

export function AdminAuditSection() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [filters, setFilters] = useState<AuditFilters>(INITIAL_FILTERS)
  const [searchInput, setSearchInput] = useState("")
  const [meta, setMeta] = useState<AuditListMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  })

  const failedInCurrentPage = useMemo(
    () => logs.filter((log) => !log.success).length,
    [logs],
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

  const setFilter = useCallback((patch: Partial<AuditFilters>, resetPage = true) => {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? prev.page),
    }))
  }, [])

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")

    const token = getAccessToken()
    if (!token) {
      setLogs([])
      setErrorMessage("No se encontro token de acceso")
      setIsLoading(false)
      return
    }

    try {
      const response = await listAdminAuditLogs(token, {
        search: filters.search.trim() || undefined,
        important: filters.view === "important",
        method: filters.method !== "all" ? filters.method : undefined,
        action: filters.action !== "all" ? filters.action : undefined,
        collection: filters.collection !== "all" ? filters.collection : undefined,
        success:
          filters.success === "all" ? undefined : filters.success === "true",
        page: filters.page,
        limit: filters.limit,
      })

      setLogs(response.items)
      setMeta({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar la auditoria"
      setErrorMessage(message)
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur">
      <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-amber-300/10 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-primary">Auditoria</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bitacora visual de acciones sobre la base de datos desde el panel admin.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vista inicial: solo eventos importantes (creacion, actualizacion, eliminacion o error).
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="transition-all hover:-translate-y-0.5"
          onClick={() => void loadLogs()}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Recargar auditoria
        </Button>
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap gap-3">
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/35">
          <span className="font-medium">Registros filtrados:</span> {meta.total}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/35">
          <span className="font-medium">Fallos en pagina:</span> {failedInCurrentPage}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3 text-sm transition-all hover:-translate-y-0.5 hover:bg-secondary/35">
          <span className="font-medium">Pagina:</span> {meta.page} / {meta.totalPages}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Input
          className="min-w-[240px] flex-[2_1_300px]"
          placeholder="Buscar por usuario, ruta o coleccion"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />

        <div className="min-w-[180px] flex-1">
          <Select value={filters.view} onValueChange={(value) => setFilter({ view: value as AuditFilters["view"] })}>
            <SelectTrigger>
              <SelectValue placeholder="Vista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="important">Solo importante</SelectItem>
              <SelectItem value="all">Ver todo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px] flex-1">
          <Select value={filters.method} onValueChange={(value) => setFilter({ method: value as AuditFilters["method"] })}>
            <SelectTrigger>
              <SelectValue placeholder="Metodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los metodos</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px] flex-1">
          <Select value={filters.action} onValueChange={(value) => setFilter({ action: value as AuditFilters["action"] })}>
            <SelectTrigger>
              <SelectValue placeholder="Accion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              <SelectItem value="read">Lectura</SelectItem>
              <SelectItem value="create">Creacion</SelectItem>
              <SelectItem value="update">Actualizacion</SelectItem>
              <SelectItem value="delete">Eliminacion</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px] flex-1">
          <Select
            value={filters.collection}
            onValueChange={(value) => setFilter({ collection: value as AuditFilters["collection"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Coleccion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las colecciones</SelectItem>
              <SelectItem value="usuarios">Usuarios</SelectItem>
              <SelectItem value="productos">Productos</SelectItem>
              <SelectItem value="categorias_producto">Categorias</SelectItem>
              <SelectItem value="contenidos_empresa">Contenidos</SelectItem>
              <SelectItem value="respaldos">Respaldos</SelectItem>
              <SelectItem value="sistema">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[170px] flex-1">
          <Select value={filters.success} onValueChange={(value) => setFilter({ success: value as AuditFilters["success"] })}>
            <SelectTrigger>
              <SelectValue placeholder="Resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los resultados</SelectItem>
              <SelectItem value="true">Exitoso</SelectItem>
              <SelectItem value="false">Con error</SelectItem>
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

      <div className="relative z-10 mt-6 grid gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`audit-skeleton-${index}`}
              className="rounded-xl border border-border/60 bg-card/80 p-4 animate-pulse"
            >
              <div className="h-4 w-56 rounded bg-secondary/60" />
              <div className="mt-2 h-4 w-80 rounded bg-secondary/50" />
              <div className="mt-3 flex gap-2">
                <div className="h-6 w-20 rounded-full bg-secondary/60" />
                <div className="h-6 w-24 rounded-full bg-secondary/60" />
                <div className="h-6 w-28 rounded-full bg-secondary/60" />
              </div>
            </div>
          ))
        ) : logs.length === 0 ? (
          <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-6 py-8 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="font-medium text-foreground">No hay acciones para mostrar</p>
            <p className="text-xs text-muted-foreground">
              Ajusta filtros o realiza acciones en el panel para generar registros.
            </p>
          </div>
        ) : (
          logs.map((log, index) => (
            <article
              key={log._id}
              className="rounded-xl border border-border/60 bg-card/80 p-4 transition-colors hover:bg-secondary/10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {collectionLabel(log.collection)} · {log.method}
                  </p>
                  <p className="text-xs text-muted-foreground">{log.route}</p>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={actionVariant(log.action)}>{actionLabel(log.action)}</Badge>
                <Badge variant={log.success ? "outline" : "destructive"}>
                  {log.success ? "Exitoso" : "Error"}
                </Badge>
                <Badge variant="secondary">HTTP {log.statusCode}</Badge>
                <Badge variant="secondary">
                  {log.responseTimeMs ?? 0} ms
                </Badge>
              </div>

              <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <p>
                  <span className="font-medium text-foreground">Usuario:</span>{" "}
                  {log.actorEmail ?? "Sistema"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Recurso:</span>{" "}
                  {log.resourceId ?? "-"}
                </p>
              </div>

              {log.errorMessage && (
                <p className="mt-2 text-xs text-destructive">
                  <span className="font-medium">Error:</span> {log.errorMessage}
                </p>
              )}
            </article>
          ))
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
        <span className="px-2 text-sm text-muted-foreground">
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
