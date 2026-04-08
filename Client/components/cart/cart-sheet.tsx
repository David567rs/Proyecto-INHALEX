"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, ShoppingBag, Sparkles, Trash2 } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/components/cart/cart-provider"
import { resolveProductDisplayImage } from "@/lib/products/product-images"
import { cn } from "@/lib/utils"

function formatPrice(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(value)
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

export function CartSheet() {
  const {
    items,
    preview,
    itemCount,
    subtotal,
    isSheetOpen,
    setSheetOpen,
    updateItemQuantity,
    removeItem,
    syncError,
    isSyncing,
  } = useCart()

  return (
    <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[28rem] flex-col gap-0 border-l border-emerald-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,251,248,0.98))] p-0 shadow-[0_28px_80px_-34px_rgba(15,84,43,0.35)] sm:max-w-[28rem]"
      >
        <SheetHeader className="border-b border-emerald-100/80 px-6 pb-4 pt-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/10 bg-primary/8 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Mi bolsa
          </div>
          <SheetTitle className="mt-3 text-2xl font-serif font-semibold text-foreground">
            {itemCount > 0 ? `${itemCount} aroma${itemCount === 1 ? "" : "s"} listos` : "Tu bolsa esta vacia"}
          </SheetTitle>
          <SheetDescription className="text-sm leading-6 text-muted-foreground">
            Revisa tus aromas, valida existencias y confirma tu pedido con una experiencia clara y segura.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {syncError ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {syncError}
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="flex h-full min-h-[22rem] flex-col items-center justify-center rounded-[2rem] border border-dashed border-emerald-200 bg-white/70 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/8 text-primary">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-2xl font-serif font-semibold text-foreground">
                Aun no eliges tus aromas
              </h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                Cuando agregues productos desde el catalogo apareceran aqui con su validacion de inventario.
              </p>
              <SheetClose asChild>
                <Button asChild className="mt-6 rounded-full px-6 shadow-[0_20px_40px_-24px_rgba(16,112,58,0.45)]">
                  <Link href="/">Explorar catalogo</Link>
                </Button>
              </SheetClose>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const previewItem = preview?.items.find((candidate) => candidate.productId === item.id)
                return (
                  <article
                    key={item.id}
                    className="rounded-[1.6rem] border border-emerald-100/80 bg-white/90 p-4 shadow-[0_16px_34px_-28px_rgba(15,84,43,0.35)]"
                  >
                    <div className="flex gap-4">
                      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[1.3rem] border border-emerald-100 bg-white">
                        <Image
                          src={resolveProductDisplayImage(item)}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold leading-tight text-foreground">
                              {item.name}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.presentation} · {item.origin}
                            </p>
                          </div>
                          <button
                            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Quitar {item.name}</span>
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[0.7rem] font-medium",
                              getFulfillmentTone(previewItem?.fulfillment),
                            )}
                          >
                            {getFulfillmentLabel(previewItem?.fulfillment)}
                          </span>
                          {typeof previewItem?.stockAvailable === "number" &&
                          previewItem.stockAvailable > 0 &&
                          previewItem.fulfillment !== "backorder" ? (
                            <span className="text-xs text-muted-foreground">
                              {previewItem.stockAvailable} disponibles ahora
                            </span>
                          ) : null}
                        </div>

                        {previewItem?.message ? (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {previewItem.message}
                          </p>
                        ) : null}

                        {(previewItem?.reservedQuantity ?? 0) > 0 ||
                        (previewItem?.backorderQuantity ?? 0) > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            {(previewItem?.reservedQuantity ?? 0) > 0 ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                                {previewItem?.reservedQuantity} se reservan
                              </span>
                            ) : null}
                            {(previewItem?.backorderQuantity ?? 0) > 0 ? (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                                {previewItem?.backorderQuantity} bajo pedido
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1 rounded-full border border-emerald-100 bg-secondary/40 p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-8 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="text-right">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Subtotal
                            </p>
                            <p className="text-lg font-semibold text-foreground">
                              {formatPrice(
                                previewItem?.subtotal ?? item.price * item.quantity,
                                item.currency,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-emerald-100/80 bg-white/82 px-6 py-5">
          <div className="rounded-[1.5rem] border border-emerald-100/80 bg-background/90 p-4 shadow-[0_18px_36px_-28px_rgba(15,84,43,0.32)]">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total de aromas</span>
              <span>{itemCount}</span>
            </div>
            <Separator className="my-3 bg-emerald-100/80" />
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Total estimado
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                  {formatPrice(subtotal, preview?.currency ?? "MXN")}
                </p>
              </div>
              {isSyncing ? (
                <span className="text-xs font-medium text-muted-foreground">
                  Validando inventario...
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <SheetClose asChild>
              <Button
                asChild
                disabled={items.length === 0}
                className="h-13 rounded-full shadow-[0_22px_42px_-26px_rgba(16,112,58,0.48)]"
              >
                <Link href="/bolsa">Revisar bolsa y confirmar pedido</Link>
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="ghost" className="rounded-full" asChild>
                <Link href="/">Seguir explorando</Link>
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
