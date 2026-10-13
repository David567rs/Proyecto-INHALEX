import { emptyAddressInput, validateAddressInput, type AddressInput, type ShippingAddress } from '../../domain/entities/ShippingAddress';
import type { AddressRepository } from '../../domain/repositories/AddressRepository';
import type { AddressApi } from '../adapters/AddressApiAdapter';
import { mapAddresses } from '../mappers/addressMapper';

const inputFields = Object.keys(emptyAddressInput()) as (keyof AddressInput)[];
const unconfirmed = () => new Error('No se pudo confirmar el cambio en tus direcciones. Actualiza antes de intentar de nuevo.');

export class HttpAddressRepository implements AddressRepository {
  constructor(private readonly api: AddressApi) {}

  async list(isCurrent?: () => boolean): Promise<ShippingAddress[]> {
    return mapAddresses(await this.api.list(isCurrent));
  }

  async create(input: AddressInput, isCurrent?: () => boolean): Promise<ShippingAddress[]> {
    const result = validateAddressInput(input);
    if (!result.isValid) throw new Error(Object.values(result.errors)[0]);
    const addresses = mapAddresses(await this.api.create(result.value, isCurrent));
    if (!addresses.some((address) => this.matches(address, result.value, false))) throw unconfirmed();
    return addresses;
  }

  async update(id: string, input: Partial<AddressInput>, isCurrent?: () => boolean): Promise<ShippingAddress[]> {
    this.validateId(id);
    if (!input || typeof input !== 'object') throw new Error('Modifica al menos un campo de la dirección.');
    const fields = inputFields.filter((field) => Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined);
    if (!fields.length) throw new Error('Modifica al menos un campo de la dirección.');
    const result = validateAddressInput({ ...emptyAddressInput(), ...input });
    const updates: Record<string, unknown> = {};
    for (const field of fields) {
      if (result.errors[field]) throw new Error(result.errors[field]);
      updates[field] = result.value[field];
    }
    const addresses = mapAddresses(await this.api.update(id, updates, isCurrent));
    const changed = addresses.find((address) => address.id === id);
    if (!changed || !this.matches(changed, updates, true)) throw unconfirmed();
    return addresses;
  }

  async remove(id: string, isCurrent?: () => boolean): Promise<ShippingAddress[]> {
    this.validateId(id);
    const addresses = mapAddresses(await this.api.remove(id, isCurrent));
    if (addresses.some((address) => address.id === id)) throw unconfirmed();
    return addresses;
  }

  private validateId(id: string): void {
    if (typeof id !== 'string' || !id.trim() || id !== id.trim()) {
      throw new Error('No se pudo identificar la dirección. Intenta de nuevo.');
    }
  }

  private matches(address: ShippingAddress, input: Partial<AddressInput>, checkFalseDefault: boolean): boolean {
    return inputFields.every((field) => {
      if (!Object.prototype.hasOwnProperty.call(input, field)) return true;
      if (field === 'isDefault') return input.isDefault || checkFalseDefault ? address.isDefault === input.isDefault : true;
      return (address[field] ?? '') === (input[field] ?? '');
    });
  }
}
