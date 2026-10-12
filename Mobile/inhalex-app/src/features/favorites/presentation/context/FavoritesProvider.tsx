import type { PropsWithChildren } from 'react';
import { favoritesRepository } from '../../data/favoritesDependencies';
import type { FavoritesRepository } from '../../domain/repositories/FavoritesRepository';
import { useFavoritesController } from '../viewModels/useFavoritesViewModel';
import { FavoritesContext } from './FavoritesContext';

interface FavoritesProviderProps extends PropsWithChildren {
  repository?: FavoritesRepository;
}

/** The authenticated tab layout keys this provider by user, isolating each session. */
export function FavoritesProvider({ children, repository = favoritesRepository }: FavoritesProviderProps) {
  const value = useFavoritesController(repository);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
