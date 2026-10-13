import type { ProfileInput, UserProfile } from '../entities/Profile';

export interface ProfileRepository {
  get(isCurrent?: () => boolean): Promise<UserProfile>;
  update(input: ProfileInput, isCurrent?: () => boolean): Promise<UserProfile>;
}
