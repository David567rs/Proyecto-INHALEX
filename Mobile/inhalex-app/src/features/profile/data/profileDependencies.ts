import { HttpClient } from '@/core/network/HttpClient';
import { sessionRepository } from '../../auth/data/repositories/sessionRepository';
import type { SessionRepository } from '../../auth/domain/repositories/SessionRepository';
import type { ProfileRepository } from '../domain/repositories/ProfileRepository';
import { ProfileApiAdapter, type ProfileHttpTransport } from './adapters/ProfileApiAdapter';
import { HttpProfileRepository } from './repositories/HttpProfileRepository';

export function createProfileRepository(
  httpClient: ProfileHttpTransport = new HttpClient(),
  session: Pick<SessionRepository, 'getAccessToken'> = sessionRepository,
): ProfileRepository {
  return new HttpProfileRepository(new ProfileApiAdapter(httpClient, session));
}

export const profileRepository = createProfileRepository();
