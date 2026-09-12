import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
	createNotificationHandler,
	getNotificationsHandler,
	markAllNotificationsAsReadHandler,
	deleteNotificationHandler,
} from './notifications.controller';

export const notificationsRouter = Router();
notificationsRouter.post('/', requireAuth, createNotificationHandler);
notificationsRouter.get('/', requireAuth, getNotificationsHandler);
notificationsRouter.patch('/read-all', requireAuth, markAllNotificationsAsReadHandler);
notificationsRouter.delete('/:id', requireAuth, deleteNotificationHandler);