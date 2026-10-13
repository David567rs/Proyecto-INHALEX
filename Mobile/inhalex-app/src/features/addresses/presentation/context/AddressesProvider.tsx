import { useMemo, type PropsWithChildren } from 'react';
import { createAddressRepository } from '../../data/addressDependencies';
import type { AddressRepository } from '../../domain/repositories/AddressRepository';
import { useAddressesController } from '../viewModels/useAddressesViewModel';
import { AddressesContext } from './AddressesContext';

/** Mount keyed by the authenticated user so selection and rows cannot cross accounts. */
export function AddressesProvider({ children, repository }: PropsWithChildren<{ repository?: AddressRepository }>) {
  const resolvedRepository = useMemo(() => repository ?? createAddressRepository(), [repository]);
  const value = useAddressesController(resolvedRepository);
  return <AddressesContext.Provider value={value}>{children}</AddressesContext.Provider>;
}
