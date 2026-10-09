import { getDisplayError } from '@/core/network/ApiError';
import type { CatalogCategory, CatalogProduct } from '../../domain/entities/CatalogProduct';
import type { CatalogQuery, CatalogRepository } from '../../domain/repositories/CatalogRepository';

export type CatalogStatus = 'loading' | 'ready' | 'error' | 'empty';

export interface CatalogViewModel {
  products: CatalogProduct[];
  featuredProducts: CatalogProduct[];
  categories: CatalogCategory[];
  total: number;
  status: CatalogStatus;
  errorMessage: string | null;
  categoriesErrorMessage: string | null;
  categoriesLoading: boolean;
  refreshing: boolean;
  searchQuery: string;
  selectedCategoryId: string;
  selectedProduct: CatalogProduct | null;
  detailLoading: boolean;
  detailError: string | null;
  setSearchQuery(query: string): void;
  selectCategory(categoryId: string): void;
  resetFilters(): void;
  refresh(): Promise<void>;
  retry(): Promise<void>;
  openProduct(product: CatalogProduct): Promise<void>;
  retryDetail(): Promise<void>;
  closeProduct(): void;
}

type CatalogState = Pick<CatalogViewModel,
  | 'products' | 'total' | 'status' | 'errorMessage' | 'categoriesErrorMessage'
  | 'categoriesLoading' | 'refreshing' | 'searchQuery' | 'selectedCategoryId'
  | 'selectedProduct' | 'detailLoading' | 'detailError'
>;

/** MVVM controller: owns requests and exposes stable snapshots independently of React. */
export class CatalogController {
  private active = false;
  private startPromise: Promise<void> | null = null;
  private readonly listeners = new Set<() => void>();
  private productsRequest = 0;
  private categoriesRequest = 0;
  private detailRequest = 0;
  private refreshRequest = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private debouncedSearch = '';
  private loadedQuery: string | null = null;
  private categoryItems: CatalogCategory[] = [];
  private state: CatalogState = {
    products: [], total: 0, status: 'loading', errorMessage: null,
    categoriesErrorMessage: null, categoriesLoading: false, refreshing: false,
    searchQuery: '', selectedCategoryId: 'all', selectedProduct: null,
    detailLoading: false, detailError: null,
  };
  private snapshot: CatalogViewModel;

  constructor(private readonly repository: CatalogRepository) {
    this.snapshot = this.makeSnapshot();
  }

  getSnapshot = (): CatalogViewModel => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  start = (): Promise<void> => {
    if (this.active) return this.startPromise ?? Promise.resolve();
    this.active = true;
    this.clearSearchTimer();
    this.debouncedSearch = this.state.searchQuery.trim();
    const preserveProducts = this.loadedQuery === this.queryKey();
    if (!preserveProducts) this.loadedQuery = null;
    this.update({
      ...(preserveProducts ? { status: this.productStatus() } : { products: [], total: 0, status: 'loading' }),
      errorMessage: null, refreshing: false, detailLoading: false,
    });
    this.startPromise = Promise.all([
      this.loadProducts(preserveProducts), this.loadCategories(),
    ]).then(() => undefined);
    return this.startPromise;
  };

  stop = (): void => {
    this.active = false;
    this.startPromise = null;
    this.clearSearchTimer();
    // Requests can finish, but a stopped/restarted controller must never accept them.
    this.productsRequest += 1;
    this.categoriesRequest += 1;
    this.detailRequest += 1;
    this.refreshRequest += 1;
  };

