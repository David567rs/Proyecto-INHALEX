import { HttpClient } from '@/core/network/HttpClient';
import type { CatalogRepository } from '../domain/repositories/CatalogRepository';
import { ProductsApiAdapter, type CatalogHttpTransport } from './adapters/ProductsApiAdapter';
import { HttpCatalogRepository } from './repositories/HttpCatalogRepository';

/** Composition root: swap the repository/HTTP port without changing the ViewModel. */
export function createCatalogRepository(
  httpClient: CatalogHttpTransport = new HttpClient(),
  assetBaseUrl = process.env.EXPO_PUBLIC_ASSET_URL,
): CatalogRepository {
  return new HttpCatalogRepository(new ProductsApiAdapter(httpClient), assetBaseUrl);
}

export const catalogRepository = createCatalogRepository();
