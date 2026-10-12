import { createContext } from 'react';
import type { CartViewModel } from '../viewModels/CartController';

export const CartContext = createContext<CartViewModel | null>(null);
