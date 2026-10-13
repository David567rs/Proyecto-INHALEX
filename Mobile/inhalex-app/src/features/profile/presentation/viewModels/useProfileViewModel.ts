import { useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { AuthUser } from '@/features/auth/domain/entities/AuthUser';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';
import { ProfileContext } from '../context/ProfileContext';
import { ProfileController } from './ProfileController';

export function useProfileController(repository: ProfileRepository, userId: string, onProfile?: (profile: AuthUser) => void) {
  const controller = useMemo(() => new ProfileController(repository, userId, onProfile), [repository, userId, onProfile]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { void controller.start(); return () => controller.stop(); }, [controller]);
  return snapshot;
}

export function useProfileViewModel() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('El perfil necesita ProfileProvider.');
  return value;
}
