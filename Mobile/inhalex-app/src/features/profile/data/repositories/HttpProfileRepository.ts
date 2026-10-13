import { ApiError } from '@/core/network/ApiError';
import { normalizeProfileInput, validateProfileInput, type ProfileInput, type UserProfile } from '../../domain/entities/Profile';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';
import type { ProfileApi } from '../adapters/ProfileApiAdapter';
import { mapProfile } from '../mappers/profileMapper';

export class HttpProfileRepository implements ProfileRepository {
  constructor(private readonly api: ProfileApi) {}

  async get(isCurrent?: () => boolean): Promise<UserProfile> {
    return mapProfile(await this.api.get(isCurrent));
  }

  async update(input: ProfileInput, isCurrent?: () => boolean): Promise<UserProfile> {
    const value = normalizeProfileInput(input);
    const errors = validateProfileInput(value);
    if (Object.keys(errors).length) throw new ApiError('Revisa los campos del perfil antes de guardar.', 400);
    return mapProfile(await this.api.update(value, isCurrent));
  }
}
