import { Request, Response, NextFunction } from 'express';
import {
  CategoryType,
  getCategoriesByType,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './categories.repository';
import { AppError, DatabaseUnavailableError, UnauthorizedError, ValidationError } from '../../utils/errors';
import { AuthTokenPayload } from '../../utils/jwt';

const VALID_TYPES: CategoryType[] = ['expense', 'income', 'both'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAuthenticatedUserId(req: Request): string {
  const userId = (req as Request & { authUser?: AuthTokenPayload }).authUser?.sub;
  if (!userId) {
    throw new UnauthorizedError('Usuario no autenticado.');
  }
  return userId;
}

function forwardError(error: unknown, next: NextFunction): void {
  if (error instanceof AppError) {
    next(error);
  } else {
    next(new DatabaseUnavailableError());
  }
}

/**
 * GET /api/categories?type=income|expense|both
 * Devuelve las categorías del usuario autenticado. Si no se indica tipo, devuelve todas.
 */
export async function getCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const rawType = req.query.type as string | undefined;

    if (rawType) {
      if (!VALID_TYPES.includes(rawType as CategoryType)) {
        throw new ValidationError('El tipo de categoría debe ser expense, income o both.');
      }
      const categories = await getCategoriesByType(rawType as CategoryType, userId);
      res.status(200).json({ data: categories });
      return;
    }

    const categories = await getAllCategories(userId);
    res.status(200).json({ data: categories });
  } catch (error) {
    forwardError(error, next);
  }
}

/**
 * POST /api/categories — crea una nueva categoría personalizada
 */
export async function createCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { name, type, color, icon } = req.body ?? {};

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('El nombre de la categoría es obligatorio.');
    }
    if (!type || !VALID_TYPES.includes(type as CategoryType)) {
      throw new ValidationError('El tipo de categoría debe ser expense, income o both.');
    }

    const category = await createCategory(
      userId,
      name.trim(),
      type as CategoryType,
      color ? String(color).trim() : null,
      icon ? String(icon).trim() : null
    );

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    forwardError(error, next);
  }
}

/**
 * PUT /api/categories/:id — actualiza una categoría existente
 */
export async function updateCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const categoryId = req.params.id;
    if (!UUID_REGEX.test(categoryId)) {
      throw new ValidationError('Identificador de categoría inválido.');
    }

    const { name, type, color, icon } = req.body ?? {};
    const updates: Partial<{ name: string; type: CategoryType; color: string; icon: string }> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        throw new ValidationError('El nombre no puede estar vacío.');
      }
      updates.name = name.trim();
    }
    if (type !== undefined) {
      if (!VALID_TYPES.includes(type as CategoryType)) {
        throw new ValidationError('Tipo de categoría inválido.');
      }
      updates.type = type as CategoryType;
    }
    if (color !== undefined) {
      updates.color = String(color).trim();
    }
    if (icon !== undefined) {
      updates.icon = String(icon).trim();
    }

    const category = await updateCategory(categoryId, userId, updates);
    if (!category) {
      res.status(404).json({ message: 'Categoría no encontrada o no tienes permisos para editarla.' });
      return;
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    forwardError(error, next);
  }
}

/**
 * DELETE /api/categories/:id — elimina una categoría personalizada
 */
export async function deleteCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const categoryId = req.params.id;
    if (!UUID_REGEX.test(categoryId)) {
      throw new ValidationError('Identificador de categoría inválido.');
    }

    const deleted = await deleteCategory(categoryId, userId);
    if (!deleted) {
      res.status(404).json({ message: 'Categoría no encontrada o no se puede eliminar (categoría del sistema).' });
      return;
    }

    res.status(200).json({ success: true, message: 'Categoría eliminada correctamente' });
  } catch (error) {
    forwardError(error, next);
  }
}