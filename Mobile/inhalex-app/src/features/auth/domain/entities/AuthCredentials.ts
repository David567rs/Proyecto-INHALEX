export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  user: import('./AuthUser').AuthUser;
}
