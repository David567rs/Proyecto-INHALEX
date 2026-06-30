import { apiRequest } from "@/lib/api/client"
import {
  mapApiProduct,
  type ProductApiItem,
} from "@/lib/products/products-api"
import type { Product } from "@/lib/types/product"

interface FavoriteMutationResponse {
  productId: string
}

export async function listFavoriteProducts(token: string): Promise<Product[]> {
  const products = await apiRequest<ProductApiItem[]>("/favorites", {
    method: "GET",
    token,
  })

  return products.map(mapApiProduct)
}

export function addFavoriteProduct(
  productId: string,
  token: string,
): Promise<FavoriteMutationResponse> {
  return apiRequest<FavoriteMutationResponse>(`/favorites/${productId}`, {
    method: "PUT",
    token,
  })
}

export function removeFavoriteProduct(
  productId: string,
  token: string,
): Promise<FavoriteMutationResponse> {
  return apiRequest<FavoriteMutationResponse>(`/favorites/${productId}`, {
    method: "DELETE",
    token,
  })
}
