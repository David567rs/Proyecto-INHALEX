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

export function listProductReviews(productId: string): Promise<ProductReview[]> {
  return apiRequest<ProductReview[]>(`/reviews/products/${productId}`, {
    method: "GET",
  })
}
