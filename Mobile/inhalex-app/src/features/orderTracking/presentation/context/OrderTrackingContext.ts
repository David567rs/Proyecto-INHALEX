import { createContext } from 'react';
import type { OrderTrackingViewModel } from '../viewModels/OrderTrackingController';

export const OrderTrackingContext = createContext<OrderTrackingViewModel | null>(null);
