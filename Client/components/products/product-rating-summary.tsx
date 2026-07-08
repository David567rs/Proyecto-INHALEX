import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductRatingSummaryProps {
  rating?: number | null
  reviews?: number | null
  className?: string
  size?: "sm" | "md"
  showValue?: boolean
  showCount?: boolean
  countFormat?: "label" | "parentheses"
}

function normalizeRating(rating?: number | null) {
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) {
    return null
  }

  return Math.max(0, Math.min(5, rating))
}

function formatRating(rating: number) {
  return rating.toFixed(1).replace(/\.0$/, "")
}

function formatReviewCount(reviews?: number | null) {
  const safeReviews =
    typeof reviews === "number" && Number.isFinite(reviews)
      ? Math.max(0, Math.floor(reviews))
      : 0

  return {
    value: safeReviews,
    label: `${safeReviews} ${safeReviews === 1 ? "reseña" : "reseñas"}`,
  }
}

function getStarFill(rating: number, index: number) {
  return Math.max(0, Math.min(100, (rating - index) * 100))
}

export function ProductRatingSummary({
  rating,
  reviews,
  className,
  size = "sm",
  showValue = true,
  showCount = true,
  countFormat = "label",
}: ProductRatingSummaryProps) {
  const normalizedRating = normalizeRating(rating)

  if (normalizedRating === null) {
    return null
  }

  const formattedRating = formatRating(normalizedRating)
  const reviewCount = formatReviewCount(reviews)
  const starClassName = size === "md" ? "h-5 w-5" : "h-4 w-4"

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={`Calificación ${formattedRating} de 5, ${reviewCount.label}`}
    >
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={cn("relative inline-flex shrink-0", starClassName)}>
            <Star className={cn(starClassName, "fill-neutral-200 text-neutral-200")} />
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${getStarFill(normalizedRating, index)}%` }}
            >
              <Star className={cn(starClassName, "fill-amber-400 text-amber-400")} />
            </span>
          </span>
        ))}
      </div>

      {showValue ? (
        <span className="text-sm font-semibold text-amber-700">
          {formattedRating}
        </span>
      ) : null}

      {showCount ? (
        <span className="text-sm text-muted-foreground">
          {countFormat === "parentheses"
            ? `(${reviewCount.value})`
            : reviewCount.label}
        </span>
      ) : null}
    </div>
  )
}
