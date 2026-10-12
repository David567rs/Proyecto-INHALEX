import type { CatalogProduct } from '../../../catalog/domain/entities/CatalogProduct';

export interface FavoritesOperation {
  /** A session/controller generation can expire while native token storage is reading. */
  isCurrent?: () => boolean;
}

export interface FavoritesRepository {
  list(operation?: FavoritesOperation): Promise<CatalogProduct[]>;
  add(productId: string, operation?: FavoritesOperation): Promise<void>;
  remove(productId: string, operation?: FavoritesOperation): Promise<void>;
}
