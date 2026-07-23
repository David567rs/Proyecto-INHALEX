import { apiRequest } from "@/lib/api/client"
import { getAccessToken } from "@/lib/auth/token-storage"

export interface RecommendationRuleSummary {
  antecedentSlugs: string[]
  antecedentNames: string[]
  consequentSlug: string
  consequentName: string
  support: number
  confidence: number
  lift: number
  cooccurrenceCount: number
  score: number
  available: boolean
}

export interface RecommendationModelSummary {
  model: {
    name: string
    version: string
    isSynthetic: boolean
    generatedAt: string
    datasetSha256: string
  }
  training: {
    transactions: number
    periodStart?: string
    periodEnd?: string
    minSupport: number
    minConfidence: number
    minLift: number
  }
  metrics: {
    rules: number
    catalogCoverage: number
    temporalTop1HitRate: number
  }
  health: {
    rules: number
    catalogProducts: number
    unresolvedSlugs: string[]
    immediatelyAvailableProducts: number
  }
  topRules: RecommendationRuleSummary[]
}

export async function fetchRecommendationModelSummary() {
  const token = getAccessToken() ?? ""
  return apiRequest<RecommendationModelSummary>(
    "/recommendations/admin/summary",
    {
      method: "GET",
      token,
    },
  )
}
