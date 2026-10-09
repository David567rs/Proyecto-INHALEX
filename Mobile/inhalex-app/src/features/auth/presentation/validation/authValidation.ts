import type { LoginInput, RegisterInput } from '../../domain/entities/AuthCredentials';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+$/;
const PHONE_REGEX = /^\d{10,15}$/;

export interface RegisterForm extends RegisterInput {
  confirmPassword: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9\s]/.test(password),
  };
}

export function validateLogin(input: LoginInput): FieldErrors<LoginInput> {
  const errors: FieldErrors<LoginInput> = {};
  const email = input.email.trim();

  if (!email) {
    errors.email = 'El correo es obligatorio.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Ingresa un correo electronico valido.';
  }

  if (!input.password) {
    errors.password = 'La contrasena es obligatoria.';
  } else if (input.password.length < 8 || input.password.length > 128) {
    errors.password = 'Debe tener entre 8 y 128 caracteres.';
  }

  return errors;
}

export function validateRegister(input: RegisterForm): FieldErrors<RegisterForm> {
  const errors: FieldErrors<RegisterForm> = {};
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const checks = passwordChecks(input.password);

  if (!firstName) {
    errors.firstName = 'El nombre es obligatorio.';
  } else if (firstName.length < 2 || firstName.length > 50 || !NAME_REGEX.test(firstName)) {
    errors.firstName = 'Usa de 2 a 50 letras.';
  }

  if (!lastName) {
    errors.lastName = 'El apellido es obligatorio.';
  } else if (lastName.length < 2 || lastName.length > 50 || !NAME_REGEX.test(lastName)) {
    errors.lastName = 'Usa de 2 a 50 letras.';
  }

  if (!email) {
    errors.email = 'El correo es obligatorio.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Ingresa un correo electronico valido.';
  }

  if (!input.phone) {
    errors.phone = 'El telefono es obligatorio.';
  } else if (!PHONE_REGEX.test(input.phone)) {
    errors.phone = 'Ingresa entre 10 y 15 digitos.';
  }

  if (!checks.length || !checks.uppercase || !checks.number || !checks.special) {
    errors.password = 'La contrasena no cumple todos los requisitos.';
  } else if (input.password.length > 128) {
    errors.password = 'La contrasena no puede exceder 128 caracteres.';
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'Confirma tu contrasena.';
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Las contrasenas no coinciden.';
  }

  return errors;
}

export function sanitizeName(value: string): string {
  return value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]/g, '').slice(0, 50);
}

export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}
