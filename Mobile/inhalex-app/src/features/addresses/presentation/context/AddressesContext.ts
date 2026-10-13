import { createContext } from 'react';
import type { AddressViewModel } from '../viewModels/AddressesController';

export const AddressesContext = createContext<AddressViewModel | null>(null);
