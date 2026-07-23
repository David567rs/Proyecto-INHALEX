"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageCheck,
  RefreshCw,
  Send,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  confirmOrderReceipt,
  listReceiptConfirmationOrders,
  reportOrderReceiptIssue,
  type CustomerReceiptOrder,
  type CustomerReceiptStatus,
} from "@/lib/orders/orders-api"
import { resolveProductDisplayImage } from "@/lib/products/product-images"
import { cn } from "@/lib/utils"

const RECEIPT_LABELS: Record<CustomerReceiptStatus, string> = {
  not_required: "Sin accion",
  pending: "Por confirmar",
  confirmed: "Recibido",
  issue_reported: "Incidencia enviada",
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

function formatPrice(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(value)
}

function getReceiptTone(status: CustomerReceiptStatus) {
  if (status === "confirmed")
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "issue_reported")
    return "border-amber-200 bg-amber-50 text-amber-700"
  if (status === "pending") return "border-primary/20 bg-primary/10 text-primary"
  return "border-stone-200 bg-stone-100 text-stone-700"
}

function getReceiptIcon(status: CustomerReceiptStatus) {
  if (status === "confirmed") return CheckCircle2
  if (status === "issue_reported") return AlertTriangle
  if (status === "pending") return Truck
  return PackageCheck
}

function getOrderRequestedAt(order: CustomerReceiptOrder) {
  return (
    order.customerReceiptRequestedAt ??
    order.completedAt ??
    order.customerReceiptConfirmedAt ??
    order.customerReceiptIssueReportedAt
  )
}

