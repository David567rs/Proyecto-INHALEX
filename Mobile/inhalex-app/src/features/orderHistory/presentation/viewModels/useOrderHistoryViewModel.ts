import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { OrderHistoryRepository } from '../../domain/repositories/OrderHistoryRepository';
import { OrderHistoryContext } from '../context/OrderHistoryContext';
import { OrderHistoryController } from './OrderHistoryController';

export function useOrderHistoryController(repository: OrderHistoryRepository) {
  const controller = useMemo(() => new OrderHistoryController(repository), [repository]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { void controller.start(); return () => controller.stop(); }, [controller]);
  return snapshot;
}

export function useOrderHistoryViewModel() {
  const value = useContext(OrderHistoryContext);
  if (!value) throw new Error('El historial necesita OrderHistoryProvider.');
  return value;
}
