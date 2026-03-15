export type UserRole = "user" | "admin"

export interface AuthUser {
  _id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  role: UserRole
  status: "active" | "inactive"
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}
