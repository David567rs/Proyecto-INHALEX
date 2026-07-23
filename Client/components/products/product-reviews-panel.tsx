"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  RefreshCcw,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  listProductReviews,
  type PublicProductReview,
} from "@/lib/reviews/reviews-api"
import { cn } from "@/lib/utils"

const PREVIEW_COUNT = 4
const REVIEWS_PAGE_SIZE = 8

interface ProductReviewsPanelProps {
  productId: string
  productName?: string
  rating?: number | null
  reviewCount?: number | null
}

interface ReviewsSummary {
  total: number
  averageRating: number | null
  totalPages: number
}

function formatDate(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
  }).format(date)
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
}

function getAvatarSurface(name: string) {
  const variants = [
    "from-emerald-100 to-lime-50 text-emerald-800 ring-emerald-100",
    "from-amber-100 to-orange-50 text-amber-800 ring-amber-100",
    "from-rose-100 to-pink-50 text-rose-800 ring-rose-100",
    "from-sky-100 to-cyan-50 text-sky-800 ring-sky-100",
    "from-violet-100 to-fuchsia-50 text-violet-800 ring-violet-100",
  ]
  const seed = Array.from(name).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  )

  return variants[seed % variants.length]
}

function ReviewStars({
  rating,
  size = "sm",
}: {
  rating: number
  size?: "sm" | "md"
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} de 5 estrellas`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={cn(
            size === "md" ? "h-4.5 w-4.5" : "h-3.5 w-3.5",
            index < Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-stone-100 text-stone-200",
          )}
        />
      ))}
    </span>
  )
}

function ReviewCard({
  review,
  index,
  spacious = false,
}: {
  review: PublicProductReview
  index: number
  spacious?: boolean
}) {
  return (
    <article
      className={cn(
        "group/review relative overflow-hidden rounded-[1.45rem] border border-stone-200/75 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(250,250,247,0.94))] shadow-[0_20px_44px_-38px_rgba(64,50,30,0.28)] transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-[0_28px_58px_-40px_rgba(15,84,43,0.24)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-reduce:transform-none motion-reduce:transition-none",
        spacious ? "p-5" : "p-4 sm:p-5",
      )}
      style={{
        animationDelay: `${Math.min(index, 7) * 55}ms`,
        animationFillMode: "both",
      }}
    >
      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] bg-gradient-to-br text-xs font-extrabold tracking-wide ring-1",
            getAvatarSurface(review.userName),
          )}
          aria-hidden="true"
        >
          {getInitials(review.userName)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {review.userName}
              </p>
              <p className="mt-0.5 text-[0.7rem] capitalize text-muted-foreground">
                {formatDate(review.createdAt)}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-100 bg-amber-50/80 px-2.5 py-1 text-xs font-extrabold text-amber-700">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              {review.rating}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ReviewStars rating={review.rating} />
            <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-emerald-700/85">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Compra completada
            </span>
          </div>
        </div>
      </div>

      <p
        className={cn(
          "relative mt-4 text-sm leading-6 text-muted-foreground",
          spacious && "sm:text-[0.92rem] sm:leading-7",
        )}
      >
        {review.comment}
      </p>
    </article>
  )
}

function ReviewsSkeleton() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2"
      aria-label="Cargando reseñas"
      aria-busy="true"
    >
      {Array.from({ length: PREVIEW_COUNT }, (_, index) => (
        <div
          key={index}
          className="rounded-[1.45rem] border border-stone-100 bg-white/70 p-5"
        >
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 animate-pulse rounded-[0.95rem] bg-stone-100 motion-reduce:animate-none" />
            <div className="flex-1 space-y-2">
              <span className="block h-3.5 w-2/5 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
              <span className="block h-2.5 w-1/4 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <span className="block h-3 w-full animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
            <span className="block h-3 w-11/12 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
            <span className="block h-3 w-3/5 animate-pulse rounded-full bg-stone-100 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProductReviewsPanel({
  productId,
  productName = "este aroma",
  rating,
  reviewCount,
}: ProductReviewsPanelProps) {
  const [reviews, setReviews] = useState<PublicProductReview[]>([])
  const [summary, setSummary] = useState<ReviewsSummary | null>(null)
  const [loadedPage, setLoadedPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const initialRequestRef = useRef(0)
  const moreRequestRef = useRef(0)

  const loadInitialReviews = useCallback(async () => {
    const requestId = initialRequestRef.current + 1
    initialRequestRef.current = requestId
    setIsLoading(true)
    setErrorMessage("")

    try {
      const response = await listProductReviews(productId, {
        page: 1,
        limit: REVIEWS_PAGE_SIZE,
      })
      if (initialRequestRef.current !== requestId) return

      setReviews(response.items)
      setLoadedPage(response.page)
      setSummary({
        total: response.total,
        averageRating: response.averageRating,
        totalPages: response.totalPages,
      })
    } catch {
      if (initialRequestRef.current !== requestId) return
      setReviews([])
      setSummary(null)
      setErrorMessage(
        "No pudimos cargar las reseñas en este momento. Inténtalo nuevamente.",
      )
    } finally {
      if (initialRequestRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }, [productId])

  useEffect(() => {
    setReviews([])
    setSummary(null)
    setLoadedPage(1)
    setIsLoadingMore(false)
    setIsDialogOpen(false)
    void loadInitialReviews()

    return () => {
      initialRequestRef.current += 1
      moreRequestRef.current += 1
    }
  }, [loadInitialReviews])

  const loadMoreReviews = async () => {
    if (isLoadingMore || !summary || loadedPage >= summary.totalPages) return

    const requestId = moreRequestRef.current + 1
    moreRequestRef.current = requestId
    setIsLoadingMore(true)
    setErrorMessage("")

    try {
      const response = await listProductReviews(productId, {
        page: loadedPage + 1,
        limit: REVIEWS_PAGE_SIZE,
      })
      if (moreRequestRef.current !== requestId) return

      setReviews((currentReviews) => {
        const byId = new Map(
          [...currentReviews, ...response.items].map((review) => [
            review.id,
            review,
          ]),
        )
        return Array.from(byId.values())
      })
      setLoadedPage(response.page)
      setSummary({
        total: response.total,
        averageRating: response.averageRating,
        totalPages: response.totalPages,
      })
    } catch {
      if (moreRequestRef.current !== requestId) return
      setErrorMessage(
        "No pudimos cargar más reseñas. Puedes volver a intentarlo.",
      )
    } finally {
      if (moreRequestRef.current === requestId) {
        setIsLoadingMore(false)
      }
    }
  }

  const previewReviews = useMemo(
    () => reviews.slice(0, PREVIEW_COUNT),
    [reviews],
  )
  const totalReviews = summary?.total ?? Math.max(0, reviewCount ?? 0)
  const averageRating = summary?.averageRating ?? rating ?? null
  const hasMoreReviews =
    summary !== null && loadedPage < summary.totalPages
  const remainingReviews = Math.max(0, totalReviews - reviews.length)
  const formattedAverage =
    typeof averageRating === "number" ? averageRating.toFixed(1) : "—"

  return (
    <section className="mt-10 overflow-hidden rounded-[2.2rem] border border-stone-200/75 bg-white/90 shadow-[0_34px_84px_-58px_rgba(64,50,30,0.32)] backdrop-blur-xl">
      <div className="relative overflow-hidden border-b border-emerald-100/70 bg-[radial-gradient(circle_at_88%_8%,rgba(137,195,76,0.2),transparent_30%),linear-gradient(125deg,rgba(238,249,242,0.96),rgba(255,255,255,0.98)_55%,rgba(250,247,237,0.92))] px-5 py-6 sm:px-7 lg:px-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border border-white/75 bg-white/25" />
        <div className="pointer-events-none absolute right-20 top-8 h-2 w-2 rounded-full bg-lime-400/60 motion-safe:animate-pulse motion-reduce:animate-none" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] border border-white/90 bg-white/88 shadow-[0_18px_38px_-24px_rgba(15,84,43,0.45)]">
              <Image
                src="/images/LogoSimple.png"
                alt=""
                width={42}
                height={42}
                className="h-10 w-10 object-contain"
              />
            </span>
            <div>
              <span className="inline-flex items-center gap-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Experiencias INHALEX
              </span>
              <h2 className="mt-1.5 font-serif text-2xl font-bold text-foreground sm:text-3xl">
                Opiniones sobre {productName}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Comentarios asociados a compras completadas, ordenados desde
                el más reciente.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-[1.35rem] border border-white/90 bg-white/82 px-4 py-3 shadow-[0_18px_40px_-30px_rgba(15,84,43,0.36)] backdrop-blur-xl">
            <span className="text-3xl font-extrabold leading-none text-foreground">
              {formattedAverage}
            </span>
            <span>
              {typeof averageRating === "number" ? (
                <ReviewStars rating={averageRating} size="md" />
              ) : null}
              <span className="mt-1 flex items-center gap-1 text-[0.7rem] font-semibold text-muted-foreground">
                <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
                {totalReviews}{" "}
                {totalReviews === 1 ? "reseña publicada" : "reseñas publicadas"}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-7">
        {isLoading ? (
          <ReviewsSkeleton />
        ) : errorMessage && reviews.length === 0 ? (
          <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/55 px-5 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
              <MessageSquareText className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-semibold text-foreground">
              Las reseñas no están disponibles temporalmente
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => void loadInitialReviews()}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-amber-200 bg-white px-4 text-sm font-bold text-amber-800 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 motion-reduce:transform-none"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-emerald-200/80 bg-emerald-50/30 px-5 py-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.15rem] border border-white bg-white text-primary shadow-[0_18px_36px_-28px_rgba(15,84,43,0.35)]">
              <MessageSquareText className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 font-semibold text-foreground">
              Este aroma todavía no tiene reseñas
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
              Cuando una persona complete su compra podrá compartir aquí su
              experiencia.
            </p>
          </div>
        ) : (
          <>
            <div className="grid items-start gap-4 md:grid-cols-2">
              {previewReviews.map((review, index) => (
                <ReviewCard key={review.id} review={review} index={index} />
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-[1.4rem] border border-emerald-100/80 bg-[linear-gradient(110deg,rgba(240,250,244,0.9),rgba(255,255,255,0.98))] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">
                  Mostrando {previewReviews.length} de {totalReviews} reseñas
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {totalReviews > PREVIEW_COUNT
                    ? "Consulta todas sin abandonar la ficha del producto."
                    : "Todas las opiniones publicadas están visibles."}
                </p>
              </div>

              {totalReviews > PREVIEW_COUNT ? (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_16px_30px_-18px_rgba(15,112,58,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-[0_20px_38px_-18px_rgba(15,112,58,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    Ver todas las reseñas ({totalReviews})
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </button>
                </DialogTrigger>

                <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden rounded-[1.8rem] border-emerald-100/80 bg-[#fbfdfb] p-0 shadow-[0_40px_120px_-42px_rgba(8,54,28,0.55)] motion-reduce:animate-none motion-reduce:transition-none sm:max-w-[72rem] [&_[data-slot=dialog-close]]:right-5 [&_[data-slot=dialog-close]]:top-5 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-white/80 [&_[data-slot=dialog-close]]:bg-white/85 [&_[data-slot=dialog-close]]:p-2 [&_[data-slot=dialog-close]]:shadow-sm">
                  <DialogHeader className="relative overflow-hidden border-b border-emerald-100/70 bg-[radial-gradient(circle_at_86%_10%,rgba(137,195,76,0.2),transparent_32%),linear-gradient(120deg,rgba(236,248,240,0.98),rgba(255,255,255,0.98))] px-5 py-5 pr-14 text-left sm:px-7 sm:py-6">
                    <div className="flex items-center gap-3.5">
                      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/90 bg-white/90 shadow-[0_16px_34px_-24px_rgba(15,84,43,0.4)]">
                        <Image
                          src="/images/LogoSimple.png"
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 object-contain"
                        />
                      </span>
                      <div>
                        <DialogTitle className="font-serif text-xl font-bold leading-tight text-foreground sm:text-2xl">
                          Todas las reseñas de {productName}
                        </DialogTitle>
                        <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                          <span className="font-bold text-amber-700">
                            {formattedAverage} de 5
                          </span>
                          <span aria-hidden="true">•</span>
                          <span>
                            {totalReviews}{" "}
                            {totalReviews === 1 ? "opinión" : "opiniones"}
                          </span>
                          <span aria-hidden="true">•</span>
                          <span>Más recientes primero</span>
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <ScrollArea className="h-[min(66dvh,45rem)]">
                    <div className="grid items-start gap-4 p-4 sm:p-6 lg:grid-cols-2">
                      {reviews.map((review, index) => (
                        <ReviewCard
                          key={review.id}
                          review={review}
                          index={index}
                          spacious
                        />
                      ))}
                    </div>

                    <div className="px-4 pb-6 sm:px-6">
                      {errorMessage && reviews.length > 0 ? (
                        <p
                          className="mb-3 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-center text-xs font-medium text-amber-900"
                          role="status"
                        >
                          {errorMessage}
                        </p>
                      ) : null}

                      {hasMoreReviews ? (
                        <button
                          type="button"
                          onClick={() => void loadMoreReviews()}
                          disabled={isLoadingMore}
                          className="group mx-auto flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/15 bg-white px-5 text-sm font-bold text-primary shadow-[0_14px_30px_-24px_rgba(15,112,58,0.55)] transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transform-none"
                        >
                          {isLoadingMore ? (
                            <>
                              <Loader2
                                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                                aria-hidden="true"
                              />
                              Cargando reseñas...
                            </>
                          ) : (
                            <>
                              Cargar más reseñas
                              {remainingReviews > 0
                                ? ` (${remainingReviews} restantes)`
                                : ""}
                              <ArrowRight
                                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                                aria-hidden="true"
                              />
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-center text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Ya estás viendo todas las reseñas publicadas.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
                </Dialog>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Ya estás viendo todas las reseñas.
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
