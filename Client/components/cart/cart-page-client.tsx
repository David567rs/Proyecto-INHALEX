"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useCart } from "@/components/cart/cart-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { CONTACT_EMAIL_HREF, CONTACT_PHONE_HREF } from "@/lib/company/contact-info"
import { resolveProductDisplayImage } from "@/lib/products/product-images"
import { cn } from "@/lib/utils"

function formatPrice(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(value)
}

function getIssueTone(severity: "info" | "warning" | "error") {
  if (severity === "error") return "border-rose-200 bg-rose-50 text-rose-700"
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-sky-200 bg-sky-50 text-sky-700"
}

function getFulfillmentTone(fulfillment?: string) {
  if (fulfillment === "backorder") return "border-amber-200 bg-amber-50 text-amber-700"
  if (fulfillment === "manual") return "border-sky-200 bg-sky-50 text-sky-700"
  if (fulfillment === "adjusted") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-emerald-200 bg-emerald-50 text-emerald-700"
}

function getFulfillmentLabel(fulfillment?: string) {
  if (fulfillment === "backorder") return "Bajo pedido"
  if (fulfillment === "manual") return "Revision manual"
  if (fulfillment === "adjusted") return "Cantidad ajustada"
  return "Disponible"
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidPhone(value: string) {
  return /^\d{10,15}$/.test(value)
}

export function CartPageClient() {
  const { user } = useAuth()
  const {
    items,
    preview,
    subtotal,
    itemCount,
    updateItemQuantity,
    removeItem,
    isSyncing,
    syncError,
    createDraft,
    lastDraft,
    clearLastDraft,
  } = useCart()
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    setCustomerName((current) => current || user.name || "")
    setCustomerEmail((current) => current || user.email || "")
    setCustomerPhone((current) => current || user.phone || "")
  }, [user])

  const issueList = preview?.issues ?? []
  const needsManualReview = preview?.needsManualReview ?? false

  const isFormValid = useMemo(
    () =>
      customerName.trim().length >= 2 &&
      isValidEmail(customerEmail.trim()) &&
      isValidPhone(customerPhone.trim()),
    [customerEmail, customerName, customerPhone],
  )

  const handleSubmit = async () => {
    if (!isFormValid) {
      setErrorMessage(
        "Completa nombre, correo y telefono con datos validos para confirmar tu pedido.",
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage("")
    try {
      await createDraft({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim() || undefined,
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos confirmar tu pedido. Intenta de nuevo.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (lastDraft) {
    return (
      <section className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-3xl rounded-[2.2rem] border border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,250,245,0.94))] p-8 shadow-[0_30px_80px_-42px_rgba(15,84,43,0.34)] lg:p-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Pedido recibido
          </div>
          <h1 className="mt-5 text-balance text-4xl font-serif font-semibold text-foreground lg:text-5xl">
            Tu pedido ya quedo registrado con el folio {lastDraft.reference}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            Ya registramos tu seleccion con inventario validado y reserva inmediata de existencias disponibles. Ahora el pedido queda pendiente de revision comercial antes del seguimiento final.
          </p>

          <div className="mt-8 grid gap-4 rounded-[1.8rem] border border-emerald-100/80 bg-white/88 p-5 sm:grid-cols-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Folio
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{lastDraft.reference}</p>
            </div>
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Aromas validados
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{lastDraft.totalItems}</p>
            </div>
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Total estimado
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatPrice(lastDraft.subtotal, lastDraft.currency)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.6rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Estado actual: <span className="font-semibold">Pendiente de revision</span>. El equipo revisara disponibilidad final, aromas bajo pedido y siguientes pasos contigo.
          </div>

          {lastDraft.issues.length > 0 ? (
            <div className="mt-8 space-y-3">
              {lastDraft.issues.map((issue) => (
                <div
                  key={`${issue.code}-${issue.productId ?? issue.title}`}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm leading-6",
                    getIssueTone(issue.severity),
                  )}
                >
                  <p className="font-semibold">{issue.title}</p>
                  <p className="mt-1">{issue.description}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-full px-6 shadow-[0_22px_42px_-26px_rgba(16,112,58,0.48)]">
              <Link href="/">Volver al catalogo</Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-emerald-100 bg-white/88"
              onClick={clearLastDraft}
            >
              Confirmar otra bolsa
            </Button>
          </div>

          <div className="mt-10 rounded-[1.8rem] border border-stone-200/80 bg-white/88 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Siguiente paso
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Si quieres acelerar el seguimiento, tambien puedes escribirnos por telefono o correo y mencionar tu folio.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-full" asChild>
                <a href={CONTACT_PHONE_HREF}>Llamar al equipo</a>
              </Button>
              <Button variant="outline" className="rounded-full" asChild>
                <a href={CONTACT_EMAIL_HREF}>Enviar correo</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-3xl rounded-[2.2rem] border border-dashed border-emerald-200 bg-white/92 p-8 text-center shadow-[0_28px_70px_-42px_rgba(15,84,43,0.22)] lg:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/8 text-primary">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-balance text-4xl font-serif font-semibold text-foreground lg:text-5xl">
            Tu bolsa esta vacia por ahora
          </h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            Explora las lineas, agrega tus aromas favoritos y cuando estes listo aqui podremos validar inventario real y confirmar tu pedido.
          </p>
          <Button asChild className="mt-8 rounded-full px-6 shadow-[0_22px_42px_-26px_rgba(16,112,58,0.48)]">
            <Link href="/">Ir al catalogo</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="container mx-auto px-4 py-8 lg:py-12">
      <div className="page-fade-up text-sm text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-primary">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Bolsa</span>
      </div>

      <div className="mt-6 grid gap-8 xl:grid-cols-[1.16fr_0.84fr]">
        <div className="page-fade-up page-fade-up-delay-1 space-y-5">
          <div className="rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,251,246,0.94))] p-6 shadow-[0_26px_70px_-42px_rgba(15,84,43,0.24)] lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/8 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Bolsa validada
            </div>
            <h1 className="mt-5 text-balance text-4xl font-serif font-semibold text-foreground lg:text-5xl">
              Revisa tus aromas antes de confirmar el pedido
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
              Esta vista ya toma el inventario real para mostrarte reserva inmediata, cantidades ajustadas y aromas que pasan a bajo pedido.
            </p>
          </div>

          {syncError ? (
            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
              {syncError}
            </div>
          ) : null}

          {issueList.length > 0 ? (
            <div className="space-y-3 rounded-[1.8rem] border border-stone-200/80 bg-white/88 p-5 shadow-[0_18px_40px_-34px_rgba(64,50,30,0.2)]">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/75">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Alertas de validacion
              </div>
              {issueList.map((issue) => (
                <div
                  key={`${issue.code}-${issue.productId ?? issue.title}`}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm leading-6",
                    getIssueTone(issue.severity),
                  )}
                >
                  <p className="font-semibold">{issue.title}</p>
                  <p className="mt-1">{issue.description}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-4">
            {items.map((item) => {
              const previewItem = preview?.items.find((candidate) => candidate.productId === item.id)
              return (
                <article
                  key={item.id}
                  className="rounded-[1.9rem] border border-emerald-100/80 bg-white/92 p-5 shadow-[0_18px_48px_-34px_rgba(15,84,43,0.28)] lg:p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-[1.4rem] border border-emerald-100 bg-white sm:h-44 sm:w-36">
                      <Image
                        src={resolveProductDisplayImage(item)}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 144px"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[0.7rem] font-medium",
                                getFulfillmentTone(previewItem?.fulfillment),
                              )}
                            >
                              {getFulfillmentLabel(previewItem?.fulfillment)}
                            </span>
                            <span className="rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-[0.72rem] font-medium text-emerald-700">
                              {item.presentation}
                            </span>
                          </div>
                          <h2 className="mt-3 text-2xl font-semibold leading-tight text-foreground">
                            {item.name}
                          </h2>
                          <p className="mt-2 text-sm text-muted-foreground">{item.origin}</p>
                          {previewItem?.message ? (
                            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                              {previewItem.message}
                            </p>
                          ) : null}
                          {(previewItem?.reservedQuantity ?? 0) > 0 || (previewItem?.backorderQuantity ?? 0) > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              {(previewItem?.reservedQuantity ?? 0) > 0 ? (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                                  {previewItem?.reservedQuantity} se reservan ahora
                                </span>
                              ) : null}
                              {(previewItem?.backorderQuantity ?? 0) > 0 ? (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                                  {previewItem?.backorderQuantity} quedan bajo pedido
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Subtotal
                          </p>
                          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                            {formatPrice(
                              previewItem?.subtotal ?? item.price * item.quantity,
                              item.currency,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1 rounded-full border border-emerald-100 bg-secondary/40 p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center text-base font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-3">
                          {typeof previewItem?.stockAvailable === "number" ? (
                            <span className="text-sm text-muted-foreground">
                              {previewItem.stockAvailable} disponibles ahora
                            </span>
                          ) : null}
                          <Button
                            variant="ghost"
                            className="rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Quitar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <aside className="page-fade-up page-fade-up-delay-2 space-y-5">
          <div className="rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,251,248,0.96))] p-6 shadow-[0_26px_70px_-42px_rgba(15,84,43,0.24)] lg:p-7">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-foreground/75">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Resumen seguro
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total de aromas</span>
                <span>{itemCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Revision en vivo</span>
                <span>{isSyncing ? "Actualizando..." : "Inventario conectado"}</span>
              </div>
              <Separator className="bg-emerald-100/80" />
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Total estimado
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
                    {formatPrice(subtotal, preview?.currency ?? "MXN")}
                  </p>
                </div>
                <div className="rounded-full bg-primary/8 px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-primary">
                  {preview?.currency ?? "MXN"}
                </div>
              </div>
              {needsManualReview ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
                  Este pedido requerira revision manual porque incluye aromas bajo pedido o pendientes de confirmacion.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_18px_48px_-34px_rgba(64,50,30,0.22)] lg:p-7">
            <h2 className="text-2xl font-serif font-semibold text-foreground">
              Datos para confirmar tu pedido
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Todavia no te cobramos nada. Este paso confirma tu pedido, reserva existencias disponibles y lo deja listo para revision del equipo.
            </p>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre completo</label>
                <Input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Tu nombre"
                  className="h-12 rounded-2xl border-emerald-100 bg-background/80"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Correo</label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="tu@correo.com"
                  className="h-12 rounded-2xl border-emerald-100 bg-background/80"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Telefono</label>
                <Input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value.replace(/\D/g, ""))}
                  placeholder="10 a 15 digitos"
                  className="h-12 rounded-2xl border-emerald-100 bg-background/80"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notas para el equipo</label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Horario ideal, duda puntual o detalle importante sobre tu pedido."
                  className="min-h-[7.5rem] rounded-[1.5rem] border-emerald-100 bg-background/80"
                />
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <Button
              className="mt-6 h-14 w-full rounded-full text-base shadow-[0_24px_44px_-28px_rgba(16,112,58,0.5)]"
              disabled={!preview?.canConfirmOrder || !isFormValid || isSubmitting || isSyncing}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirmando pedido...
                </>
              ) : (
                <>
                  Confirmar pedido
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
              Al confirmar el pedido reservamos existencias inmediatas y registramos el folio para seguimiento. El pago y la confirmacion final se gestionan despues.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
