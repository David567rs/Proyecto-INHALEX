import { apiRequest } from "@/lib/api/client"
import { mapApiProduct, type ProductApiItem } from "@/lib/products/products-api"
import { getProductDisplayPrice } from "@/lib/products/promotions"
import type { CartItem } from "@/lib/types/product"

interface CartApiItem {
  productId: string
  quantity: number
  subtotal: number
  product: ProductApiItem
}

interface CartApiResponse {
  items: CartApiItem[]
  totalItems: number
  subtotal: number
  currency: string
}

function mapCartApiItem(item: CartApiItem): CartItem {
  const product = mapApiProduct(item.product)

  return {
    ...product,
    price: getProductDisplayPrice(product),
    quantity: Math.max(1, Math.min(25, Math.floor(item.quantity))),
  }
}

export async function listRemoteCart(token: string): Promise<CartItem[]> {
  const response = await apiRequest<CartApiResponse>("/cart", {
    method: "GET",
    token,
  })

  return response.items.map(mapCartApiItem)
}

export async function addRemoteCartItem(
  token: string,
  productId: string,
  quantity: number,
): Promise<CartItem[]> {
  const response = await apiRequest<CartApiResponse>("/cart", {
    method: "POST",
    token,
    body: {
      productId,
      quantity,
    },
  })

  return response.items.map(mapCartApiItem)
}

export async function replaceRemoteCart(
  token: string,
  items: Array<{ productId: string; quantity: number }>,
): Promise<CartItem[]> {
  const response = await apiRequest<CartApiResponse>("/cart", {
    method: "PUT",
    token,
    body: {
      items,
    },
  })

  return response.items.map(mapCartApiItem)
}

export async function updateRemoteCartItem(
  token: string,
  productId: string,
  quantity: number,
): Promise<CartItem[]> {
  const response = await apiRequest<CartApiResponse>(`/cart/${productId}`, {
    method: "PATCH",
    token,
    body: {
      quantity,
    },
  })

  return response.items.map(mapCartApiItem)
}

export async function removeRemoteCartItem(
  token: string,
  productId: string,
): Promise<CartItem[]> {
  const response = await apiRequest<CartApiResponse>(`/cart/${productId}`, {
    method: "DELETE",
    token,
  })

  return response.items.map(mapCartApiItem)
}

export async function clearRemoteCart(token: string): Promise<CartItem[]> {
  const response = await apiRequest<CartApiResponse>("/cart", {
    method: "DELETE",
    token,
  })

  return response.items.map(mapCartApiItem)
}