export function AccountOrderReceipts() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<CustomerReceiptOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [reportText, setReportText] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const loadOrders = useCallback(async (showRefreshing = false) => {
    const token = getAccessToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    if (showRefreshing) setIsRefreshing(true)
    setErrorMessage("")

    try {
      const response = await listReceiptConfirmationOrders(token)
      setOrders(response)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar tus entregas.",
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const pendingCount = useMemo(
    () =>
      orders.filter((order) => order.customerReceiptStatus === "pending").length,
    [orders],
  )

  const orderedReceipts = useMemo(() => {
    const priority: Record<CustomerReceiptStatus, number> = {
      pending: 0,
      issue_reported: 1,
      confirmed: 2,
      not_required: 3,
    }

    return [...orders].sort((left, right) => {
      const byStatus =
        priority[left.customerReceiptStatus] -
        priority[right.customerReceiptStatus]
      if (byStatus !== 0) return byStatus

      const leftDate = new Date(getOrderRequestedAt(left) ?? 0).getTime()
      const rightDate = new Date(getOrderRequestedAt(right) ?? 0).getTime()
      return rightDate - leftDate
    })
  }, [orders])

  const updateOrder = (updated: CustomerReceiptOrder) => {
    setOrders((current) =>
      current.map((order) => (order.id === updated.id ? updated : order)),
    )
  }

  const handleConfirm = async (order: CustomerReceiptOrder) => {
    const token = getAccessToken()
    if (!token) return

    setActionLoading(`confirm-${order.id}`)
    try {
      const updated = await confirmOrderReceipt(order.id, token)
      updateOrder(updated)
      toast({
        title: "Entrega confirmada",
        description: `Gracias por confirmar el pedido ${order.reference}.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo confirmar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReport = async (order: CustomerReceiptOrder) => {
    const token = getAccessToken()
    if (!token) return

    const note = reportText.trim()
    if (note.length < 10) {
      toast({
        variant: "destructive",
        title: "Describe el problema",
        description: "Agrega al menos 10 caracteres para que el equipo pueda ayudarte.",
      })
      return
    }

    setActionLoading(`report-${order.id}`)
    try {
      const updated = await reportOrderReceiptIssue(order.id, { note }, token)
      updateOrder(updated)
      setActiveReportId(null)
      setReportText("")
      toast({
        title: "Incidencia enviada",
        description: "El equipo ya puede darle seguimiento desde administracion.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo reportar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <section className="rounded-[1.6rem] border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_18px_44px_-34px_rgba(16,112,58,0.28)] sm:p-6 lg:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-primary/10 p-2 text-primary">
            <PackageCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                Confirmacion de entrega
              </h2>
              {pendingCount > 0 ? (
                <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                  {pendingCount}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Valida pedidos marcados como entregados o avisa si algo no llego bien.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled={isRefreshing || isLoading}
          onClick={() => void loadOrders(true)}
        >
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-5 rounded-xl bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
          Cargando entregas...
        </div>
      ) : errorMessage ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
          {errorMessage}
        </div>
      ) : orderedReceipts.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-center text-sm text-muted-foreground">
          Aun no tienes entregas por confirmar.
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {orderedReceipts.map((order, index) => {
            const StatusIcon = getReceiptIcon(order.customerReceiptStatus)
            const canAct = order.customerReceiptStatus === "pending"
            const isConfirming = actionLoading === `confirm-${order.id}`
            const isReporting = actionLoading === `report-${order.id}`
            const previewItems = order.items.slice(0, 3)

            return (
              <article
                key={order.id}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-background/85 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2",
                  order.customerReceiptStatus === "pending"
                    ? "border-primary/20 ring-1 ring-primary/8"
                    : "border-border/60",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
                          getReceiptTone(order.customerReceiptStatus),
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {RECEIPT_LABELS[order.customerReceiptStatus]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(getOrderRequestedAt(order))}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-semibold text-foreground">
                      Pedido {order.reference}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {order.totalItems} articulos /{" "}
                      {formatPrice(order.subtotal, order.currency)}
                    </p>
                  </div>

                  {canAct ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="rounded-full"
                        disabled={Boolean(actionLoading)}
                        onClick={() => void handleConfirm(order)}
                      >
                        {isConfirming ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Si, lo recibi
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        disabled={Boolean(actionLoading)}
                        onClick={() => {
                          setActiveReportId((current) =>
                            current === order.id ? null : order.id,
                          )
                          setReportText(order.customerReceiptIssueNote ?? "")
                        }}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Reportar problema
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {previewItems.map((item) => (
                    <div
                      key={`${order.id}-${item.productId}`}
                      className="flex min-w-[190px] flex-1 items-center gap-3 rounded-xl border border-border/60 bg-white/75 p-3"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-emerald-100 bg-white">
                        <Image
                          src={resolveProductDisplayImage({
                            slug: item.productSlug,
                            name: item.productName,
                            image: item.image,
                            aromas: [],
                          })}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {item.productName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.quantity} pza.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {activeReportId === order.id ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1">
                    <Textarea
                      value={reportText}
                      disabled={Boolean(actionLoading)}
                      maxLength={1000}
                      className="min-h-[96px] resize-none rounded-xl bg-white"
                      placeholder="Describe que paso con la entrega: no llego, llego incompleto o tuvo algun detalle."
                      onChange={(event) => setReportText(event.target.value)}
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-amber-700">
                        {reportText.trim().length}/1000 caracteres
                      </p>
                      <Button
                        type="button"
                        className="rounded-full"
                        disabled={Boolean(actionLoading)}
                        onClick={() => void handleReport(order)}
                      >
                        {isReporting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Enviar incidencia
                      </Button>
                    </div>
                  </div>
                ) : null}

                {order.customerReceiptStatus === "confirmed" ? (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmaste esta entrega el{" "}
                    {formatDate(order.customerReceiptConfirmedAt)}.
                  </div>
                ) : null}

                {order.customerReceiptStatus === "issue_reported" ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      El equipo ya recibio tu reporte.
                    </div>
                    {order.customerReceiptIssueNote ? (
                      <p className="mt-2">{order.customerReceiptIssueNote}</p>
                    ) : null}
                    {order.customerReceiptReportId ? (
                      <p className="mt-1 text-xs">
                        Folio interno: {order.customerReceiptReportId}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {order.customerReceiptStatus === "pending" ? (
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    El equipo marco este pedido como entregado. Confirma solo
                    cuando lo tengas fisicamente.
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
