import type { AddressInput, ShippingAddress } from '../entities/ShippingAddress';

export interface AddressRepository {
  list(isCurrent?: () => boolean): Promise<ShippingAddress[]>;
  create(input: AddressInput, isCurrent?: () => boolean): Promise<ShippingAddress[]>;
  update(id: string, input: Partial<AddressInput>, isCurrent?: () => boolean): Promise<ShippingAddress[]>;
  remove(id: string, isCurrent?: () => boolean): Promise<ShippingAddress[]>;
}
