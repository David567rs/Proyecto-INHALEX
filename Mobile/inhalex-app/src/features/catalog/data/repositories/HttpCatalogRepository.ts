import type { CatalogRepository, CatalogQuery } from '../../domain/repositories/CatalogRepository';
import type { CatalogCategory, CatalogPage, CatalogProduct } from '../../domain/entities/CatalogProduct';
import type { ProductsApi } from '../adapters/ProductsApiAdapter';
import { mapCatalogCategory, mapCatalogProduct } from '../mappers/catalogMapper';

/** Repository isolates DTOs, transport details and asset origins from presentation. */
export class HttpCatalogRepository implements CatalogRepository {
  constructor(
    private readonly api: ProductsApi,
    private readonly assetBaseUrl?: string,
  ) {}

  async listProducts(query?: CatalogQuery): Promise<CatalogPage> {
    const response = await this.api.listProducts(query);
    if (!response || !Array.isArray(response.items)) {
      throw new Error('No fue posible leer el catálogo de INHALEX. Intenta de nuevo.');
    }
    return {
      products: response.items.map((dto) => mapCatalogProduct(dto, this.assetBaseUrl)),
      total: response.total,
      page: response.page,
      totalPages: response.totalPages,
    };
  }

  async listCategories(): Promise<CatalogCategory[]> {
    const response = await this.api.listCategories();
    if (!Array.isArray(response)) {
      throw new Error('No fue posible leer las colecciones de INHALEX.');
    }
    return response.map(mapCatalogCategory);
  }

  async findProduct(idOrSlug: string): Promise<CatalogProduct> {
    return mapCatalogProduct(await this.api.findProduct(idOrSlug), this.assetBaseUrl);
  }
}
