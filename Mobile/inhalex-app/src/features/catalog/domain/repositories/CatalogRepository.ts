import type { CatalogCategory, CatalogPage, CatalogProduct } from '../entities/CatalogProduct';

export interface CatalogQuery {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

/** Presentation depends on this contract, never on HTTP or API DTOs. */
export interface CatalogRepository {
  listProducts(query?: CatalogQuery): Promise<CatalogPage>;
  listCategories(): Promise<CatalogCategory[]>;
  findProduct(idOrSlug: string): Promise<CatalogProduct>;
}
