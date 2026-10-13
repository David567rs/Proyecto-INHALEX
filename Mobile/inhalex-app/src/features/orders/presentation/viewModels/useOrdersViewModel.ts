import { useContext } from 'react';
import { OrdersContext } from '../context/OrdersContext';

export function useOrdersViewModel() {
  const value = useContext(OrdersContext);
  if (!value) throw new Error('useOrdersViewModel requiere OrdersProvider.');
  return value;
}
