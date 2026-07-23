import { apiRequest } from "@/lib/api/client"
import {
  mapApiProduct,
  type ProductApiItem,
} from "@/lib/products/products-api"
import type { Product } from "@/lib/types/product"

export type RecommendationSource = "apriori" | "fallback" | "none"

export interface RecommendationMetrics {
  support: number
  confidence: number
  lift: number
}

export interface RecommendationModel {
  version: string
  isSynthetic: boolean
  generatedAt: string
}

export interface BasketRecommendation {
  product: Product
  basedOn: string[]
  explanation: string
  metrics?: RecommendationMetrics
}

export interface BasketRecommendations {
  source: RecommendationSource
  recommendations: BasketRecommendation[]
  model: RecommendationModel
}

interface BasketRecommendationApiItem {
  product: ProductApiItem
  basedOn: string[]
  explanation: string
  metrics?: RecommendationMetrics
}

interface BasketRecommendationsApiResponse {
  source: RecommendationSource
  recommendations: BasketRecommendationApiItem[]
  model: RecommendationModel
}

export async function fetchBasketRecommendations(
  productIds: string[],
  limit = 1,
): Promise<BasketRecommendations> {
  const uniqueProductIds = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))]

  if (uniqueProductIds.length === 0) {
    return {
      source: "none",
      recommendations: [],
      model: {
        version: "unavailable",
        isSynthetic: false,
        generatedAt: "",
      },
    }
  }

  const response = await apiRequest<BasketRecommendationsApiResponse>(
    "/recommendations/basket",
    {
      method: "POST",
      body: {
        productIds: uniqueProductIds,
        limit: Math.max(1, Math.min(3, Math.floor(limit))),
      },
    },
  )

  return {
    source: response.source,
    recommendations: response.recommendations.map((recommendation) => ({
      ...recommendation,
      basedOn: Array.isArray(recommendation.basedOn)
        ? recommendation.basedOn.filter(Boolean)
        : [],
      explanation: recommendation.explanation.trim(),
      product: mapApiProduct(recommendation.product),
    })),
    model: response.model,
  }
}
