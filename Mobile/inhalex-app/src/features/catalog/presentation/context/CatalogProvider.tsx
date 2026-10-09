import type { PropsWithChildren } from 'react';
import { catalogRepository } from '../../data/catalogDependencies';
import type { CatalogRepository } from '../../domain/repositories/CatalogRepository';
import { useCatalogController } from '../viewModels/useCatalogViewModel';
import { CatalogContext } from './CatalogContext';

interface CatalogProviderProps extends PropsWithChildren {
  repository?: CatalogRepository;
}

/** Inject a repository once and share catalog/filter state across the Android tabs. */
export function CatalogProvider({ children, repository = catalogRepository }: CatalogProviderProps) {
  const value = useCatalogController(repository);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
