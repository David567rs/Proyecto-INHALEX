"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, MessageSquareWarning, Send } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  createCustomerReport,
  listCustomerReports,
  type CreateCustomerReportInput,
  type CustomerReport,
  type CustomerReportStatus,
  type CustomerReportType,
} from "@/lib/reports/reports-api"
import { cn } from "@/lib/utils"

const TYPE_LABELS: Record<CustomerReportType, string> = {
  order: "Pedido",
  product: "Producto",
  delivery: "Entrega",
  account: "Cuenta",
  other: "Otro",
}

const STATUS_LABELS: Record<CustomerReportStatus, string> = {
  new: "Nuevo",
  in_review: "En revision",
  resolved: "Resuelto",
  closed: "Cerrado",
}

const EMPTY_DRAFT: CreateCustomerReportInput = {
  type: "order",
  title: "",
  message: "",
  orderReference: "",
}

function formatDate(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getStatusTone(status: CustomerReportStatus) {
  if (status === "resolved")
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "closed") return "border-slate-200 bg-slate-100 text-slate-700"
  if (status === "in_review")
    return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-primary/20 bg-primary/8 text-primary"
}

export function AccountReports() {
  const { toast } = useToast()
  const [reports, setReports] = useState<CustomerReport[]>([])
  const [draft, setDraft] = useState<CreateCustomerReportInput>(EMPTY_DRAFT)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const loadReports = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    setErrorMessage("")
    try {
      const response = await listCustomerReports(token)
      setReports(response)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron cargar reportes.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const handleSubmit = async () => {
    const token = getAccessToken()
    if (!token) return

    const title = draft.title.trim()
    const message = draft.message.trim()
    if (title.length < 5 || message.length < 10) {
      toast({
        variant: "destructive",
        title: "Reporte incompleto",
        description: "Agrega un titulo y una descripcion breve.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createCustomerReport(
        {
          type: draft.type,
          title,
          message,
          orderReference: draft.orderReference?.trim() || undefined,
        },
        token,
      )
      setDraft(EMPTY_DRAFT)
      toast({
        title: "Reporte enviado",
        description: "El equipo ya puede revisarlo desde administracion.",
      })
      await loadReports()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo enviar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-[1.6rem] border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_18px_44px_-34px_rgba(16,112,58,0.28)] sm:p-6 lg:col-span-2">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <MessageSquareWarning className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Reportes</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Da seguimiento a incidencias de pedidos, entregas o cuenta.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-xl border border-border/60 bg-background/85 p-4">
          <div className="grid gap-3">
            <Select
              value={draft.type}
              disabled={isSubmitting}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  type: value as CustomerReportType,
                }))
              }
            >
              <SelectTrigger className="rounded-xl bg-white/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="rounded-xl bg-white/80"
              value={draft.title}
              disabled={isSubmitting}
              maxLength={120}
              placeholder="Titulo del reporte"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />

            <Input
              className="rounded-xl bg-white/80"
              value={draft.orderReference ?? ""}
              disabled={isSubmitting}
              maxLength={40}
              placeholder="Folio de pedido"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  orderReference: event.target.value.toUpperCase(),
                }))
              }
            />

            <Textarea
              className="min-h-[118px] resize-none rounded-xl bg-white/80"
              value={draft.message}
              disabled={isSubmitting}
              maxLength={1000}
              placeholder="Describe lo que necesitas revisar."
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
            />

            <Button
              type="button"
              className="rounded-full"
              disabled={isSubmitting}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar reporte
            </Button>
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="rounded-xl bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              Cargando reportes...
            </div>
          ) : errorMessage ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
              {errorMessage}
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-center text-sm text-muted-foreground">
              Aun no tienes reportes registrados.
            </div>
          ) : (
            <div className="grid gap-3">
              {reports.slice(0, 6).map((report, index) => (
                <article
                  key={report.id}
                  className="rounded-xl border border-border/60 bg-background/85 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border/70 bg-white px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {TYPE_LABELS[report.type]}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
                            getStatusTone(report.status),
                          )}
                        >
                          {STATUS_LABELS[report.status]}
                        </span>
                      </div>
                      <h3 className="mt-3 font-semibold text-foreground">
                        {report.title}
                      </h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(report.createdAt)}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {report.message}
                  </p>
                  {report.adminNote ? (
                    <p className="mt-3 rounded-lg border border-primary/10 bg-primary/8 px-3 py-2 text-sm leading-6 text-primary">
                      {report.adminNote}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
