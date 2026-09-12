import { pool } from '../../db/pool';

export type CategoryType = 'expense' | 'income' | 'both';

export interface CategoryRecord {
  id: string;
  user_id: string | null;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
}

/**
 * Obtiene todas las categorías disponibles para el usuario (globales y personalizadas).
 */
export async function getAllCategories(userId: string): Promise<CategoryRecord[]> {
  const result = await pool.query<CategoryRecord>(
    `SELECT id, user_id, name, type, color, icon
     FROM categories
     WHERE user_id IS NULL OR user_id = $1
     ORDER BY type ASC, name ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Obtiene las categorías de un tipo determinado para el usuario autenticado.
 * Incluye las categorías globales (user_id IS NULL) y las propias del usuario.
 */
export async function getCategoriesByType(
  type: CategoryType,
  userId: string
): Promise<CategoryRecord[]> {
  const result = await pool.query<CategoryRecord>(
    `SELECT id, user_id, name, type, color, icon
     FROM categories
     WHERE (type = $1 OR type = 'both') AND (user_id IS NULL OR user_id = $2)
     ORDER BY name ASC`,
    [type, userId]
  );
  return result.rows;
}

/**
 * Obtiene una categoría por ID para el usuario.
 */
export async function getCategoryById(
  categoryId: string,
  userId: string
): Promise<CategoryRecord | null> {
  const result = await pool.query<CategoryRecord>(
    `SELECT id, user_id, name, type, color, icon
     FROM categories
     WHERE id = $1 AND (user_id IS NULL OR user_id = $2)
     LIMIT 1`,
    [categoryId, userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Crea una categoría personalizada para el usuario.
 */
export async function createCategory(
  userId: string,
  name: string,
  type: CategoryType,
  color: string | null = null,
  icon: string | null = null
): Promise<CategoryRecord> {
  const result = await pool.query<CategoryRecord>(
    `INSERT INTO categories (user_id, name, type, color, icon)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, name, type, color, icon`,
    [userId, name, type, color, icon]
  );
  return result.rows[0];
}

/**
 * Actualiza una categoría personalizada del usuario.
 */
export async function updateCategory(
  categoryId: string,
  userId: string,
  updates: Partial<{
    name: string;
    type: CategoryType;
    color: string;
    icon: string;
  }>
): Promise<CategoryRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [categoryId, userId];
  let paramCount = 3;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.type !== undefined) {
    fields.push(`type = $${paramCount++}`);
    values.push(updates.type);
  }
  if (updates.color !== undefined) {
    fields.push(`color = $${paramCount++}`);
    values.push(updates.color);
  }
  if (updates.icon !== undefined) {
    fields.push(`icon = $${paramCount++}`);
    values.push(updates.icon);
  }

  if (fields.length === 0) {
    return getCategoryById(categoryId, userId);
  }

  const query = `UPDATE categories SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING id, user_id, name, type, color, icon`;
  const result = await pool.query<CategoryRecord>(query, values);
  return result.rows[0] ?? null;
}

/**
 * Elimina una categoría personalizada del usuario (las globales no se eliminan).
 */
export async function deleteCategory(categoryId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM categories WHERE id = $1 AND user_id = $2',
    [categoryId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}