import type { SessionRepository } from '../../domain/repositories/SessionRepository';
import { SecureSessionRepository } from './SecureSessionRepository';

export const sessionRepository: SessionRepository = new SecureSessionRepository();
