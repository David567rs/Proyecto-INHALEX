import { PublicProductDto } from '../dto/public-product.dto';
import { ProductDocument } from '../schemas/product.schema';

/** Explicit allowlist: adding a schema field must never expose it by default. */
export function toPublicProduct(product: ProductDocument): PublicProductDto {
  return {
    _id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description,
    longDescription: product.longDescription,
    price: product.price,
    promoActive: product.promoActive,
    promoLabel: product.promoLabel,
    promoDescription: product.promoDescription,
    promoPrice: product.promoPrice,
    promoEndsAt: product.promoEndsAt?.toISOString(),
    currency: product.currency,
    image: product.image,
    category: product.category,
    benefits: [...(product.benefits ?? [])],
    aromas: [...(product.aromas ?? [])],
    presentation: product.presentation,
    origin: product.origin,
    inStock: product.inStock,
    stockAvailable: product.stockAvailable,
    allowBackorder: product.allowBackorder,
    rating: product.rating,
    reviews: product.reviews,
    sortOrder: product.sortOrder,
  };
}
