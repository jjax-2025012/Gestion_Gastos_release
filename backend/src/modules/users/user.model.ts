export interface UserRecord {
  id: string; // UUID
  username: string;
  email: string;
  password: string; // hash de la contraseña
  gender: 'male' | 'female' | 'other';
  avatar_url?: string;
  google_id?: string;
  firstName?: string;
  lastName?: string;
  ahorro?: number;
  created_at: Date;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  firstName?: string;
  lastName?: string;
  picture?: string;
  avatar_url?: string;
  avatar?: string;
  avatarUrl?: string;
  google_id?: string;
  ahorro: number;
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    gender: user.gender,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar_url: user.avatar_url,
    picture: user.avatar_url,
    avatar: user.avatar_url,
    avatarUrl: user.avatar_url,
    google_id: user.google_id,
    ahorro: typeof user.ahorro === 'number' ? user.ahorro : (parseFloat(String(user.ahorro ?? 0)) || 0),
  };
}