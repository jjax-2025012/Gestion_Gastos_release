import { Router } from 'express';
import {
  loginHandler,
  registerHandler,
  googleLoginHandler,
  getMeHandler,
  updateProfileHandler,
} from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', registerHandler);

// POST /api/auth/login
authRouter.post('/login', loginHandler);

// POST /api/auth/google — recibe el ID Token de Google y devuelve el JWT del sistema.
authRouter.post('/google', googleLoginHandler);

// GET /api/auth/me — valida el JWT y devuelve el usuario de la sesión.
authRouter.get('/me', requireAuth, getMeHandler);

// PUT /api/auth/profile — actualiza el perfil del usuario autenticado.
authRouter.put('/profile', requireAuth, updateProfileHandler);