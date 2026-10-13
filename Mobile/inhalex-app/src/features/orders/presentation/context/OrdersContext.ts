import { createContext } from 'react';
import type { OrdersViewModel } from '../viewModels/OrdersController';

export const OrdersContext = createContext<OrdersViewModel | null>(null);
