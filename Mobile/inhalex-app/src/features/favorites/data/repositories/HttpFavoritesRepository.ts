import type { CatalogProduct } from '../../../catalog/domain/entities/CatalogProduct';
import { mapCatalogProduct } from '../../../catalog/data/mappers/catalogMapper';
import type { FavoritesOperation, FavoritesRepository } from '../../domain/repositories/FavoritesRepository';
import type { FavoriteMutationDto, FavoritesApi } from '../adapters/FavoritesApiAdapter';

/** Favorites share the catalog product mapping and its current price/image rules. */
export class HttpFavoritesRepository implements FavoritesRepository {
  constructor(
    private readonly api: FavoritesApi,
    private readonly assetBaseUrl?: string,
  ) {}

  async list(operation?: FavoritesOperation): Promise<CatalogProduct[]> {
    const response = await this.api.list(operation);
    if (!Array.isArray(response)) {
      throw new Error('No se pudieron leer tus favoritos. Intenta de nuevo.');
    }
    const products = response.map((dto) => mapCatalogProduct(dto, this.assetBaseUrl));
    const seen = new Set<string>();
    return products.filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });
  }

  async add(productId: string, operation?: FavoritesOperation): Promise<void> {
    this.validateProductId(productId);
    this.validateMutation(await this.api.add(productId, operation), productId);
  }

  async remove(productId: string, operation?: FavoritesOperation): Promise<void> {
    this.validateProductId(productId);
    this.validateMutation(await this.api.remove(productId, operation), productId);
  }

  private validateProductId(productId: string): void {
    if (typeof productId !== 'string' || !productId.trim()) {
      throw new Error('No se pudo identificar el producto. Intenta de nuevo.');
    }
  }

  private validateMutation(response: FavoriteMutationDto, productId: string): void {
    if (!response || response.productId !== productId) {
      throw new Error('No se pudo confirmar el cambio en favoritos. Intenta de nuevo.');
    }
  }
}