  setSearchQuery = (searchQuery: string): void => {
    if (!this.active || searchQuery === this.state.searchQuery) return;
    if (searchQuery.trim() === this.state.searchQuery.trim()) {
      this.update({ searchQuery });
      return;
    }
    this.clearSearchTimer();
    this.productsRequest += 1;
    this.refreshRequest += 1;
    this.update({ searchQuery, refreshing: false, errorMessage: null });
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      if (!this.active) return;
      this.debouncedSearch = this.state.searchQuery.trim();
      this.beginFilterQuery();
      void this.loadProducts(false);
    }, 280);
  };

  selectCategory = (categoryId: string): void => {
    const selectedCategoryId = categoryId || 'all';
    if (!this.active || selectedCategoryId === this.state.selectedCategoryId) return;
    this.clearSearchTimer();
    this.debouncedSearch = this.state.searchQuery.trim();
    this.refreshRequest += 1;
    this.productsRequest += 1;
    this.beginFilterQuery({ selectedCategoryId });
    void this.loadProducts(false);
  };

  resetFilters = (): void => {
    if (!this.active) return;
    this.clearSearchTimer();
    this.debouncedSearch = '';
    this.refreshRequest += 1;
    this.productsRequest += 1;
    // Publish both filters together: the view never observes an intermediate query.
    this.beginFilterQuery({ searchQuery: '', selectedCategoryId: 'all' });
    void this.loadProducts(false);
  };

  refresh = (): Promise<void> => this.reload(true);

  retry = (): Promise<void> => this.reload(false);

  openProduct = async (product: CatalogProduct): Promise<void> => {
    if (!this.active) return;
    const request = ++this.detailRequest;
    this.update({ selectedProduct: product, detailLoading: true, detailError: null });
    try {
      const detail = await this.repository.findProduct(product.slug || product.id);
      if (this.active && request === this.detailRequest) this.update({ selectedProduct: detail });
    } catch (error) {
      if (this.active && request === this.detailRequest) {
        this.update({ detailError: getDisplayError(error, 'No fue posible actualizar este aroma.') });
      }
    } finally {
      if (this.active && request === this.detailRequest) this.update({ detailLoading: false });
    }
  };

  retryDetail = (): Promise<void> => {
    return this.state.selectedProduct ? this.openProduct(this.state.selectedProduct) : Promise.resolve();
  };

  closeProduct = (): void => {
    this.detailRequest += 1;
    if (!this.active) return;
    this.update({ selectedProduct: null, detailLoading: false, detailError: null });
  };

  private makeSnapshot(): CatalogViewModel {
    return {
      ...this.state,
      featuredProducts: this.state.products.slice(0, 6),
      categories: [{
        id: 'all', name: 'Todos',
        count: this.categoryItems.length
          ? this.categoryItems.reduce((count, category) => count + category.count, 0)
          : this.state.total,
      }, ...this.categoryItems],
      setSearchQuery: this.setSearchQuery,
      selectCategory: this.selectCategory,
      resetFilters: this.resetFilters,
      refresh: this.refresh,
      retry: this.retry,
      openProduct: this.openProduct,
      retryDetail: this.retryDetail,
      closeProduct: this.closeProduct,
    };
  }

  private update(changes: Partial<CatalogState>): void {
    this.state = { ...this.state, ...changes };
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = null;
  }

  private queryKey(): string {
    return JSON.stringify([this.debouncedSearch, this.state.selectedCategoryId]);
  }

  private productStatus(): 'ready' | 'empty' {
    return this.state.products.length ? 'ready' : 'empty';
  }

  private beginFilterQuery(changes: Partial<CatalogState> = {}): void {
    this.loadedQuery = null;
    this.update({
      products: [], total: 0, status: 'loading', errorMessage: null,
      refreshing: false, ...changes,
    });
  }

  private async reload(refreshing: boolean): Promise<void> {
    if (!this.active) return;
    this.clearSearchTimer();
    this.debouncedSearch = this.state.searchQuery.trim();
    const request = ++this.refreshRequest;
    const preserveProducts = this.loadedQuery === this.queryKey();
    if (!preserveProducts) this.loadedQuery = null;
    this.update({
      ...(preserveProducts ? { status: this.productStatus() } : { products: [], total: 0, status: 'loading' }),
      refreshing, errorMessage: null,
    });
    try {
      await Promise.all([this.loadProducts(preserveProducts), this.loadCategories()]);
    } finally {
      // A slower earlier refresh cannot hide the indicator for a newer one.
      if (this.active && request === this.refreshRequest) this.update({ refreshing: false });
    }
  }

  private async loadProducts(preserveProducts: boolean): Promise<void> {
    const request = ++this.productsRequest;
    const queryKey = this.queryKey();
    const query: CatalogQuery = {
      search: this.debouncedSearch, categoryId: this.state.selectedCategoryId, page: 1, limit: 100,
    };
    try {
      const page = await this.repository.listProducts(query);
      if (!this.active || request !== this.productsRequest) return;
      this.loadedQuery = queryKey;
      this.update({
        products: page.products, total: page.total, errorMessage: null,
        status: page.products.length ? 'ready' : 'empty',
      });
    } catch (error) {
      if (!this.active || request !== this.productsRequest) return;
      const keepProducts = preserveProducts && this.loadedQuery === queryKey && this.state.products.length > 0;
      if (!keepProducts) this.loadedQuery = null;
      this.update({
        errorMessage: getDisplayError(error, 'No fue posible cargar los aromas. Intenta de nuevo.'),
        status: keepProducts ? 'ready' : 'error',
      });
    }
  }

  private async loadCategories(): Promise<void> {
    const request = ++this.categoriesRequest;
    this.update({ categoriesLoading: true, categoriesErrorMessage: null });
    try {
      const categories = await this.repository.listCategories();
      if (!this.active || request !== this.categoriesRequest) return;
      this.categoryItems = categories;
      this.update({ categoriesErrorMessage: null });
    } catch (error) {
      if (!this.active || request !== this.categoriesRequest) return;
      this.update({ categoriesErrorMessage: getDisplayError(error, 'No fue posible cargar las colecciones.') });
    } finally {
      if (this.active && request === this.categoriesRequest) this.update({ categoriesLoading: false });
    }
  }
}
