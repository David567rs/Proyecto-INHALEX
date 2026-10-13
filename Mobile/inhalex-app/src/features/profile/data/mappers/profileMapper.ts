import { ApiError } from '@/core/network/ApiError';
import type { UserProfile } from '../../domain/entities/Profile';

function invalidProfile(): never {
  throw new ApiError('La API devolvió información de perfil inválida. Intenta de nuevo.');
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return invalidProfile();
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return invalidProfile();
  return value.trim() || undefined;
}

function optionalDate(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const date = requiredString(value);
  const timestamp = Date.parse(date);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== date) return invalidProfile();
  return date;
}

export function mapProfile(response: unknown): UserProfile {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return invalidProfile();
  const dto = response as Record<string, unknown>;
  const id = requiredString(dto._id ?? dto.id).toLowerCase();
  if (!/^[a-f0-9]{24}$/.test(id)) return invalidProfile();
  if (dto._id !== undefined && dto.id !== undefined && requiredString(dto.id).toLowerCase() !== id) return invalidProfile();
  const name = requiredString(dto.name);
  const email = requiredString(dto.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return invalidProfile();
  if (dto.role !== 'user' && dto.role !== 'admin') return invalidProfile();
  if (dto.status === 'inactive') throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
  if (dto.status !== 'active') return invalidProfile();

  return {
    id, name, email, role: dto.role, status: dto.status,
    firstName: optionalString(dto.firstName),
    lastName: optionalString(dto.lastName),
    phone: optionalString(dto.phone),
    createdAt: optionalDate(dto.createdAt),
    updatedAt: optionalDate(dto.updatedAt),
  };
}
