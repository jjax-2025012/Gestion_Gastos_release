import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { AppSidebarComponent } from '../../core/components/app-sidebar/app-sidebar.component';
import { SavingsService } from '../../core/services/savings.service';
import { CurrencyService } from '../../core/services/currency.service';
import { AppHeaderComponent } from '../../core/components/app-header/app-header.component';
import { AppBudgetSummaryComponent } from '../../core/components/app-budget-summary/app-budget-summary.component';
import { AuthService } from '../../core/services/auth.service';
import {
  FinanceService,
  Expense,
  Income,
  IncomeCategory,
} from '../../core/services/finance.service';

interface SummaryCard {
  title: string;
  amount: number;
  changePercent: number;
  colorLine: 'blue' | 'red' | 'green';
  iconSrc: string;
}

interface ChartPoint {
  label: string;
  gastos: number;
}

interface ChartPointPosition {
  x: number;
  y: number;
  value: number;
  label: string;
}

interface DonutSlice {
  name: string;
  color: string;
  amount: number;
  percent: number;
  dashArray: string;
  dashOffset: number;
}

type RangeMode = 'Semana' | 'Mes' | 'Año';

const ICON_PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5 M5 10.5V20h5v-6h4v6h5v-9.5',
  receipt: 'M6 2h9l3 3v17H6z M9 8h6 M9 12h6 M9 16h4',
  'trending-up': 'M3 17l6-6 4 4 8-8 M15 6h6v6',
  'piggy-bank': 'M4 12a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2h-1l-1 3h-3l-1-2H9l-1 2H6a1 1 0 0 1-1-1v-2H4z',
  grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  'file-text': 'M7 2h7l4 4v16H7z M11 2v5h5 M9 12h6 M9 16h6',
  leaf: 'M12 3C7 3 4 7 4 11c0 3.5 2.2 5.6 4.4 6.6L12 21l3.6-3.4C17.8 16.6 20 14.5 20 11c0-4-3-8-8-8z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M2 12h3 M19 12h3',
  bell: 'M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3z M10 20a2 2 0 0 0 4 0',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  edit: 'M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 15H6L5 6 M10 11v6 M14 11v6',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 18 18 6 M6 6l12 12',
  repeat: 'M17 2l4 4-4 4 M21 6H9a4 4 0 0 0-4 4 M7 22l-4-4 4-4 M3 18h12a4 4 0 0 0 4-4',
  cart: 'M3 3h2l2.2 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6 M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z M17 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  car: 'M3 13l1.6-4.8A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.2L21 13 M3 13v4h2 M19 13v4h2 M5.5 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M18.5 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M3 13h18',
  play: 'M9 7v10l8-5z',
  book: 'M4 4.5h8a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4z M20 4.5h-8a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h8z',
  home2: 'M3 12l9-9 9 9M5 10v10h14V10',
  filter: 'M3 4h18v2l-7 8v6l-4-2v-4L3 6z',
};

