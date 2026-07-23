import { apiRequest } from "@/lib/api/client"

export type ProductReviewStatus = "published" | "hidden"

export interface ProductReview {
  id: string
  userName: string
  productId: string
  productName: string
  productSlug: string
  productImage: string
  orderId: string
  orderReference: string
  rating: number
  comment: string
  status: ProductReviewStatus
  createdAt?: string
}

export interface PublicProductReview {
  id: string
  userName: string
  rating: number
  comment: string
  createdAt?: string
}

export interface ReviewableProduct {
  orderId: string
  orderReference: string
  productId: string
  productName: string
  productSlug: string
  productImage: string
  presentation: string
  purchasedAt?: string
  review?: ProductReview
}

export interface ReviewableProductsResponse {
  pending: ReviewableProduct[]
  completed: ReviewableProduct[]
}

export interface CreateProductReviewInput {
  productId: string
  orderId?: string
  rating: number
  comment: string
}

export interface ProductReviewsPage {
  items: PublicProductReview[]
  total: number
  page: number
  limit: number
  totalPages: number
  averageRating: number | null
}

export interface ListProductReviewsOptions {
  page?: number
  limit?: number
}

export function listReviewableProducts(
  token: string,
): Promise<ReviewableProductsResponse> {
  return apiRequest<ReviewableProductsResponse>("/reviews/me/eligible", {
    method: "GET",
    token,
  })
}

export function createProductReview(
  payload: CreateProductReviewInput,
  token: string,
): Promise<ProductReview> {
  return apiRequest<ProductReview>("/reviews", {
    method: "POST",
    body: payload,
    token,
  })
}

export async function listProductReviews(
  productId: string,
  options: ListProductReviewsOptions = {},
): Promise<ProductReviewsPage> {
  const page = Math.max(1, Math.floor(options.page ?? 1))
  const limit = Math.max(1, Math.min(20, Math.floor(options.limit ?? 8)))
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  const response = await apiRequest<ProductReviewsPage | ProductReview[]>(
    `/reviews/products/${productId}?${query.toString()}`,
    {
      method: "GET",
    },
  )

  // Compatibilidad temporal con una instancia anterior del backend.
  if (Array.isArray(response)) {
    const averageRating =
      response.length > 0
        ? Number(
            (
              response.reduce((sum, review) => sum + review.rating, 0) /
              response.length
            ).toFixed(1),
          )
        : null

    return {
      items: response,
      total: response.length,
      page: 1,
      limit: response.length || limit,
      totalPages: 1,
      averageRating,
    }
  }

  return response
}
