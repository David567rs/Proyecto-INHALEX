import { HttpClient } from '@/core/network/HttpClient';
import { sessionRepository } from '../../auth/data/repositories/sessionRepository';
import type { SessionRepository } from '../../auth/domain/repositories/SessionRepository';
import type { AddressRepository } from '../domain/repositories/AddressRepository';
import { AddressApiAdapter, type AddressHttpTransport } from './adapters/AddressApiAdapter';
import { HttpAddressRepository } from './repositories/HttpAddressRepository';

export function createAddressRepository(
  httpClient: AddressHttpTransport = new HttpClient(),
  session: Pick<SessionRepository, 'getAccessToken'> = sessionRepository,
): AddressRepository {
  return new HttpAddressRepository(new AddressApiAdapter(httpClient, session));
}

export const addressRepository = createAddressRepository();
