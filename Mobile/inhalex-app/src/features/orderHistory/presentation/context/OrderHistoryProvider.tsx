import { useMemo, type PropsWithChildren } from 'react';
import { createOrderHistoryRepository } from '../../data/orderHistoryDependencies';
import type { OrderHistoryRepository } from '../../domain/repositories/OrderHistoryRepository';
import { useOrderHistoryController } from '../viewModels/useOrderHistoryViewModel';
import { OrderHistoryContext } from './OrderHistoryContext';

export function OrderHistoryProvider({ children, repository }: PropsWithChildren<{ repository?: OrderHistoryRepository }>) {
  const resolved = useMemo(() => repository ?? createOrderHistoryRepository(), [repository]);
  const value = useOrderHistoryController(resolved);
  return <OrderHistoryContext.Provider value={value}>{children}</OrderHistoryContext.Provider>;
}
