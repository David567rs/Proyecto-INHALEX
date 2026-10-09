export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription?: string;
  price: number;
  effectivePrice: number;
  promoActive: boolean;
  promoLabel?: string;
  promoDescription?: string;
  promoPrice?: number;
  promoEndsAt?: string;
  currency: string;
  /** Original API path, also used to resolve bundled INHALEX photography. */
  image: string;
  /** Remote HTTPS image, or null when the API provides a web-relative asset. */
  imageUrl: string | null;
  category: string;
  benefits: string[];
  aromas: string[];
  presentation: string;
  origin: string;
  inStock: boolean;
  stockAvailable?: number;
  allowBackorder: boolean;
  rating?: number;
  reviews?: number;
}

export interface CatalogCategory {
  id: string;
  name: string;
  count: number;
}

export interface CatalogPage {
  products: CatalogProduct[];
  total: number;
  page: number;
  totalPages: number;
}
