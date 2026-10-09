import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { CatalogRepository } from '../../domain/repositories/CatalogRepository';
import { CatalogContext } from '../context/CatalogContext';
import { CatalogController, type CatalogViewModel } from './CatalogController';

export type { CatalogStatus, CatalogViewModel } from './CatalogController';

/** React connects the injected controller's lifecycle and immutable snapshots to the view. */
export function useCatalogController(repository: CatalogRepository): CatalogViewModel {
  const controller = useMemo(() => new CatalogController(repository), [repository]);
  const snapshot = useSyncExternalStore(
    controller.subscribe, controller.getSnapshot, controller.getSnapshot,
  );

  useEffect(() => {
    void controller.start();
    return () => controller.stop();
  }, [controller]);

  return snapshot;
}

export function useCatalogViewModel(): CatalogViewModel {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalogViewModel debe usarse dentro de CatalogProvider.');
  return context;
}
