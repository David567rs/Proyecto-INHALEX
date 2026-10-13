import { useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from 'react';
import { randomUUID } from 'expo-crypto';
import { useAuthSession } from '@/features/auth/presentation/context/AuthSessionContext';
import { useCartViewModel } from '@/features/cart/presentation/viewModels/useCartViewModel';
import { orderRepository } from '../../data/orderDependencies';
import { createOrderAttemptStore } from '../../data/storage/orderAttemptStore';
import { OrdersController } from '../viewModels/OrdersController';
import { OrdersContext } from './OrdersContext';

/** Lives above the routes: navigating away never discards an in-flight confirmation. */
export function OrdersProvider({ children }: PropsWithChildren) {
  const { user } = useAuthSession();
  const { beginCheckout, resumeCheckout, clearAfterOrder, endCheckout } = useCartViewModel();
  const controller = useMemo(() => new OrdersController(orderRepository, {
    beginCheckout, resumeCheckout, clearAfterOrder, endCheckout,
  }, {
    contact: { customerName: user?.name ?? '', customerEmail: user?.email ?? '', customerPhone: user?.phone ?? '' },
    createKey: randomUUID,
    store: createOrderAttemptStore(user?.id ?? 'signed-out'),
  }), [beginCheckout, resumeCheckout, clearAfterOrder, endCheckout, user?.id, user?.name, user?.email, user?.phone]);
  const value = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { void controller.start(); return () => controller.stop(); }, [controller]);
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}
