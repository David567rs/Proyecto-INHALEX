import { ServiceUnavailableException } from '@nestjs/common';

export const REGISTRATION_CODE_SENDER = Symbol('REGISTRATION_CODE_SENDER');

export interface RegistrationCodeSender {
  readonly available: boolean;
  send(email: string, code: string, expiresInMinutes: number): Promise<void>;
}

export const unavailableRegistrationCodeSender: RegistrationCodeSender = {
  available: false,
  send: () =>
    Promise.reject(
      new ServiceUnavailableException('El envío de correo no está disponible.'),
    ),
};
