import { Request, Response, NextFunction } from 'express';
import { createNotification, deleteNotification, getNotificationsByUserId, markAllNotificationsAsRead } from './notifications.repository';
import { AuthTokenPayload } from '../../utils/jwt';

export async function createNotificationHandler(
  req: Request & { authUser?: AuthTokenPayload },
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.authUser?.sub;
    const { message, type = 'info', icon = 'info' } = req.body as {
      message?: unknown;
      type?: unknown;
      icon?: unknown;
    };

    if (!userId) { res.status(401).json({ error: 'Usuario no autenticado.' }); return; }
    if (typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'El mensaje de la notificación es obligatorio.' });
      return;
    }
    if (type !== 'success' && type !== 'info' && type !== 'warning') {
      res.status(400).json({ error: 'El tipo de notificación no es válido.' });
      return;
    }
    if (typeof icon !== 'string' || icon.trim().length === 0) {
      res.status(400).json({ error: 'El icono de la notificación es obligatorio.' });
      return;
    }

    await createNotification(userId, message.trim(), type, icon.trim());
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
}

export async function getNotificationsHandler(
  req: Request & { authUser?: AuthTokenPayload },
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.authUser?.sub;
    if (!userId) { res.status(401).json({ error: 'Usuario no autenticado.' }); return; }
    res.status(200).json({ data: await getNotificationsByUserId(userId) });
  } catch (error) { next(error); }
}

export async function markAllNotificationsAsReadHandler(
  req: Request & { authUser?: AuthTokenPayload },
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.authUser?.sub;
    if (!userId) { res.status(401).json({ error: 'Usuario no autenticado.' }); return; }
    const updated = await markAllNotificationsAsRead(userId);
    res.status(200).json({ success: true, updated });
  } catch (error) { next(error); }
}

export async function deleteNotificationHandler(
  req: Request & { authUser?: AuthTokenPayload },
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.authUser?.sub;
    if (!userId) { res.status(401).json({ error: 'Usuario no autenticado.' }); return; }
    const deleted = await deleteNotification(req.params.id, userId);
    if (!deleted) { res.status(404).json({ message: 'Notificación no encontrada.' }); return; }
    res.status(200).json({ success: true });
  } catch (error) { next(error); }
}