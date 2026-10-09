import type { CatalogCategory, CatalogProduct } from '../../domain/entities/CatalogProduct';
import type { ProductCategoryDto, ProductDto } from '../dto/catalogDtos';

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Web-relative images belong to the frontend, never to the API origin. */
export function resolveProductImageUrl(image: string, assetBaseUrl?: string): string | null {
  try {
    if (!image || image.startsWith('//')) return null;
    const url = assetBaseUrl ? new URL(image, `${assetBaseUrl.replace(/\/+$/, '')}/`) : new URL(image);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Mapper normalizes optional API fields and validates values before the view sees them. */
export function mapCatalogProduct(
  dto: ProductDto,
  assetBaseUrl?: string,
  now = Date.now(),
): CatalogProduct {
  const id = optionalText(dto?._id);
  const name = optionalText(dto?.name);
  const price = finiteNumber(dto?.price);
  if (!id || !name || price === undefined || price < 0) {
    throw new Error('INHALEX devolvió un producto con datos incompletos. Intenta de nuevo.');
  }

  const promoPrice = finiteNumber(dto.promoPrice);
  const promoEndsAt = optionalText(dto.promoEndsAt);
  const expiration = promoEndsAt ? Date.parse(promoEndsAt) : undefined;
  const promoActive = Boolean(
    dto.promoActive &&
      promoPrice !== undefined &&
      promoPrice > 0 &&
      promoPrice < price &&
      (expiration === undefined || (Number.isFinite(expiration) && expiration >= now)),
  );
  const image = optionalText(dto.image) ?? '';
  const rating = finiteNumber(dto.rating);
  const reviews = finiteNumber(dto.reviews);
  const currency = optionalText(dto.currency)?.toUpperCase() ?? 'MXN';

  return {
    id,
    slug: optionalText(dto.slug) ?? id,
    name,
    description: optionalText(dto.description) ?? '',
    longDescription: optionalText(dto.longDescription),
    price,
    effectivePrice: promoActive ? promoPrice! : price,
    promoActive,
    promoPrice,
    promoLabel: optionalText(dto.promoLabel),
    promoDescription: optionalText(dto.promoDescription),
    promoEndsAt,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'MXN',
    image,
    imageUrl: resolveProductImageUrl(image, assetBaseUrl),
    category: optionalText(dto.category) ?? '',
    benefits: stringList(dto.benefits),
    aromas: stringList(dto.aromas),
    presentation: optionalText(dto.presentation) ?? '',
    origin: optionalText(dto.origin) ?? '',
    inStock: dto.inStock === true,
    stockAvailable: finiteNumber(dto.stockAvailable),
    allowBackorder: dto.allowBackorder === true,
    rating: rating !== undefined && rating >= 0 && rating <= 5 ? rating : undefined,
    reviews: reviews !== undefined && reviews >= 0 ? Math.trunc(reviews) : undefined,
  };
}

export function mapCatalogCategory(dto: ProductCategoryDto): CatalogCategory {
  const id = optionalText(dto?.id);
  const name = optionalText(dto?.name);
  if (!id || !name) {
    throw new Error('No fue posible leer las colecciones de INHALEX.');
  }
  return { id, name, count: Math.max(0, Math.trunc(finiteNumber(dto.count) ?? 0)) };
}
