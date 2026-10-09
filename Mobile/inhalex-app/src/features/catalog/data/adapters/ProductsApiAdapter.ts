import type { CatalogQuery } from '../../domain/repositories/CatalogRepository';
import type { ProductCategoryDto, ProductDto, ProductsPageDto } from '../dto/catalogDtos';

/** Structural port allows HttpClient or a deterministic test transport to be injected. */
export interface CatalogHttpTransport {
  request<T>(path: string): Promise<T>;
}

export interface ProductsApi {
  listProducts(query?: CatalogQuery): Promise<ProductsPageDto>;
  listCategories(): Promise<ProductCategoryDto[]>;
  findProduct(idOrSlug: string): Promise<ProductDto>;
}

/** Adapter translates domain queries into the existing public NestJS API. */
export class ProductsApiAdapter implements ProductsApi {
  constructor(private readonly httpClient: CatalogHttpTransport) {}

  listProducts(query: CatalogQuery = {}): Promise<ProductsPageDto> {
    const params = new URLSearchParams({
      page: String(Math.max(1, Math.trunc(query.page ?? 1))),
      limit: String(Math.min(100, Math.max(1, Math.trunc(query.limit ?? 100)))),
    });

    const search = query.search?.trim();
    if (search) {
      // The API uses a Mongo regular expression: typing punctuation must stay literal.
      params.set('search', search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    if (query.categoryId && query.categoryId !== 'all') {
      params.set('category', query.categoryId);
    }

    return this.httpClient.request<ProductsPageDto>(`/products?${params.toString()}`);
  }

  listCategories(): Promise<ProductCategoryDto[]> {
    return this.httpClient.request<ProductCategoryDto[]>('/products/categories');
  }

  findProduct(idOrSlug: string): Promise<ProductDto> {
    return this.httpClient.request<ProductDto>(`/products/${encodeURIComponent(idOrSlug)}`);
  }
}
