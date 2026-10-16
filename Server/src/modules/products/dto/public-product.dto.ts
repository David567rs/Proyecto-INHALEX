/** Only fields intended for the public catalog and offline product snapshots. */
export interface PublicProductDto {
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
  benefits: string[];
  aromas: string[];
  presentation: string;
  origin: string;
  inStock: boolean;
  stockAvailable?: number;
  allowBackorder?: boolean;
  rating?: number;
  reviews?: number;
  sortOrder?: number;
}
