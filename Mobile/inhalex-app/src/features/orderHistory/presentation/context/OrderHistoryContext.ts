import { createContext } from 'react';
import type { OrderHistoryViewModel } from '../viewModels/OrderHistoryController';

export const OrderHistoryContext = createContext<OrderHistoryViewModel | null>(null);
