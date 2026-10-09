import { ApiError } from '@/core/network/ApiError';
import type { AuthSession } from '../../domain/entities/AuthCredentials';
import type { AuthUser, UserRole, UserStatus } from '../../domain/entities/AuthUser';
import type { AuthResponseDto, AuthUserDto } from '../dto/authDtos';

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function mapAuthUser(dto: AuthUserDto): AuthUser {
  const id = optionalString(dto._id) ?? optionalString(dto.id);
  const name = optionalString(dto.name);
  const email = optionalString(dto.email);

  if (!id || !name || !email) {
    throw new ApiError('La API devolvio un perfil de usuario incompleto.');
  }

  const role: UserRole = dto.role === 'admin' ? 'admin' : 'user';
  const status: UserStatus = dto.status === 'inactive' ? 'inactive' : 'active';

  return {
    id,
    name,
    email,
    role,
    status,
    firstName: optionalString(dto.firstName),
    lastName: optionalString(dto.lastName),
    phone: optionalString(dto.phone),
    createdAt: optionalString(dto.createdAt),
    updatedAt: optionalString(dto.updatedAt),
  };
}

export function mapAuthSession(dto: AuthResponseDto): AuthSession {
  if (typeof dto.accessToken !== 'string' || !dto.accessToken || !dto.user) {
    throw new ApiError('La API no devolvio una sesion valida.');
  }

  return {
    accessToken: dto.accessToken,
    user: mapAuthUser(dto.user),
  };
}
