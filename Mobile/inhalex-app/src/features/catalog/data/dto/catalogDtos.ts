/** Public NestJS /products DTO; independent of the presentation model. */
export interface ProductDto {
  _id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  price: number;
  promoActive?: boolean;
  promoLabel?: string;
  promoDescription?: string;
  promoPrice?: number;
  promoEndsAt?: string;
  currency: string;
  image: string;
  category: string;
  benefits?: string[];
  aromas?: string[];
  presentation: string;
  origin: string;
  inStock: boolean;
  stockAvailable?: number;
  allowBackorder?: boolean;
  rating?: number;
  reviews?: number;
}

export interface ProductsPageDto {
  items: ProductDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductCategoryDto {
  id: string;
  name: string;
  count: number;
}
