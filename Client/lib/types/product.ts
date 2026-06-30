export interface Product {
  id: string
  slug?: string
  name: string
  description: string
  longDescription?: string
  price: number
  promoActive?: boolean
  promoLabel?: string
  promoDescription?: string
  promoPrice?: number
  promoEndsAt?: string
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

export interface CartItem extends Product {
  quantity: number
}
