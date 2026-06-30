import { apiRequest } from "@/lib/api/client"

export interface ShippingAddress {
  id: string
  label: string
  recipientName: string
  phone: string
  street: string
  exteriorNumber: string
  interiorNumber?: string
  neighborhood: string
  municipality: string
  state: string
  postalCode: string
  references?: string
  isDefault: boolean
}

export interface ShippingAddressInput {
  label: string
  recipientName: string
  phone: string
  street: string
  exteriorNumber: string
  interiorNumber?: string
  neighborhood: string
  municipality: string
  state: string
  postalCode: string
  references?: string
  isDefault?: boolean
}

export function listShippingAddresses(token: string): Promise<ShippingAddress[]> {
  return apiRequest<ShippingAddress[]>("/addresses", {
    method: "GET",
    token,
  })
}

export function createShippingAddress(
  payload: ShippingAddressInput,
  token: string,
): Promise<ShippingAddress[]> {
  return apiRequest<ShippingAddress[]>("/addresses", {
    method: "POST",
    body: payload,
    token,
  })
}

export function updateShippingAddress(
  addressId: string,
  payload: Partial<ShippingAddressInput>,
  token: string,
): Promise<ShippingAddress[]> {
  return apiRequest<ShippingAddress[]>(`/addresses/${addressId}`, {
    method: "PATCH",
    body: payload,
    token,
  })
}

export function removeShippingAddress(
  addressId: string,
  token: string,
): Promise<ShippingAddress[]> {
  return apiRequest<ShippingAddress[]>(`/addresses/${addressId}`, {
    method: "DELETE",
    token,
  })
}
