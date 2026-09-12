import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { DatabaseUnavailableError, ValidationError } from '../../utils/errors';
import { findUserById, updateUserProfile } from '../users/user.repository';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginBody(body: unknown): { email: string; password: string } {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Solicitud inválida.');
  }
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== 'string' || email.trim() === '') {
    throw new ValidationError('El correo electrónico es obligatorio.');
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    throw new ValidationError('El correo electrónico no tiene un formato válido.');
  }
  if (typeof password !== 'string' || password === '') {
    throw new ValidationError('La contraseña es obligatoria.');
  }
  return { email: email.trim(), password };
}

function validateRegisterBody(body: unknown): {
  username: string;
  email: string;
  password: string;
  gender: 'male' | 'female' | 'other';
} {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Solicitud inválida.');
  }
  const { username, email, password, gender } = body as Record<string, unknown>;

  if (typeof username !== 'string' || username.trim() === '') {
    throw new ValidationError('El nombre de usuario es obligatorio.');
  }
  if (typeof email !== 'string' || email.trim() === '') {
    throw new ValidationError('El correo electrónico es obligatorio.');
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    throw new ValidationError('El correo electrónico no tiene un formato válido.');
  }
  if (typeof password !== 'string' || password.length < 6) {
    throw new ValidationError('La contraseña debe tener al menos 6 caracteres.');
  }
  if (gender !== 'male' && gender !== 'female' && gender !== 'other') {
    throw new ValidationError('El género debe ser male, female u other.');
  }
  return { username: username.trim(), email: email.trim(), password, gender };
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = validateLoginBody(req.body);
    const result = await authService.login(email, password);
    res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password, gender } = validateRegisterBody(req.body);
    const result = await authService.register(username, email, password, gender);
    res.status(201).json({
      message: 'Usuario registrado exitosamente.',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function googleLoginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;
    const { idToken } = body;
    if (typeof idToken !== 'string' || idToken.trim() === '') {
      throw new ValidationError('El token de Google es obligatorio.');
    }

    const result = await authService.loginWithGoogle(idToken.trim());
    res.status(200).json({
      message: 'Inicio de sesión con Google exitoso.',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { sub, email, username, gender, picture, avatar_url, avatar, avatarUrl } = req.authUser;
    const userRecord = await findUserById(sub);
    const currentAvatar = userRecord?.avatar_url ?? picture ?? avatar_url ?? avatar ?? avatarUrl;
    res.status(200).json({
      user: {
        id: sub,
        email,
        username,
        gender,
        picture: currentAvatar,
        avatar_url: currentAvatar,
        avatar: currentAvatar,
        avatarUrl: currentAvatar,
      },
    });
  } catch (error) {
    console.error('Error al consultar el usuario actual:', error);
    next(new DatabaseUnavailableError());
  }
}

export async function updateProfileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).authUser?.sub;
    if (!userId) {
      res.status(401).json({ message: 'Usuario no autenticado.' });
      return;
    }

    const { username, gender, avatar_url, avatarUrl } = req.body ?? {};
    const effectiveAvatar = avatar_url !== undefined ? avatar_url : avatarUrl;

    const updatedUser = await updateUserProfile(userId, {
      username: username ? String(username).trim() : undefined,
      gender: gender ? (String(gender).trim() as 'male' | 'female' | 'other') : undefined,
      avatarUrl: effectiveAvatar !== undefined ? String(effectiveAvatar).trim() : undefined,
    });

    if (!updatedUser) {
      res.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        gender: updatedUser.gender,
        picture: updatedUser.avatar_url,
        avatar_url: updatedUser.avatar_url,
        avatar: updatedUser.avatar_url,
        avatarUrl: updatedUser.avatar_url,
        google_id: updatedUser.google_id,
      },
    });
  } catch (error) {
    console.error('Error al actualizar el perfil del usuario:', error);
    next(new DatabaseUnavailableError());
  }
}