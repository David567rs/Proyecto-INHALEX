import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { CartRepository } from '../../domain/repositories/CartRepository';
import { CartContext } from '../context/CartContext';
import { CartController } from './CartController';

export function useCartController(repository: CartRepository) {
  const controller = useMemo(() => new CartController(repository), [repository]);
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

export function useCartViewModel() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCartViewModel debe usarse dentro de CartProvider.');
  return value;
}
