export interface User {
  id?: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'male' | 'female' | 'other';
  role?: string;
  picture?: string;
  avatar_url?: string;
  avatar?: string;
  avatarUrl?: string;
  ahorro?: number;
  savings?: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  gender: 'male' | 'female' | 'other';
  ahorro?: number;
}