"use client"

import { useEffect, useState } from "react"
import { MessageSquareText, Star } from "lucide-react"
import {
  listProductReviews,
  type ProductReview,
} from "@/lib/reviews/reviews-api"

interface ProductReviewsPanelProps {
  productId: string
}

function formatDate(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date)
}

export function ProductReviewsPanel({ productId }: ProductReviewsPanelProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    const loadReviews = async () => {
      setIsLoading(true)
      try {
        const response = await listProductReviews(productId)
        if (!isCancelled) {
          setReviews(response)
        }
      } catch {
        if (!isCancelled) {
          setReviews([])
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadReviews()

    return () => {
      isCancelled = true
    }
  }, [productId])

  return (
    <section className="mt-8 rounded-[2rem] border border-stone-200/80 bg-white/85 p-5 shadow-[0_18px_36px_-32px_rgba(64,50,30,0.2)]">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <MessageSquareText className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Reseñas</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Comentarios de clientes con compra completada.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-5 rounded-xl bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
          Cargando reseñas...
        </p>
      ) : reviews.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border/70 bg-secondary/20 px-4 py-6 text-center text-sm text-muted-foreground">
          Aun no hay reseñas publicadas.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {reviews.slice(0, 4).map((review, index) => (
            <article
              key={review.id}
              className="rounded-xl border border-border/60 bg-background/85 p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {review.userName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(review.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {review.rating}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {review.comment}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
