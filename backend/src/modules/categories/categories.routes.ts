import { Router } from 'express';
import {
  getCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from './categories.controller';
import { requireAuth } from '../../middleware/auth.middleware';

export const categoriesRouter = Router();

// GET /api/categories — obtiene las categorías (opcional ?type=income|expense|both)
categoriesRouter.get('/', requireAuth, getCategoriesHandler);

// POST /api/categories — crea una nueva categoría
categoriesRouter.post('/', requireAuth, createCategoryHandler);

// PUT /api/categories/:id — actualiza una categoría
categoriesRouter.put('/:id', requireAuth, updateCategoryHandler);

// DELETE /api/categories/:id — elimina una categoría personalizada
categoriesRouter.delete('/:id', requireAuth, deleteCategoryHandler);