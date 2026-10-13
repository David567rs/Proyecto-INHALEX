import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { OrderTrackingRepository } from '../../domain/repositories/OrderTrackingRepository';
import { OrderTrackingContext } from '../context/OrderTrackingContext';
import { OrderTrackingController } from './OrderTrackingController';

export function useOrderTrackingController(repository: OrderTrackingRepository) {
  const controller = useMemo(() => new OrderTrackingController(repository), [repository]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { void controller.start(); return () => controller.stop(); }, [controller]);
  return snapshot;
}

export function useOrderTrackingViewModel() {
  const value = useContext(OrderTrackingContext);
  if (!value) throw new Error('El seguimiento necesita OrderTrackingProvider.');
  return value;
}
