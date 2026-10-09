import { HttpClient } from '@/core/network/HttpClient';
import { AuthSessionService } from '../domain/useCases/AuthSessionService';
import { HttpAuthRepository } from './repositories/HttpAuthRepository';
import { sessionRepository } from './repositories/sessionRepository';

const httpClient = new HttpClient();
const authRepository = new HttpAuthRepository(httpClient);

export const authSessionService = new AuthSessionService(authRepository, sessionRepository);
