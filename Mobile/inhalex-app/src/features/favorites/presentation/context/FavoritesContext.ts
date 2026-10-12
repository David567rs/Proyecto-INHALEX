import { createContext } from 'react';
import type { FavoritesViewModel } from '../viewModels/FavoritesController';

export const FavoritesContext = createContext<FavoritesViewModel | null>(null);
