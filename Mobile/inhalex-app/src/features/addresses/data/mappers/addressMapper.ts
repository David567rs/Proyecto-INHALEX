import { MAX_ADDRESSES, validateAddressInput, type AddressInput, type ShippingAddress } from '../../domain/entities/ShippingAddress';

const invalidAddresses = () => new Error('No se pudo confirmar la información de tus direcciones. Actualiza e intenta de nuevo.');

/** Validate every row so an unreadable response never appears as an empty address book. */
export function mapAddresses(response: unknown): ShippingAddress[] {
  if (!Array.isArray(response) || response.length > MAX_ADDRESSES) throw invalidAddresses();
  const ids = new Set<string>();
  let defaults = 0;
  return response.map((candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object') throw invalidAddresses();
    const source = candidate as Record<string, unknown>;
    if (
      typeof source.id !== 'string' || !source.id.trim() || source.id !== source.id.trim() ||
      ids.has(source.id) || typeof source.isDefault !== 'boolean'
    ) throw invalidAddresses();
    const result = validateAddressInput(source as unknown as AddressInput);
    if (!result.isValid) throw invalidAddresses();
    ids.add(source.id);
    if (result.value.isDefault && ++defaults > 1) throw invalidAddresses();
    return {
      id: source.id,
      ...result.value,
      interiorNumber: result.value.interiorNumber || undefined,
      references: result.value.references || undefined,
    };
  });
}
