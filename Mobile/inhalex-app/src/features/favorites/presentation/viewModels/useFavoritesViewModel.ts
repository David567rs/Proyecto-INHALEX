import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { FavoritesRepository } from '../../domain/repositories/FavoritesRepository';
import { FavoritesContext } from '../context/FavoritesContext';
import { FavoritesController } from './FavoritesController';

export function useFavoritesController(repository: FavoritesRepository) {
  const controller = useMemo(() => new FavoritesController(repository), [repository]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    void controller.start();
    return () => controller.stop();
  }, [controller]);

  useEffect(() => {
    if (!snapshot.feedback) return;
    const timer = setTimeout(snapshot.clearFeedback, 2800);
    return () => clearTimeout(timer);
  }, [snapshot.feedback, snapshot.clearFeedback]);

  return snapshot;
}

export function useFavoritesViewModel() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavoritesViewModel debe usarse dentro de FavoritesProvider.');
  return value;
}
