"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Inbox,
  Loader2,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Send,
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  listAdminReports,
  updateAdminReport,
  type AdminReport,
  type AdminReportPriority,
  type AdminReportStatus,
  type AdminReportType,
} from "@/lib/admin/admin-api"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | AdminReportStatus
type TypeFilter = "all" | AdminReportType

const EMPTY_SUMMARY: Record<AdminReportStatus, number> = {
  new: 0,
  in_review: 0,
  resolved: 0,
  closed: 0,
}

const STATUS_LABELS: Record<AdminReportStatus, string> = {
  new: "Nuevo",
  in_review: "En revision",
  resolved: "Resuelto",
  closed: "Cerrado",
}

const TYPE_LABELS: Record<AdminReportType, string> = {
  order: "Pedido",
  product: "Producto",
  delivery: "Entrega",
  account: "Cuenta",
  other: "Otro",
}

const PRIORITY_LABELS: Record<AdminReportPriority, string> = {
  normal: "Normal",
  high: "Alta",
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getStatusTone(status: AdminReportStatus) {
  if (status === "resolved")
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "closed") return "border-slate-200 bg-slate-100 text-slate-700"
  if (status === "in_review")
    return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-primary/20 bg-primary/8 text-primary"
}

function getPriorityTone(priority: AdminReportPriority) {
  return priority === "high"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-border/70 bg-background text-foreground"
}

export function AdminReportsSection() {
  const { user } = useAuth()
  const canManage = user?.role === "admin"
  const [reports, setReports] = useState<AdminReport[]>([])
  const [summary, setSummary] =
    useState<Record<AdminReportStatus, number>>(EMPTY_SUMMARY)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const deferredSearch = useDeferredValue(searchInput)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [statusDraft, setStatusDraft] = useState<AdminReportStatus>("in_review")
  const [priorityDraft, setPriorityDraft] =
    useState<AdminReportPriority>("normal")
  const [noteDraft, setNoteDraft] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  )

  const loadReports = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setErrorMessage("Tu sesion no esta disponible. Inicia sesion de nuevo.")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage("")
    try {
      const response = await listAdminReports(token, {
        search: deferredSearch.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        limit: 16,
      })
      setReports(response.items)
      setSummary(response.summary)
      setSelectedId((current) => {
        if (current && response.items.some((report) => report.id === current)) {
          return current
        }
        return response.items[0]?.id ?? null
      })
    } catch (error) {
      setReports([])
      setSummary(EMPTY_SUMMARY)
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron cargar reportes.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [deferredSearch, statusFilter, typeFilter])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  useEffect(() => {
    if (!selectedReport) return
    setStatusDraft(selectedReport.status)
    setPriorityDraft(selectedReport.priority)
    setNoteDraft(selectedReport.adminNote ?? "")
  }, [selectedReport])

  const handleSave = async () => {
    if (!selectedReport) return
    const token = getAccessToken()
    if (!token) {
      setErrorMessage("Tu sesion no esta disponible. Inicia sesion de nuevo.")
      return
    }

    setIsSaving(true)
    setErrorMessage("")
    setSuccessMessage("")
    try {
      const updated = await updateAdminReport(
        selectedReport.id,
        {
          status: statusDraft,
          priority: priorityDraft,
          adminNote: noteDraft.trim() || undefined,
        },
        token,
      )
      setReports((current) =>
        current.map((report) => (report.id === updated.id ? updated : report)),
      )
      setSuccessMessage("Reporte actualizado correctamente.")
      await loadReports()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo actualizar.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="admin-panel-shell admin-animate-card">
      <div className="relative z-10">
        <Badge variant="secondary" className="w-fit">
          Incidencias
        </Badge>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-primary">
          Recepcion y atencion de reportes
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
          Bandeja ligera para revisar solicitudes del cliente y dejar trazabilidad
          de atencion.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {(Object.keys(STATUS_LABELS) as AdminReportStatus[]).map((status) => (
            <div key={status} className="admin-metric-card">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {STATUS_LABELS[status]}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {summary[status] ?? 0}
              </p>
            </div>
          ))}
        </div>

        {errorMessage ? (
          <div className="admin-section-card mt-4 rounded-xl border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="admin-section-card mt-4 rounded-xl border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="admin-table-shell">
            <div className="border-b border-border/60 px-4 py-3">
              <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="admin-input-surface pl-9"
                    value={searchInput}
                    placeholder="Buscar reporte"
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger className="admin-input-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Estados</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as TypeFilter)}
                >
                  <SelectTrigger className="admin-input-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tipos</SelectItem>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => void loadReports()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            </div>

            <div className="grid max-h-[38rem] gap-2 overflow-y-auto p-3">
              {isLoading ? (
                <div className="admin-section-card p-4 text-sm text-muted-foreground">
                  Cargando reportes...
                </div>
              ) : reports.length === 0 ? (
                <div className="admin-empty-state">
                  <Inbox className="h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Sin reportes</p>
                </div>
              ) : (
                reports.map((report, index) => (
                  <button
                    key={report.id}
                    type="button"
                    className={cn(
                      "rounded-lg border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-secondary/20 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2",
                      selectedReport?.id === report.id
                        ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10"
                        : "border-border/60 bg-card/80",
                    )}
                    style={{ animationDelay: `${index * 35}ms` }}
                    onClick={() => setSelectedId(report.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          {report.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {report.userName} - {formatDate(report.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("rounded-full", getStatusTone(report.status))}
                      >
                        {STATUS_LABELS[report.status]}
                      </Badge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {report.message}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="admin-form-card">
            {!selectedReport ? (
              <div className="admin-empty-state">
                <MessageSquareWarning className="h-5 w-5 text-primary" />
                <p className="font-medium text-foreground">
                  Selecciona un reporte
                </p>
              </div>
            ) : (
              <div>
                <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full">
                        {TYPE_LABELS[selectedReport.type]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          getPriorityTone(selectedReport.priority),
                        )}
                      >
                        {PRIORITY_LABELS[selectedReport.priority]}
                      </Badge>
                    </div>
                    <h4 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                      {selectedReport.title}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedReport.userEmail}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("rounded-full", getStatusTone(selectedReport.status))}
                  >
                    {STATUS_LABELS[selectedReport.status]}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="admin-stat-chip">
                    <p className="text-xs text-muted-foreground">Creado</p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatDate(selectedReport.createdAt)}
                    </p>
                  </div>
                  <div className="admin-stat-chip">
                    <p className="text-xs text-muted-foreground">Pedido</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedReport.orderReference ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border/60 bg-background/80 p-4">
                  <p className="text-sm leading-7 text-muted-foreground">
                    {selectedReport.message}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Select
                    value={statusDraft}
                    disabled={!canManage || isSaving}
                    onValueChange={(value) =>
                      setStatusDraft(value as AdminReportStatus)
                    }
                  >
                    <SelectTrigger className="admin-input-surface">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={priorityDraft}
                    disabled={!canManage || isSaving}
                    onValueChange={(value) =>
                      setPriorityDraft(value as AdminReportPriority)
                    }
                  >
                    <SelectTrigger className="admin-input-surface">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  className="admin-input-surface mt-3 min-h-[112px]"
                  value={noteDraft}
                  disabled={!canManage || isSaving}
                  maxLength={1000}
                  placeholder="Nota para el cliente"
                  onChange={(event) => setNoteDraft(event.target.value)}
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {selectedReport.handledByEmail ?? "Sin responsable asignado"}
                  </div>
                  <Button
                    type="button"
                    disabled={!canManage || isSaving}
                    onClick={() => void handleSave()}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Guardar atencion
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
