import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Expense {
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

export interface CreateExpenseDTO {
  category_id: string;
  description: string;
  amount: number;
  expense_date: string;
  is_recurring: boolean;
  notes?: string | null;
}

export type UpdateExpenseDTO = Partial<CreateExpenseDTO>;

export interface ExpenseMutationResponse {
  success: boolean;
  data: Expense;
}

export interface DeleteExpenseResponse {
  success: boolean;
  message: string;
}

export interface Income {
  id: string;
  user_id: string;
  category_id: string;
  description: string;
  amount: number;
  income_date: string;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category_name: string;
  category_color: string;
}

export interface CreateIncomeDTO {
  category_id: string;
  description: string;
  amount: number;
  income_date: string;
  is_recurring: boolean;
  notes?: string | null;
}

export type UpdateIncomeDTO = Partial<CreateIncomeDTO>;

export interface IncomeCategory {
  id: string;
  user_id: string | null;
  name: string;
  type: 'expense' | 'income' | 'both';
  color: string | null;
  icon: string | null;
}

export interface CreateCategoryDTO {
  name: string;
  type: 'expense' | 'income' | 'both';
  color?: string | null;
  icon?: string | null;
}

export type UpdateCategoryDTO = Partial<CreateCategoryDTO>;

export interface CategoryMutationResponse {
  success: boolean;
  data: IncomeCategory;
}

export interface DeleteCategoryResponse {
  success: boolean;
  message: string;
}

export interface ExpensesResponse {
  data: Expense[];
}

export interface IncomesResponse {
  data: Income[];
}

export interface IncomeMutationResponse {
  success: boolean;
  data: Income;
}

export interface DeleteIncomeResponse {
  success: boolean;
  message: string;
}

export interface DashboardMetric {
  currentMonth: number;
  previousMonth: number;
  percentage: number;
}

export interface DashboardMetrics {
  balance: DashboardMetric;
  incomes: DashboardMetric;
  expenses: DashboardMetric;
  savings: DashboardMetric;
}

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private readonly EXPENSES_URL = `${environment.apiUrl}/expenses`;
  private readonly INCOMES_URL = `${environment.apiUrl}/incomes`;
  private readonly CATEGORIES_URL = `${environment.apiUrl}/categories`;
  private readonly DASHBOARD_URL = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los gastos del usuario autenticado.
   */
  getExpenses(): Observable<ExpensesResponse> {
    return this.http.get<ExpensesResponse>(this.EXPENSES_URL);
  }

  /**
   * Crea un nuevo gasto.
   */
  createExpense(dto: CreateExpenseDTO): Observable<Expense> {
    return this.http
      .post<ExpenseMutationResponse>(this.EXPENSES_URL, dto)
      .pipe(map((res) => res.data));
  }

  /**
   * Actualiza un gasto existente por su ID.
   */
  updateExpense(id: string, dto: UpdateExpenseDTO): Observable<Expense> {
    return this.http
      .put<ExpenseMutationResponse>(`${this.EXPENSES_URL}/${id}`, dto)
      .pipe(map((res) => res.data));
  }

  /**
   * Elimina un gasto por su ID.
   */
  deleteExpense(id: string): Observable<DeleteExpenseResponse> {
    return this.http.delete<DeleteExpenseResponse>(`${this.EXPENSES_URL}/${id}`);
  }

  getDashboardMetrics(): Observable<{ data: DashboardMetrics }> {
    return this.http.get<{ data: DashboardMetrics }>(`${this.DASHBOARD_URL}/metrics`);
  }

  /**
   * Obtiene todos los ingresos del usuario autenticado.
   */
  getIncomes(): Observable<IncomesResponse> {
    return this.http.get<IncomesResponse>(this.INCOMES_URL);
  }

  /**
   * Crea un nuevo ingreso.
   */
  createIncome(dto: CreateIncomeDTO): Observable<Income> {
    return this.http
      .post<IncomeMutationResponse>(this.INCOMES_URL, dto)
      .pipe(map((res) => res.data));
  }

  /**
   * Actualiza un ingreso existente por su ID.
   */
  updateIncome(id: string, dto: UpdateIncomeDTO): Observable<Income> {
    return this.http
      .put<IncomeMutationResponse>(`${this.INCOMES_URL}/${id}`, dto)
      .pipe(map((res) => res.data));
  }

  /**
   * Elimina un ingreso por su ID.
   */
  deleteIncome(id: string): Observable<DeleteIncomeResponse> {
    return this.http.delete<DeleteIncomeResponse>(`${this.INCOMES_URL}/${id}`);
  }

  /**
   * Obtiene todas las categorías (globales y de usuario).
   */
  getAllCategories(): Observable<IncomeCategory[]> {
    return this.http
      .get<{ data: IncomeCategory[] }>(this.CATEGORIES_URL)
      .pipe(map((res) => res.data));
  }

  /**
   * Obtiene las categorías disponibles para el tipo indicado
   * (por defecto las de ingreso, para poblar el formulario).
   */
  getIncomeCategories(
    type: 'expense' | 'income' | 'both' = 'income'
  ): Observable<IncomeCategory[]> {
    return this.http
      .get<{ data: IncomeCategory[] }>(this.CATEGORIES_URL, {
        params: { type },
      })
      .pipe(map((res) => res.data));
  }

  /**
   * Crea una nueva categoría personalizada.
   */
  createCategory(dto: CreateCategoryDTO): Observable<IncomeCategory> {
    return this.http
      .post<CategoryMutationResponse>(this.CATEGORIES_URL, dto)
      .pipe(map((res) => res.data));
  }

  /**
   * Actualiza una categoría existente.
   */
  updateCategory(id: string, dto: UpdateCategoryDTO): Observable<IncomeCategory> {
    return this.http
      .put<CategoryMutationResponse>(`${this.CATEGORIES_URL}/${id}`, dto)
      .pipe(map((res) => res.data));
  }

  /**
   * Elimina una categoría personalizada.
   */
  deleteCategory(id: string): Observable<DeleteCategoryResponse> {
    return this.http.delete<DeleteCategoryResponse>(`${this.CATEGORIES_URL}/${id}`);
  }
}