import { apiRequest } from "@/lib/api/client"
import type { ProductCategoryOption } from "./categories"
import type { Product } from "@/lib/types/product"

export interface ProductApiItem {
  _id: string
  name: string
  slug: string
  description: string
  longDescription?: string
  price: number
  currency: string
  image: string
  category: string
  benefits: string[]
  aromas?: string[]
  presentation: string
  origin: string
  inStock: boolean
  stockAvailable?: number
  stockReserved?: number
  stockMin?: number
  allowBackorder?: boolean
  rating?: number
  reviews?: number
  sortOrder?: number
}

interface ProductsListResponse {
  items: ProductApiItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ProductCategoryApiItem {
  id: string
  name: string
  count: number
}

export function mapApiProduct(product: ProductApiItem): Product {
  return {
    id: product._id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    longDescription: product.longDescription,
    price: product.price,
    currency: product.currency,
    image: product.image,
    category: product.category,
    benefits: product.benefits ?? [],
    aromas: product.aromas ?? [],
    presentation: product.presentation,
    origin: product.origin,
    inStock: product.inStock,
    stockAvailable: product.stockAvailable,
    stockReserved: product.stockReserved,
    stockMin: product.stockMin,
    allowBackorder: product.allowBackorder,
    rating: product.rating,
    reviews: product.reviews,
    sortOrder: product.sortOrder,
  }
}

export async function fetchCatalogProducts(): Promise<Product[]> {
  const response = await apiRequest<ProductsListResponse>("/products?limit=100&page=1")
  return response.items.map(mapApiProduct)
}

export function fetchCatalogCategories(): Promise<ProductCategoryOption[]> {
  return apiRequest<ProductCategoryApiItem[]>("/products/categories")
}

export async function fetchProductBySlug(slugOrId: string): Promise<Product> {
  const response = await apiRequest<ProductApiItem>(`/products/${encodeURIComponent(slugOrId)}`)
  return mapApiProduct(response)
}
