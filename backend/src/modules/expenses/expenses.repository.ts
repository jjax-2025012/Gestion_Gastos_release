import { pool } from '../../db/pool';
import { createNotification } from '../notifications/notifications.repository';

export interface ExpenseRecord {
  id: string;
  user_id: string;
  category_id: string;
  description: string;
  amount: number;
  expense_date: string;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category_name: string;
  category_color: string;
}

/**
 * Obtiene todos los gastos del usuario con información de la categoría.
 * Realiza un JOIN con la tabla categories para obtener el nombre y color.
 */
export async function getExpensesByUserId(userId: string): Promise<ExpenseRecord[]> {
  const result = await pool.query<ExpenseRecord>(
    `SELECT 
      e.id, 
      e.user_id, 
      e.category_id, 
      e.description, 
      e.amount, 
      e.expense_date, 
      e.is_recurring, 
      e.notes, 
      e.created_at, 
      e.updated_at,
      c.name AS category_name,
      c.color AS category_color
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = $1
     ORDER BY e.expense_date DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Obtiene un gasto específico por ID (verificando que pertenezca al usuario).
 */
export async function getExpenseById(
  expenseId: string,
  userId: string
): Promise<ExpenseRecord | null> {
  const result = await pool.query<ExpenseRecord>(
    `SELECT 
      e.id, 
      e.user_id, 
      e.category_id, 
      e.description, 
      e.amount, 
      e.expense_date, 
      e.is_recurring, 
      e.notes, 
      e.created_at, 
      e.updated_at,
      c.name AS category_name,
      c.color AS category_color
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.id = $1 AND e.user_id = $2
     LIMIT 1`,
    [expenseId, userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Crea un nuevo gasto.
 */
export async function createExpense(
  userId: string,
  categoryId: string,
  description: string,
  amount: number,
  expenseDate: string,
  isRecurring: boolean = false,
  notes?: string
): Promise<ExpenseRecord> {
  const result = await pool.query<ExpenseRecord>(
    `INSERT INTO expenses (user_id, category_id, description, amount, expense_date, is_recurring, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, category_id, description, amount, expense_date, is_recurring, notes, created_at, updated_at`,
    [userId, categoryId, description, amount, expenseDate, isRecurring, notes ?? null]
  );
  // Obtener el gasto completo con la información de la categoría
  const expenseId = result.rows[0].id;
  const expense = await getExpenseById(expenseId, userId) as ExpenseRecord;
  await createNotification(userId, `Nuevo gasto registrado: ${expense.description}`, 'info', 'receipt');
  return expense;
}

/**
 * Actualiza un gasto existente.
 */
export async function updateExpense(
  expenseId: string,
  userId: string,
  updates: Partial<{
    categoryId: string;
    description: string;
    amount: number;
    expenseDate: string;
    isRecurring: boolean;
    notes: string | null;
  }>
): Promise<ExpenseRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [expenseId, userId];
  let paramCount = 3;

  if (updates.description !== undefined) {
    fields.push(`description = $${paramCount++}`);
    values.push(updates.description);
  }
  if (updates.amount !== undefined) {
    fields.push(`amount = $${paramCount++}`);
    values.push(updates.amount);
  }
  if (updates.categoryId !== undefined) {
    fields.push(`category_id = $${paramCount++}`);
    values.push(updates.categoryId);
  }
  if (updates.expenseDate !== undefined) {
    fields.push(`expense_date = $${paramCount++}`);
    values.push(updates.expenseDate);
  }
  if (updates.isRecurring !== undefined) {
    fields.push(`is_recurring = $${paramCount++}`);
    values.push(updates.isRecurring);
  }
  if (updates.notes !== undefined) {
    fields.push(`notes = $${paramCount++}`);
    values.push(updates.notes);
  }

  if (fields.length === 0) {
    return getExpenseById(expenseId, userId);
  }

  fields.push(`updated_at = NOW()`);

  const query = `UPDATE expenses SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING id`;
  await pool.query(query, values);

  const expense = await getExpenseById(expenseId, userId);
  if (expense) {
    await createNotification(userId, `Gasto modificado: Q${Number(expense.amount).toFixed(2)}`, 'info', 'edit');
  }
  return expense;
}

/**
 * Elimina un gasto.
 */
export async function deleteExpense(expenseId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
    [expenseId, userId]
  );
  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted) {
    await createNotification(userId, `Gasto eliminado: ${expenseId}`, 'warning', 'trash');
  }
  return deleted;
}
