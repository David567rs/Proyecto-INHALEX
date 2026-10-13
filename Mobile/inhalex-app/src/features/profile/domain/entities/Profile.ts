import type { AuthUser } from '../../../auth/domain/entities/AuthUser';

export type UserProfile = AuthUser;

export interface ProfileInput {
  firstName: string;
  lastName: string;
  phone: string;
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileInput, string>>;

export function emptyProfileInput(): ProfileInput {
  return { firstName: '', lastName: '', phone: '' };
}

/** Legacy full names cannot be safely split into first name and surnames. */
export function profileInputFromUser(user: UserProfile): ProfileInput {
  return { firstName: user.firstName ?? '', lastName: user.lastName ?? '', phone: user.phone ?? '' };
}

export function normalizeProfileInput(input: ProfileInput): ProfileInput {
  const source = input && typeof input === 'object' ? input : emptyProfileInput();
  const name = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return {
    firstName: name(source.firstName),
    lastName: name(source.lastName),
    phone: typeof source.phone === 'string' ? source.phone.trim() : '',
  };
}

export function validateProfileInput(input: ProfileInput): ProfileFieldErrors {
  const value = normalizeProfileInput(input);
  const errors: ProfileFieldErrors = {};
  const allowedName = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+$/;
  const hasLetter = /[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/;
  for (const field of ['firstName', 'lastName'] as const) {
    const label = field === 'firstName' ? 'tu nombre' : 'tus apellidos';
    if (value[field].length < 2 || value[field].length > 50) {
      errors[field] = `Escribe ${label} con entre 2 y 50 caracteres.`;
    } else if (!allowedName.test(value[field]) || !hasLetter.test(value[field])) {
      errors[field] = 'Usa letras, espacios, apóstrofos o guiones.';
    }
  }
  if (!errors.firstName && !errors.lastName && `${value.firstName} ${value.lastName}`.length > 100) {
    errors.lastName = 'El nombre completo debe tener hasta 100 caracteres.';
  }
  if (!/^\d{10,15}$/.test(value.phone)) {
    errors.phone = 'Ingresa un teléfono de 10 a 15 dígitos, sin espacios ni signos.';
  }
  return errors;
}
