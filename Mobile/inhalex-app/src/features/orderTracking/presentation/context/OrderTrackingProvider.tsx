import { useMemo, type PropsWithChildren } from 'react';
import { createOrderTrackingRepository } from '../../data/orderTrackingDependencies';
import type { OrderTrackingRepository } from '../../domain/repositories/OrderTrackingRepository';
import { useOrderTrackingController } from '../viewModels/useOrderTrackingViewModel';
import { OrderTrackingContext } from './OrderTrackingContext';

export function OrderTrackingProvider({ children, repository }: PropsWithChildren<{ repository?: OrderTrackingRepository }>) {
  const resolved = useMemo(() => repository ?? createOrderTrackingRepository(), [repository]);
  const value = useOrderTrackingController(resolved);
  return <OrderTrackingContext.Provider value={value}>{children}</OrderTrackingContext.Provider>;
}
