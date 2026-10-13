import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { AddressRepository } from '../../domain/repositories/AddressRepository';
import { AddressesContext } from '../context/AddressesContext';
import { AddressesController } from './AddressesController';

export function useAddressesController(repository: AddressRepository) {
  const controller = useMemo(() => new AddressesController(repository), [repository]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => {
    void controller.start();
    return () => controller.stop();
  }, [controller]);
  useEffect(() => {
    if (!snapshot.feedback) return;
    const timer = setTimeout(snapshot.clearFeedback, 3200);
    return () => clearTimeout(timer);
  }, [snapshot.feedback, snapshot.clearFeedback]);
  return snapshot;
}

export function useAddressesViewModel() {
  const value = useContext(AddressesContext);
  if (!value) throw new Error('useAddressesViewModel debe usarse dentro de AddressesProvider.');
  return value;
}
