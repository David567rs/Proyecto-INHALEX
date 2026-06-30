"use client"

import { useEffect, useState } from "react"
import { BellRing, CheckCheck, Clock3, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  listCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
  type CustomerNotification,
  type CustomerNotificationsResponse,
} from "@/lib/notifications/notifications-api"
import { cn } from "@/lib/utils"

const TYPE_LABELS: Record<CustomerNotification["type"], string> = {
  order: "Pedido",
  review: "Resena",
  promotion: "Promocion",
  system: "Sistema",
  report: "Reporte",
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

function getSeverityTone(severity: CustomerNotification["severity"]) {
  if (severity === "success") return "border-emerald-100 bg-emerald-50 text-emerald-700"
  if (severity === "warning") return "border-amber-100 bg-amber-50 text-amber-700"
  return "border-primary/10 bg-primary/8 text-primary"
}

export function AccountNotices() {
  const { toast } = useToast()
  const [response, setResponse] = useState<CustomerNotificationsResponse>({
    items: [],
    unread: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [actionError, setActionError] = useState("")

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    let isCancelled = false

    const loadNotifications = async () => {
      setIsLoading(true)
      setErrorMessage("")
      try {
        const payload = await listCustomerNotifications(token)
        if (!isCancelled) {
          setResponse(payload)
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "No se pudieron cargar tus avisos.",
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadNotifications()

    return () => {
      isCancelled = true
    }
  }, [])

  const handleMarkRead = async (notificationId: string) => {
    const token = getAccessToken()
    if (!token) return

    setIsUpdating(true)
    setActionError("")
    try {
      const updated = await markCustomerNotificationRead(notificationId, token)
      setResponse((current) => ({
        unread: Math.max(0, current.unread - (updated.readAt ? 1 : 0)),
        items: current.items.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      }))
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el aviso."
      setActionError(message)
      toast({
        variant: "destructive",
        title: "No se pudo marcar el aviso",
        description: message,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMarkAll = async () => {
    const token = getAccessToken()
    if (!token) return

    setIsUpdating(true)
    setActionError("")
    try {
      await markAllCustomerNotificationsRead(token)
      const now = new Date().toISOString()
      setResponse((current) => ({
        unread: 0,
        items: current.items.map((item) => ({ ...item, readAt: item.readAt ?? now })),
      }))
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron actualizar tus avisos."
      setActionError(message)
      toast({
        variant: "destructive",
        title: "No se pudieron marcar los avisos",
        description: message,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <section className="rounded-[1.6rem] border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_18px_44px_-34px_rgba(16,112,58,0.28)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-primary/10 p-2 text-primary">
            <BellRing className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">Avisos</h2>
              {response.unread > 0 ? (
                <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                  {response.unread}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Movimientos recientes de pedidos, reseñas y reportes.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled={isUpdating || response.unread === 0}
          onClick={() => void handleMarkAll()}
        >
          {isUpdating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-2 h-4 w-4" />
          )}
          Marcar todo
        </Button>
      </div>

      {actionError ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {actionError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 rounded-xl bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
          Cargando avisos...
        </div>
      ) : errorMessage ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
          {errorMessage}
        </div>
      ) : response.items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-center text-sm text-muted-foreground">
          Aun no hay avisos en tu historial.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {response.items.map((notice, index) => (
            <article
              key={notice.id}
              className={cn(
                "rounded-xl border bg-background/85 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2",
                notice.readAt ? "border-border/60" : "border-primary/20 ring-1 ring-primary/8",
              )}
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
                        getSeverityTone(notice.severity),
                      )}
                    >
                      {TYPE_LABELS[notice.type]}
                    </span>
                    {!notice.readAt ? (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-semibold text-foreground">
                    {notice.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {notice.message}
                  </p>
                </div>

                {!notice.readAt ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 rounded-full"
                    disabled={isUpdating}
                    onClick={() => void handleMarkRead(notice.id)}
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span className="sr-only">Marcar como leido</span>
                  </Button>
                ) : null}
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDate(notice.createdAt)}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