const CATEGORY_ICONS: Record<string, string> = {
  Alimentación: 'cart',
  Transporte: 'car',
  Entretenimiento: 'play',
  Educación: 'book',
  'Vivienda y Servicios': 'home2',
  Servicios: 'receipt',
  Salud: 'plus',
  Otros: 'grid',
};

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent, AppHeaderComponent, AppBudgetSummaryComponent],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css',
})
export class ExpensesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly financeService = inject(FinanceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);
  private readonly savingsService = inject(SavingsService);
  private readonly currencyService = inject(CurrencyService);

  get currentUser() {
    return this.authService.currentUser();
  }

  get unreadNotificationCount(): number {
    return this.notificationService.unreadCount();
  }

  readonly ICON_PATHS = ICON_PATHS;

  /* Layout */
  sidebarCollapsed = false;
  isMobile = window.innerWidth < 900;
  userMenuOpen = false;
  readonly defaultAvatar = 'assets/user-avatar-hombre.png';

  menuItems = [
    { label: 'Dashboard', icon: 'home', route: 'dashboard' },
    { label: 'Gastos', icon: 'receipt', route: 'gastos' },
    { label: 'Ingresos', icon: 'trending-up', route: 'ingresos' },
    { label: 'Presupuestos', icon: 'piggy-bank', route: 'presupuestos' },
    { label: 'Categorías', icon: 'grid', route: 'categorias' },
    { label: 'Reportes', icon: 'file-text', route: 'reportes' },
    { label: 'Ahorro', icon: 'leaf', route: 'ahorro' },
    { label: 'Configuración', icon: 'settings', route: 'configuracion' },
  ];
  activeRoute = 'gastos';

  get currentDateLabel(): string {
    const currentDate = new Date();
    const month = currentDate.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${currentDate.getDate()} de ${capitalizedMonth} de ${currentDate.getFullYear()}`;
  }

  /* Datos */
  expenses: Expense[] = [];
  incomes: Income[] = [];
  categories: IncomeCategory[] = [];
  visibleExpenses: Expense[] = [];
  loading = false;
  loadingError = '';
  saving = false;
  deleting = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  /* Filtros */
  searchTerm = '';
  filterCategoryId = '';
  filterDateFrom = '';
  filterDateTo = '';
  filterMinAmount: number | null = null;
  filterMaxAmount: number | null = null;

  /* Modales */
  showModal = false;
  showSavingsWithdrawalPrompt = false;
  isEditing = false;
  formError = '';
  editingExpenseId: string | null = null;
  showDeleteModal = false;
  deletingExpense: Expense | null = null;
  pendingExpenseAmount: number | null = null;

  form = {
    category_id: '',
    amount: null as number | null,
    description: '',
    expense_date: '',
    is_recurring: false,
    notes: '',
  };

  /* Tarjetas Resumen */
  summaryCards: SummaryCard[] = [
    {
      title: 'Total Gastos',
      amount: 0,
      changePercent: 0,
      colorLine: 'red',
      iconSrc: 'assets/gastos-resumen.png',
    },
    {
      title: 'Balance Actual',
      amount: 0,
      changePercent: 0,
      colorLine: 'blue',
      iconSrc: 'assets/icon-balance.png',
    },
    {
      title: 'Total Ingresos',
      amount: 0,
      changePercent: 0,
      colorLine: 'green',
      iconSrc: 'assets/ingresos-resumen.png',
    },
    {
      title: 'Presupuesto Restante',
      amount: 0,
      changePercent: 0,
      colorLine: 'blue',
      iconSrc: 'assets/icon-ahorro-resumen.png',
    },
  ];

  /* Gráfica de línea */
  rangeMode: RangeMode = 'Mes';
  rangeOptions: RangeMode[] = ['Semana', 'Mes', 'Año'];
  chartData: ChartPoint[] = [];
  readonly chartWidth = 540;
  readonly chartHeight = 210;
  readonly padLeft = 46;
  readonly padRight = 16;
  readonly padTop = 20;
  readonly padBottom = 26;
  gastosPath = '';
  yAxisTicks: { value: number; y: number }[] = [];
  xAxisLabels: { label: string; x: number }[] = [];
  pointPositions: ChartPointPosition[] = [];

  /* Gráfica de dona */
  donutSlices: DonutSlice[] = [];
  donutTotal = 0;
  private readonly donutRadius = 70;
  private readonly donutCircumference = 2 * Math.PI * this.donutRadius;

  /* Presupuesto */
  budgetTarget = 10000;

  get today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private get availableBalance(): number {
    const totalIncomes = this.incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const currentExpense = this.isEditing && this.editingExpenseId
      ? this.expenses.find((expense) => expense.id === this.editingExpenseId)?.amount ?? 0
      : 0;
    return totalIncomes - totalExpenses - this.savingsService.totalSavings() + currentExpense;
  }

  private get availableBudget(): number {
    const totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const currentExpense = this.isEditing && this.editingExpenseId
      ? this.expenses.find((expense) => expense.id === this.editingExpenseId)?.amount ?? 0
      : 0;
    return this.budgetTarget - totalExpenses + currentExpense;
  }
  get budgetPercent(): number {
    if (this.budgetTarget <= 0) return 0;
    return Math.min(100, Math.round((this.donutTotal / this.budgetTarget) * 100));
  }

  ngOnInit(): void {
    const savedBudget = localStorage.getItem('jax_monthly_budget');
    if (savedBudget) {
      const parsed = parseFloat(savedBudget);
      if (!isNaN(parsed) && parsed > 0) this.budgetTarget = parsed;
    }

    this.loadData();
    this.notificationService.refresh$.subscribe(() => this.applyCalculations());
    this.financeService.getIncomeCategories('expense').subscribe({
      next: (cats) => (this.categories = cats),
      error: () => (this.categories = []),
    });
    this.route.queryParams.subscribe((params) => {
      const search = params['search'] || params['q'] || params['searchTerm'];
      if (search) {
        this.searchTerm = search;
        this.applyFilters();
        this.scrollToFirstMatch(search);
      }
    });
  }

  loadData(): void {
    this.loading = true;
    this.loadingError = '';

    this.financeService.getExpenses().subscribe({
      next: (res) => {
        this.expenses = res.data.map((e) => ({
          ...e,
          amount: Number(e.amount) || 0,
        }));
        this.applyFilters();
        this.applyCalculations();
        this.loading = false;
        if (this.searchTerm) {
          this.scrollToFirstMatch(this.searchTerm);
        }
      },
      error: (err) => {
        console.error('Error al cargar gastos:', err);
        this.expenses = [];
        this.visibleExpenses = [];
        this.loadingError = 'No se pudieron cargar los gastos del servidor.';
        this.loading = false;
      },
    });

    this.financeService.getIncomes().subscribe({
      next: (res) => {
        this.incomes = res.data.map((i) => ({
          ...i,
          amount: Number(i.amount) || 0,
        }));
        this.applyCalculations();
      },
      error: () => (this.incomes = []),
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.visibleExpenses = this.expenses.filter((e) => {
      // Texto
      if (term) {
        const matchesDesc = (e.description || '').toLowerCase().includes(term);
        const matchesCat = (e.category_name || '').toLowerCase().includes(term);
        const matchesNotes = (e.notes || '').toLowerCase().includes(term);
        if (!matchesDesc && !matchesCat && !matchesNotes) return false;
      }

      // Categoría
      if (this.filterCategoryId && e.category_id !== this.filterCategoryId) {
        return false;
      }

      // Rango de fechas
      if (this.filterDateFrom && e.expense_date < this.filterDateFrom) {
        return false;
      }
      if (this.filterDateTo && e.expense_date > this.filterDateTo) {
        return false;
      }

      // Rango de montos
      if (this.filterMinAmount !== null && e.amount < this.filterMinAmount) {
        return false;
      }
      if (this.filterMaxAmount !== null && e.amount > this.filterMaxAmount) {
        return false;
      }

      return true;
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterCategoryId = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterMinAmount = null;
    this.filterMaxAmount = null;
    this.applyFilters();
  }

  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
    if (term.trim()) {
      this.scrollToFirstMatch(term);
    }
  }

  scrollToFirstMatch(term?: string): void {
    setTimeout(() => {
      const target = document.querySelector('.incomes-table tbody tr:not(.empty-state)');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (target as HTMLElement).classList.add('search-highlight');
        setTimeout(() => (target as HTMLElement).classList.remove('search-highlight'), 2500);
      }
    }, 200);
  }

  private applyCalculations(): void {
    const totalExpenses = this.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncomes = this.incomes.reduce((sum, i) => sum + i.amount, 0);
    const balance = totalIncomes - totalExpenses - this.savingsService.totalSavings();
    const remainingBudget = Math.max(0, this.budgetTarget - totalExpenses - this.savingsService.totalSavings());

    this.summaryCards[0].amount = totalExpenses;
    this.summaryCards[1].amount = balance;
    this.summaryCards[2].amount = totalIncomes;
    this.summaryCards[3].amount = remainingBudget;

    this.buildLineChartData();
    this.renderLineChart();
    this.buildDonutChart();
  }

  setRangeMode(mode: RangeMode): void {
    this.rangeMode = mode;
    this.buildLineChartData();
    this.renderLineChart();
  }

  private buildLineChartData(): void {
    const now = new Date();
    if (this.rangeMode === 'Semana') {
      this.chartData = Array.from({ length: 7 }, (_, index) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - index));
        const key = d.toISOString().slice(0, 10);
        const dayExpenses = this.expenses
          .filter((e) => (e.expense_date || '').slice(0, 10) === key)
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          label: d.toLocaleDateString('es-GT', { weekday: 'short' }),
          gastos: dayExpenses,
        };
      });
    } else if (this.rangeMode === 'Año') {
      this.chartData = Array.from({ length: 12 }, (_, index) => {
        const monthStr = String(index + 1).padStart(2, '0');
        const key = `${now.getFullYear()}-${monthStr}`;
        const monthExpenses = this.expenses
          .filter((e) => (e.expense_date || '').startsWith(key))
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          label: new Date(now.getFullYear(), index, 1).toLocaleDateString('es-GT', { month: 'short' }),
          gastos: monthExpenses,
        };
      });
    } else {
      // Mes: 4 semanas del mes actual
      const year = now.getFullYear();
      const month = now.getMonth();
      const weeks = [
        { label: 'Sem 1', start: 1, end: 7 },
        { label: 'Sem 2', start: 8, end: 14 },
        { label: 'Sem 3', start: 15, end: 21 },
        { label: 'Sem 4', start: 22, end: 31 },
      ];
      this.chartData = weeks.map((w) => {
        const total = this.expenses
          .filter((e) => {
            if (!e.expense_date) return false;
            const ed = new Date(e.expense_date);
            return (
              ed.getFullYear() === year &&
              ed.getMonth() === month &&
              ed.getDate() >= w.start &&
              ed.getDate() <= w.end
            );
          })
          .reduce((sum, e) => sum + e.amount, 0);
        return { label: w.label, gastos: total };
      });
    }
  }

  private renderLineChart(): void {
    if (!this.chartData.length) return;
    const w = this.chartWidth - this.padLeft - this.padRight;
    const h = this.chartHeight - this.padTop - this.padBottom;
    const maxVal = Math.max(...this.chartData.map((d) => d.gastos), 100);
    const niceMax = Math.ceil(maxVal / 500) * 500 || 500;

    const stepX = this.chartData.length > 1 ? w / (this.chartData.length - 1) : 0;
    const scaleY = (v: number) => this.padTop + h - (v / niceMax) * h;
    const scaleX = (i: number) => this.padLeft + i * stepX;

    this.gastosPath = this.chartData
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(p.gastos).toFixed(1)}`)
      .join(' ');

    this.pointPositions = this.chartData.map((p, i) => ({
      x: scaleX(i),
      y: scaleY(p.gastos),
      value: p.gastos,
      label: p.label,
    }));

    this.yAxisTicks = [0, Math.round(niceMax / 2), niceMax].map((v) => ({
      value: v,
      y: scaleY(v),
    }));

    this.xAxisLabels = this.chartData.map((p, i) => ({
      label: p.label,
      x: scaleX(i),
    }));
  }

  private buildDonutChart(): void {
    const map = new Map<string, { amount: number; color: string }>();
    this.expenses.forEach((e) => {
      const name = e.category_name || 'Sin categoría';
      const color = e.category_color || '#e63946';
      const cur = map.get(name) ?? { amount: 0, color };
      map.set(name, { amount: cur.amount + e.amount, color: cur.color });
    });

    const total = [...map.values()].reduce((sum, v) => sum + v.amount, 0);
    this.donutTotal = total;

    let cumulative = 0;
    this.donutSlices = [...map.entries()].map(([name, data]) => {
      const percent = total > 0 ? Math.round((data.amount / total) * 100) : 0;
      const dash = total > 0 ? (data.amount / total) * this.donutCircumference : 0;
      const slice: DonutSlice = {
        name,
        color: data.color,
        amount: data.amount,
        percent,
        dashArray: `${dash} ${this.donutCircumference - dash}`,
        dashOffset: -cumulative,
      };
      cumulative += dash;
      return slice;
    });
  }

  /* Modal CRUD */
  openNewModal(): void {
    this.isEditing = false;
    this.editingExpenseId = null;
    this.formError = '';
    this.form = {
      category_id: this.categories[0]?.id || '',
      amount: null,
      description: '',
      expense_date: new Date().toISOString().slice(0, 10),
      is_recurring: false,
      notes: '',
    };
    this.showModal = true;
  }

  openEditModal(expense: Expense): void {
    this.isEditing = true;
    this.editingExpenseId = expense.id;
    this.formError = '';
    this.form = {
      category_id: expense.category_id,
      amount: expense.amount,
      description: expense.description,
      expense_date: (expense.expense_date || '').slice(0, 10),
      is_recurring: expense.is_recurring,
      notes: expense.notes || '',
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formError = '';
  }

  submit(): void {
    if (!this.form.category_id || !this.form.amount || this.form.amount <= 0 || !this.form.expense_date || !this.form.description.trim()) {
      this.formError = 'Por favor completa la categoría, descripción, monto válido (>0) y fecha.';
      return;
    }

    if (this.form.expense_date > this.today) {
      this.formError = 'La fecha del gasto no puede ser futura.';
      return;
    }

    const requestedAmount = Number(this.form.amount);
    const availableBalance = this.availableBalance;
    if (requestedAmount > this.availableBudget) {
      this.formError = 'Fondos insuficientes, no se puede agregar este gasto';
      return;
    }
    if (requestedAmount > availableBalance) {
      const shortage = requestedAmount - Math.max(0, availableBalance);
      if (this.savingsService.totalSavings() > 0 && shortage > 0) {
        this.pendingExpenseAmount = shortage;
        this.showSavingsWithdrawalPrompt = true;
      } else {
        this.formError = 'Fondos insuficientes, no se puede agregar este gasto';
      }
      return;
    }

    this.saveExpense();
  }

  confirmSavingsWithdrawal(): void {
    if (!this.pendingExpenseAmount || this.pendingExpenseAmount > this.savingsService.totalSavings()) {
      this.formError = 'Fondos insuficientes, no se puede agregar este gasto';
      this.showSavingsWithdrawalPrompt = false;
      return;
    }

    const withdrawalCompleted = this.savingsService.withdrawFromSavings(
      this.pendingExpenseAmount,
      'Fondos retirados para registrar un gasto'
    );
    if (withdrawalCompleted) {
      this.showSavingsWithdrawalPrompt = false;
      this.pendingExpenseAmount = null;
      this.saveExpense();
    }
  }

  cancelSavingsWithdrawal(): void {
    this.showSavingsWithdrawalPrompt = false;
    this.pendingExpenseAmount = null;
    this.formError = 'Fondos insuficientes, no se puede agregar este gasto';
  }

  onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.value) {
      const parts = input.value.split('.');
      if (parts.length > 1 && parts[1].length > 2) {
        input.value = `${parts[0]}.${parts[1].slice(0, 2)}`;
        this.form.amount = parseFloat(input.value);
      }
    }
  }

  onAmountBlur(): void {
    if (this.form.amount !== null && this.form.amount !== undefined && !isNaN(this.form.amount)) {
      this.form.amount = Number(Number(this.form.amount).toFixed(2));
    }
  }

  private saveExpense(): void {

    this.saving = true;
    this.formError = '';

    const payload = {
      category_id: this.form.category_id,
      amount: Number(this.form.amount),
      description: this.form.description.trim(),
      expense_date: this.form.expense_date,
      is_recurring: this.form.is_recurring,
      notes: this.form.notes ? this.form.notes.trim() : null,
    };

    const req$ = this.isEditing && this.editingExpenseId
      ? this.financeService.updateExpense(this.editingExpenseId, payload)
      : this.financeService.createExpense(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.showToast(this.isEditing ? 'Gasto actualizado con éxito.' : 'Gasto registrado con éxito.', 'success');
        this.notificationService.notifyDataChanged();
        this.loadData();
      },
      error: (err) => {
        console.error('Error al guardar gasto:', err);
        this.saving = false;
        this.formError = err?.error?.message || err?.error?.error || 'No se pudo guardar el gasto.';
      },
    });
  }

  openDeleteModal(expense: Expense): void {
    this.deletingExpense = expense;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deletingExpense = null;
  }

  confirmDelete(): void {
    if (!this.deletingExpense) return;
    this.deleting = true;

    this.financeService.deleteExpense(this.deletingExpense.id).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.deletingExpense = null;
        this.showToast('Gasto eliminado exitosamente.', 'success');
        this.notificationService.notifyDataChanged();
        this.loadData();
      },
      error: (err) => {
        console.error('Error al eliminar gasto:', err);
        this.deleting = false;
        this.showToast('Error al eliminar el gasto.', 'error');
      },
    });
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    window.setTimeout(() => (this.toastMessage = ''), 3500);
  }

  /* Utils & Layout */
  formatCurrency(val: number): string {
    return this.currencyService.format(val);
  }

  formatDate(val: string): string {
    if (!val) return '—';
    const [y, m, d] = val.slice(0, 10).split('-');
    if (!y || !m || !d) return val;
    return `${d}/${m}/${y}`;
  }

  getIconPath(name: string): string {
    return ICON_PATHS[name] ?? '';
  }

  getCategoryIcon(name: string): string {
    const key = CATEGORY_ICONS[name] ?? 'grid';
    return ICON_PATHS[key] ?? ICON_PATHS['receipt'];
  }

  onBellClick(): void {
    this.notificationService.markAllAsRead().subscribe({ next: () => undefined });
    this.router.navigate(['/dashboard'], { fragment: 'notificationsSection' });
  }

  navigateTo(item: { label: string; route: string }): void {
    this.activeRoute = item.route;
    this.router.navigate(['/' + item.route]);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  logout(): void {
    this.authService.logout();
  }

  onAvatarError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.src.endsWith(this.defaultAvatar)) return;
    image.src = this.defaultAvatar;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth < 900;
    if (this.isMobile) this.sidebarCollapsed = true;
  }
}
