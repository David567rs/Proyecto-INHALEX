export interface AuthUserDto {
  _id?: unknown;
  id?: unknown;
  name?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  role?: unknown;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuthResponseDto {
  accessToken?: unknown;
  user?: AuthUserDto;
}
