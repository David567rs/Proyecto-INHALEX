import type { PropsWithChildren } from 'react';
import { cartRepository } from '../../data/cartDependencies';
import type { CartRepository } from '../../domain/repositories/CartRepository';
import { useCartController } from '../viewModels/useCartViewModel';
import { CartContext } from './CartContext';

/** Mounted inside the tab layout keyed by the authenticated user. */
export function CartProvider({ children, repository = cartRepository }: PropsWithChildren<{ repository?: CartRepository }>) {
  const value = useCartController(repository);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
