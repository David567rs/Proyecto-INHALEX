import type { ProductCategoryOption } from "@/lib/products/categories"
import type { Product } from "@/lib/types/product"

export interface RankedProductResult {
  product: Product
  score: number
}

export function normalizeProductSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1

      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      )
    }

    previous.splice(0, previous.length, ...current)
  }

  return previous[right.length]
}

function getTokenScore(token: string, fields: string[][]): number {
  const [nameWords, aromaWords, categoryWords, benefitWords, detailWords] = fields
  const fieldScores = [
    { words: nameWords, exact: 150, prefix: 125, includes: 92 },
    { words: aromaWords, exact: 118, prefix: 104, includes: 78 },
    { words: categoryWords, exact: 100, prefix: 88, includes: 68 },
    { words: benefitWords, exact: 82, prefix: 72, includes: 56 },
    { words: detailWords, exact: 65, prefix: 55, includes: 40 },
  ]

  let bestScore = 0

  for (const field of fieldScores) {
    for (const word of field.words) {
      if (word === token) {
        bestScore = Math.max(bestScore, field.exact)
      } else if (word.startsWith(token)) {
        bestScore = Math.max(bestScore, field.prefix)
      } else if (word.includes(token)) {
        bestScore = Math.max(bestScore, field.includes)
      } else if (
        token.length >= 4 &&
        word.length >= 4 &&
        Math.abs(word.length - token.length) <= 2 &&
        editDistance(word, token) <= (token.length >= 8 ? 2 : 1)
      ) {
        bestScore = Math.max(bestScore, 48)
      }
    }
  }

  return bestScore
}

export function rankProductsForSearch(
  products: Product[],
  query: string,
  categories: ProductCategoryOption[] = [],
  limit = 6,
): RankedProductResult[] {
  const normalizedQuery = normalizeProductSearchText(query)
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)

  if (tokens.length === 0) {
    return [...products]
      .sort(
        (left, right) =>
          Number(right.inStock || right.allowBackorder) -
            Number(left.inStock || left.allowBackorder) ||
          (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
          (right.rating ?? 0) - (left.rating ?? 0) ||
          left.name.localeCompare(right.name, "es"),
      )
      .slice(0, limit)
      .map((product) => ({ product, score: 0 }))
  }

  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  )

  const rankedResults = products
    .map((product): RankedProductResult | null => {
      const normalizedName = normalizeProductSearchText(product.name)
      const normalizedSlug = normalizeProductSearchText(product.slug ?? "")
      const normalizedAromas = (product.aromas ?? []).map(
        normalizeProductSearchText,
      )
      const normalizedCategory = normalizeProductSearchText(
        `${product.category} ${categoryNames.get(product.category) ?? ""}`,
      )
      const normalizedBenefits = product.benefits.map(
        normalizeProductSearchText,
      )
      const normalizedDetails = [
        product.description,
        product.longDescription ?? "",
        product.presentation,
        product.origin,
      ].map(normalizeProductSearchText)

      const fields = [
        `${normalizedName} ${normalizedSlug}`.split(/\s+/).filter(Boolean),
        normalizedAromas.flatMap((value) => value.split(/\s+/).filter(Boolean)),
        normalizedCategory.split(/\s+/).filter(Boolean),
        normalizedBenefits.flatMap((value) =>
          value.split(/\s+/).filter(Boolean),
        ),
        normalizedDetails.flatMap((value) =>
          value.split(/\s+/).filter(Boolean),
        ),
      ]

      let score = 0
      for (const token of tokens) {
        const tokenScore = getTokenScore(token, fields)
        if (tokenScore === 0) return null
        score += tokenScore
      }

      if (normalizedName === normalizedQuery) score += 500
      else if (normalizedName.startsWith(normalizedQuery)) score += 320
      else if (normalizedName.includes(normalizedQuery)) score += 180
      else if (normalizedAromas.some((aroma) => aroma.startsWith(normalizedQuery))) {
        score += 130
      }

      if (product.inStock || product.allowBackorder) score += 8

      return { product, score }
    })
    .filter((result): result is RankedProductResult => result !== null)
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.product.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (right.product.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        (right.product.rating ?? 0) - (left.product.rating ?? 0) ||
        left.product.name.localeCompare(right.product.name, "es"),
    )

  const bestScore = rankedResults[0]?.score ?? 0
  const relevanceFloor =
    bestScore >= 400
      ? Math.max(260, Math.floor(bestScore * 0.5))
      : bestScore >= 300
        ? Math.max(100, Math.floor(bestScore * 0.5))
        : 0

  return rankedResults
    .filter((result) => result.score >= relevanceFloor)
    .slice(0, limit)
}
