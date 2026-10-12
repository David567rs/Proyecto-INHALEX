import { HttpClient } from '@/core/network/HttpClient';
import { sessionRepository } from '../../auth/data/repositories/sessionRepository';
import type { SessionRepository } from '../../auth/domain/repositories/SessionRepository';
import type { FavoritesRepository } from '../domain/repositories/FavoritesRepository';
import { FavoritesApiAdapter, type FavoritesHttpTransport } from './adapters/FavoritesApiAdapter';
import { HttpFavoritesRepository } from './repositories/HttpFavoritesRepository';

export function createFavoritesRepository(
  httpClient: FavoritesHttpTransport = new HttpClient(),
  session: Pick<SessionRepository, 'getAccessToken'> = sessionRepository,
  assetBaseUrl = process.env.EXPO_PUBLIC_ASSET_URL,
): FavoritesRepository {
  return new HttpFavoritesRepository(new FavoritesApiAdapter(httpClient, session), assetBaseUrl);
}

export const favoritesRepository = createFavoritesRepository();
