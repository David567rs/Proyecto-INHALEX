import type { SessionRepository } from '../../domain/repositories/SessionRepository';
import { MemorySessionRepository } from './MemorySessionRepository';

// Metro selecciona este módulo en web y evita importar el almacenamiento nativo.
export const sessionRepository: SessionRepository = new MemorySessionRepository();
