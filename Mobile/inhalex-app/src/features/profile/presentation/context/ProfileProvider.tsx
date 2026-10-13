import { useMemo, type PropsWithChildren } from 'react';
import type { AuthUser } from '@/features/auth/domain/entities/AuthUser';
import { createProfileRepository } from '../../data/profileDependencies';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';
import { useProfileController } from '../viewModels/useProfileViewModel';
import { ProfileContext } from './ProfileContext';

type ProfileProviderProps = PropsWithChildren<{
  userId: string;
  onProfile?: (profile: AuthUser) => void;
  repository?: ProfileRepository;
}>;

export function ProfileProvider({ children, userId, onProfile, repository }: ProfileProviderProps) {
  const resolved = useMemo(() => repository ?? createProfileRepository(), [repository]);
  const value = useProfileController(resolved, userId, onProfile);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
