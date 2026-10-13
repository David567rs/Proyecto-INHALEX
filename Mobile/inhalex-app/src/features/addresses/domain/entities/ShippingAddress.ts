export const MAX_ADDRESSES = 5;

export interface AddressInput {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood: string;
  municipality: string;
  state: string;
  postalCode: string;
  references?: string;
  isDefault: boolean;
}

export interface ShippingAddress extends AddressInput {
  id: string;
}

export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

export function emptyAddressInput(): AddressInput {
  return {
    label: '', recipientName: '', phone: '', street: '', exteriorNumber: '',
    interiorNumber: '', neighborhood: '', municipality: '', state: '',
    postalCode: '', references: '', isDefault: false,
  };
}

const textRules = {
  label: { min: 2, max: 40, label: 'el nombre de la dirección' },
  recipientName: { min: 2, max: 120, label: 'el nombre de quien recibe' },
  street: { min: 2, max: 120, label: 'la calle' },
  exteriorNumber: { min: 1, max: 20, label: 'el número exterior' },
  interiorNumber: { min: 0, max: 20, label: 'el número interior' },
  neighborhood: { min: 2, max: 100, label: 'la colonia' },
  municipality: { min: 2, max: 100, label: 'el municipio o la alcaldía' },
  state: { min: 2, max: 100, label: 'el estado' },
  references: { min: 0, max: 300, label: 'las referencias' },
} as const;

/** Match the existing address DTO; postal codes remain strings to retain leading zeroes. */
export function validateAddressInput(input: AddressInput): {
  value: AddressInput;
  errors: AddressErrors;
  isValid: boolean;
} {
  const source = input && typeof input === 'object' ? input : emptyAddressInput();
  const value = emptyAddressInput();
  const errors: AddressErrors = {};
  for (const field of Object.keys(textRules) as (keyof typeof textRules)[]) {
    const rule = textRules[field];
    const supplied = source[field];
    const text = typeof supplied === 'string' ? supplied.trim() : '';
    value[field] = text;
    if ((supplied !== undefined && typeof supplied !== 'string') || text.length < rule.min) {
      errors[field] = `Completa ${rule.label}${rule.min > 1 ? ` con al menos ${rule.min} caracteres` : ''}.`;
    } else if (text.length > rule.max) {
      errors[field] = `Usa hasta ${rule.max} caracteres para ${rule.label}.`;
    }
  }
  value.phone = typeof source.phone === 'string' ? source.phone.trim() : '';
  if (!/^\d{10,15}$/.test(value.phone)) {
    errors.phone = 'Ingresa un teléfono de 10 a 15 dígitos, sin espacios ni signos.';
  }
  value.postalCode = typeof source.postalCode === 'string' ? source.postalCode.trim() : '';
  if (!/^\d{5}$/.test(value.postalCode)) {
    errors.postalCode = 'Ingresa un código postal de 5 dígitos.';
  }
  value.isDefault = source.isDefault === true;
  if (source.isDefault !== undefined && typeof source.isDefault !== 'boolean') {
    errors.isDefault = 'Selecciona si será tu dirección principal.';
  }
  return { value, errors, isValid: Object.keys(errors).length === 0 };
}
