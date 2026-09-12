import { Request, Response, NextFunction } from 'express';
import {
  createIncome,
  deleteIncome,
  getIncomesByUserId,
  updateIncome,
} from './incomes.repository';
import { AppError, DatabaseUnavailableError, UnauthorizedError, ValidationError } from '../../utils/errors';
import { AuthTokenPayload } from '../../utils/jwt';
import { createNotification } from '../notifications/notifications.repository';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DESCRIPTION_LENGTH = 255;

export interface IncomeInput {
  categoryId: string;
  description: string;
  amount: number;
  incomeDate: string;
  isRecurring: boolean;
  notes: string | null;
}

function getAuthenticatedUserId(req: Request): string {
  const userId = (req as Request & { authUser?: AuthTokenPayload }).authUser?.sub;
  if (!userId) {
    throw new UnauthorizedError('Usuario no autenticado.');
  }
  return userId;
}

function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function parseAmount(value: unknown): number {
  if (typeof value !== 'number' && !(typeof value === 'string' && value.trim() !== '')) {
    throw new ValidationError('El monto es obligatorio.');
  }
  const strVal = String(value).trim();
  const decimalPart = strVal.split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    throw new ValidationError('El monto no puede tener más de 2 decimales.');
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError('El monto debe ser un número mayor que 0.');
  }
  return Math.round(amount * 100) / 100;
}

function validateCategoryId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new ValidationError('La categoría es obligatoria.');
  }
  return value;
}

function validateDescription(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError('La descripción es obligatoria.');
  }
  if (value.trim().length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres.`);
  }
  return value.trim();
}

function validateIncomeDate(value: unknown): string {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
    throw new ValidationError('La fecha no tiene un formato válido (AAAA-MM-DD).');
  }
  return value;
}

function validateNotes(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new ValidationError('Las notas deben ser texto.');
  }
  return value;
}

export function validateCreateIncomeBody(body: unknown): IncomeInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Solicitud inválida.');
  }
  const { category_id, description, amount, income_date, is_recurring, notes } = body as Record<string, unknown>;

  const incomeDate = income_date === undefined || income_date === ''
    ? todayISO()
    : validateIncomeDate(income_date);

  return {
    categoryId: validateCategoryId(category_id),
    description: validateDescription(description),
    amount: parseAmount(amount),
    incomeDate,
    isRecurring: is_recurring === true,
    notes: validateNotes(notes),
  };
}

export function validateUpdateIncomeBody(body: unknown): Partial<IncomeInput> {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Solicitud inválida.');
  }
  const { category_id, description, amount, income_date, is_recurring, notes } = body as Record<string, unknown>;

  const updates: Partial<IncomeInput> = {};

  if (category_id !== undefined) {
    updates.categoryId = validateCategoryId(category_id);
  }
  if (description !== undefined) {
    updates.description = validateDescription(description);
  }
  if (amount !== undefined) {
    updates.amount = parseAmount(amount);
  }
  if (income_date !== undefined) {
    updates.incomeDate = validateIncomeDate(income_date);
  }
  if (is_recurring !== undefined) {
    updates.isRecurring = is_recurring === true;
  }
  if (notes !== undefined) {
    updates.notes = validateNotes(notes);
  }

  return updates;
}

function forwardError(error: unknown, next: NextFunction): void {
  if (error instanceof AppError) {
    next(error);
  } else {
    next(new DatabaseUnavailableError());
  }
}

/**
 * GET /api/incomes — obtiene todos los ingresos del usuario autenticado.
 */
export async function getIncomesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const incomes = await getIncomesByUserId(userId);
    res.status(200).json({ data: incomes });
  } catch (error) {
    forwardError(error, next);
  }
}

/**
 * POST /api/incomes — crea un nuevo ingreso.
 */
export async function createIncomeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const data = validateCreateIncomeBody(req.body);
    const notesBody = data.notes ?? '';

    const income = await createIncome(
      userId,
      data.categoryId,
      data.description,
      data.amount,
      data.incomeDate,
      data.isRecurring,
      notesBody
    );
    try {
      await createNotification(userId, `Nuevo ingreso registrado: ${income.description}`, 'success', 'trending-up');
    } catch (notificationError) {
      console.error('No se pudo registrar la notificación del ingreso creado.', notificationError);
    }
    res.status(201).json({ success: true, data: income });
  } catch (error) {
    forwardError(error, next);
  }
}

/**
 * PUT /api/incomes/:id — actualiza un ingreso existente.
 */
export async function updateIncomeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const incomeId = req.params.id;
    if (!UUID_REGEX.test(incomeId)) {
      throw new ValidationError('Identificador de ingreso inválido.');
    }

    const updates = validateUpdateIncomeBody(req.body);
    const income = await updateIncome(incomeId, userId, updates);

    if (!income) {
      res.status(404).json({ message: 'Ingreso no encontrado.' });
      return;
    }

    try {
      await createNotification(userId, `Ingreso modificado: Q${Number(income.amount).toFixed(2)}`, 'info', 'edit');
    } catch (notificationError) {
      console.error('No se pudo registrar la notificación del ingreso modificado.', notificationError);
    }

    res.status(200).json({ success: true, data: income });
  } catch (error) {
    forwardError(error, next);
  }
}

/**
 * DELETE /api/incomes/:id — elimina un ingreso.
 */
export async function deleteIncomeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const incomeId = req.params.id;
    if (!UUID_REGEX.test(incomeId)) {
      throw new ValidationError('Identificador de ingreso inválido.');
    }

    const deleted = await deleteIncome(incomeId, userId);

    if (!deleted) {
      res.status(404).json({ message: 'Ingreso no encontrado.' });
      return;
    }

    try {
      await createNotification(userId, `Ingreso eliminado: ${incomeId}`, 'warning', 'trash');
    } catch (notificationError) {
      console.error('No se pudo registrar la notificación del ingreso eliminado.', notificationError);
    }

    res.status(200).json({ success: true, message: 'Ingreso eliminado correctamente' });
  } catch (error) {
    forwardError(error, next);
  }
}