import { createContext } from 'react';
import type { CatalogViewModel } from '../viewModels/useCatalogViewModel';

export const CatalogContext = createContext<CatalogViewModel | null>(null);
