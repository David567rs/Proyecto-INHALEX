"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Loader2, MessageSquareText, Send, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getAccessToken } from "@/lib/auth/token-storage"
import {
  createProductReview,
  listReviewableProducts,
  type ReviewableProduct,
  type ReviewableProductsResponse,
} from "@/lib/reviews/reviews-api"
import { cn } from "@/lib/utils"

interface ReviewDraft {
  rating: number
  comment: string
  isSubmitting: boolean
}

function formatDate(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date)
}

function ReviewStars({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className="rounded-full p-1 text-amber-400 transition-transform duration-200 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={() => onChange(rating)}
        >
          <Star
            className={cn(
              "h-5 w-5",
              rating <= value ? "fill-amber-400" : "fill-transparent text-amber-200",
            )}
          />
          <span className="sr-only">{rating} estrellas</span>
        </button>
      ))}
    </div>
  )
}

export function AccountReviews() {
  const { toast } = useToast()
  const [data, setData] = useState<ReviewableProductsResponse>({
    pending: [],
    completed: [],
  })
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  const loadReviewables = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    setErrorMessage("")
    try {
      const response = await listReviewableProducts(token)
      setData(response)
      setDrafts((current) => {
        const next = { ...current }
        for (const item of response.pending) {
          next[item.productId] ??= {
            rating: 0,
            comment: "",
            isSubmitting: false,
          }
        }
        return next
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar articulos para resena.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReviewables()
  }, [loadReviewables])

  const updateDraft = (
    productId: string,
    patch: Partial<Omit<ReviewDraft, "isSubmitting">>,
  ) => {
    setDrafts((current) => {
      const currentDraft = current[productId] ?? {
        rating: 0,
        comment: "",
        isSubmitting: false,
      }

      return {
        ...current,
        [productId]: {
          ...currentDraft,
          ...patch,
        },
      }
    })
  }

  const setSubmitting = (productId: string, isSubmitting: boolean) => {
    setDrafts((current) => {
      const currentDraft = current[productId] ?? {
        rating: 0,
        comment: "",
        isSubmitting,
      }

      return {
        ...current,
        [productId]: {
          ...currentDraft,
          isSubmitting,
        },
      }
    })
  }

  const handleSubmit = async (item: ReviewableProduct) => {
    const token = getAccessToken()
    const draft = drafts[item.productId]
    if (!token || !draft) return

    if (draft.rating <= 0 || draft.comment.trim().length < 4) {
      toast({
        variant: "destructive",
        title: "Resena incompleta",
        description: "Selecciona una calificacion y agrega un comentario breve.",
      })
      return
    }

    setSubmitting(item.productId, true)
    try {
      await createProductReview(
        {
          productId: item.productId,
          orderId: item.orderId,
          rating: draft.rating,
          comment: draft.comment.trim(),
        },
        token,
      )
      toast({
        title: "Resena publicada",
        description: `${item.productName} ya tiene tu calificacion.`,
      })
      await loadReviewables()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo publicar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      })
    } finally {
      setSubmitting(item.productId, false)
    }
  }

  return (
    <section className="rounded-[1.6rem] border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_18px_44px_-34px_rgba(16,112,58,0.28)] sm:p-6 lg:col-span-2">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <MessageSquareText className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Mis reseñas</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Califica articulos de pedidos completados.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 rounded-xl bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
          Cargando articulos...
        </div>
      ) : errorMessage ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
          {errorMessage}
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {data.pending.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-center text-sm text-muted-foreground">
              No tienes articulos pendientes por calificar.
            </div>
          ) : (
            data.pending.map((item, index) => {
              const draft = drafts[item.productId] ?? {
                rating: 0,
                comment: "",
                isSubmitting: false,
              }

              return (
                <article
                  key={`${item.orderId}-${item.productId}`}
                  className="rounded-xl border border-border/60 bg-background/85 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="flex flex-col gap-4 md:flex-row">
                    <Link
                      href={`/productos/${item.productSlug}`}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary"
                    >
                      <Image
                        src={item.productImage || "/placeholder.svg"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <Link
                            href={`/productos/${item.productSlug}`}
                            className="font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {item.productName}
                          </Link>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.orderReference} - {formatDate(item.purchasedAt)}
                          </p>
                        </div>
                        <ReviewStars
                          value={draft.rating}
                          disabled={draft.isSubmitting}
                          onChange={(rating) => updateDraft(item.productId, { rating })}
                        />
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                        <Textarea
                          className="min-h-[92px] resize-none rounded-xl bg-white/80"
                          value={draft.comment}
                          disabled={draft.isSubmitting}
                          maxLength={700}
                          placeholder="Comparte como fue tu experiencia."
                          onChange={(event) =>
                            updateDraft(item.productId, {
                              comment: event.target.value,
                            })
                          }
                        />
                        <Button
                          type="button"
                          className="rounded-full"
                          disabled={draft.isSubmitting}
                          onClick={() => void handleSubmit(item)}
                        >
                          {draft.isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Publicar
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          )}

          {data.completed.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.completed.slice(0, 4).map((item) => (
                <article
                  key={`completed-${item.productId}`}
                  className="rounded-xl border border-border/60 bg-secondary/15 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(item.review?.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {item.review?.rating ?? 0}
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {item.review?.comment}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
