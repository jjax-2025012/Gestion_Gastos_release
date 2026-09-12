import { Router } from 'express';
import {
  getExpensesHandler,
  createExpenseHandler,
  updateExpenseHandler,
  deleteExpenseHandler,
} from './expenses.controller';
import { requireAuth } from '../../middleware/auth.middleware';

export const expensesRouter = Router();

// GET /api/expenses — obtiene todos los gastos del usuario autenticado
expensesRouter.get('/', requireAuth, getExpensesHandler);

// POST /api/expenses — crea un nuevo gasto
expensesRouter.post('/', requireAuth, createExpenseHandler);

// PUT /api/expenses/:id — actualiza un gasto existente
expensesRouter.put('/:id', requireAuth, updateExpenseHandler);

// DELETE /api/expenses/:id — elimina un gasto
expensesRouter.delete('/:id', requireAuth, deleteExpenseHandler);
