import { pool } from '../../db/pool';
import { UserRecord } from './user.model';

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, username, email, password_hash AS password, gender, avatar_url, google_id, COALESCE(ahorro, 0)::float AS ahorro, created_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, username, email, password_hash AS password, gender, avatar_url, google_id, COALESCE(ahorro, 0)::float AS ahorro, created_at
     FROM users
     WHERE username = $1
     LIMIT 1`,
    [username]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, username, email, password_hash AS password, gender, avatar_url, google_id, COALESCE(ahorro, 0)::float AS ahorro, created_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createUser(
  username: string,
  email: string,
  passwordHash: string,
  gender: 'male' | 'female' | 'other',
  avatarUrl?: string,
  ahorro: number = 0
): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (username, email, password_hash, gender, avatar_url, ahorro)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, username, email, password_hash AS password, gender, avatar_url, google_id, COALESCE(ahorro, 0)::float AS ahorro, created_at`,
    [username, email, passwordHash, gender, avatarUrl ?? null, ahorro]
  );
  return result.rows[0];
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
  await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, userId]);
}

export async function updateGoogleIdentity(
  userId: string,
  googleId: string,
  avatarUrl?: string
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET google_id = $1,
         avatar_url = COALESCE($2, avatar_url)
     WHERE id = $3`,
    [googleId, avatarUrl ?? null, userId]
  );
}

export async function upsertGoogleUser(
  username: string,
  email: string,
  passwordHash: string,
  avatarUrl: string | undefined,
  googleId: string
): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (username, email, password_hash, gender, avatar_url, google_id)
     VALUES ($1, $2, $3, 'other', $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
       google_id = EXCLUDED.google_id
     RETURNING id, username, email, password_hash AS password, gender, avatar_url, google_id, COALESCE(ahorro, 0)::float AS ahorro, created_at`,
    [username, email, passwordHash, avatarUrl ?? null, googleId]
  );
  return result.rows[0];
}

export async function updateUserProfile(
  userId: string,
  updates: { username?: string; gender?: 'male' | 'female' | 'other'; avatarUrl?: string }
): Promise<UserRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [userId];
  let paramIndex = 2;

  if (updates.username !== undefined) {
    fields.push(`username = $${paramIndex++}`);
    values.push(updates.username);
  }
  if (updates.gender !== undefined) {
    fields.push(`gender = $${paramIndex++}`);
    values.push(updates.gender);
  }
  if (updates.avatarUrl !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(updates.avatarUrl);
  }

  if (fields.length === 0) {
    return findUserById(userId);
  }

  fields.push('updated_at = NOW()');

  await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $1`,
    values
  );

  return findUserById(userId);
}