import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardMetrics, FinanceService, Income, Expense } from '../../core/services/finance.service';
import { NotificationService } from '../../core/services/notification.service';
import { SavingsService } from '../../core/services/savings.service';
import { AppSidebarComponent } from '../../core/components/app-sidebar/app-sidebar.component';
import { AppHeaderComponent } from '../../core/components/app-header/app-header.component';
import { CurrencyService } from '../../core/services/currency.service';
import { AppBudgetSummaryComponent } from '../../core/components/app-budget-summary/app-budget-summary.component';

/* ---------- Modelos ---------- */

interface SummaryCard {
  title: string;
  amount: number;
  changePercent: number;
  changeType: 'up' | 'down' | 'neutral';
  icon: string;
  colorClass: string;
  sparklinePoints: string;
}

interface ChartPoint {
  label: string;
  ingresos: number;
  gastos: number;
}

interface CategorySlice {
  name: string;
  amount: number;
  percent: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface RecentExpense {
  description: string;
  category: string;
  date: string;
  method: string;
  status: 'Completado' | 'Pendiente' | 'Cancelado';
  amount: number;
  icon: string;
  iconBg: string;
}

interface BudgetItem {
  category: string;
  spent: number;
  total: number;
  percent: number;
  color: string;
  icon: string;
}

interface NotificationItem {
  id: string;
  message: string;
  time: string;
  type: 'success' | 'info' | 'warning';
  icon: string;
  is_read: boolean;
}

type RangeMode = 'Semana' | 'Mes' | 'Año';

/* ---------- Datasets mock por rango ---------- */

const DATASETS: Record<RangeMode, ChartPoint[]> = {
  Semana: [
    { label: 'Lun', ingresos: 0, gastos: 0 },
    { label: 'Mar', ingresos: 0, gastos: 0 },
    { label: 'Mié', ingresos: 0, gastos: 0 },
    { label: 'Jue', ingresos: 0, gastos: 0 },
    { label: 'Vie', ingresos: 0, gastos: 0 },
    { label: 'Sáb', ingresos: 0, gastos: 0 },
    { label: 'Dom', ingresos: 0, gastos: 0 },
  ],
  Mes: [
    { label: '1 Ago', ingresos: 0, gastos: 0 },
    { label: '8 Ago', ingresos: 0, gastos: 0 },
    { label: '15 Ago', ingresos: 0, gastos: 0 },
    { label: '22 Ago', ingresos: 0, gastos: 0 },
    { label: '29 Ago', ingresos: 0, gastos: 0 },
  ],
  Año: [
    { label: 'Ene', ingresos: 0, gastos: 0 },
    { label: 'Feb', ingresos: 0, gastos: 0 },
    { label: 'Mar', ingresos: 0, gastos: 0 },
    { label: 'Abr', ingresos: 0, gastos: 0 },
    { label: 'May', ingresos: 0, gastos: 0 },
    { label: 'Jun', ingresos: 0, gastos: 0 },
    { label: 'Jul', ingresos: 0, gastos: 0 },
    { label: 'Ago', ingresos: 0, gastos: 0 },
  ],
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent, AppHeaderComponent, AppBudgetSummaryComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly financeService = inject(FinanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly savingsService = inject(SavingsService);
  private readonly currencyService = inject(CurrencyService);

  get currentUser() {
    return this.authService.currentUser();
  }

  get unreadNotificationCount(): number {
    return this.notificationService.unreadCount();
  }

  constructor(private router: Router) {}

  /* Estado de layout */
  sidebarCollapsed = false;
  isMobile = window.innerWidth < 900;
  userMenuOpen = false;
  searchTerm = '';
  selectedDashboardDate = '';
  readonly defaultAvatar = 'assets/user-avatar-hombre.png';

  get currentDateLabel(): string {
    const currentDate = new Date();
    const month = currentDate.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${currentDate.getDate()} de ${capitalizedMonth} de ${currentDate.getFullYear()}`;
  }

  /* Estado de gráfica principal */
  rangeMode: RangeMode = 'Mes';
  rangeOptions: RangeMode[] = ['Semana', 'Mes', 'Año'];
  chartData: ChartPoint[] = DATASETS['Mes'];

  readonly chartWidth = 560;
  readonly chartHeight = 210;
  private readonly padLeft = 46;
  private readonly padRight = 16;
  private readonly padTop = 20;
  private readonly padBottom = 26;

  ingresosPath = '';
  ingresosArea = '';
  gastosPath = '';
  gastosArea = '';
  yAxisTicks: { value: number; y: number }[] = [];
  xAxisLabels: { label: string; x: number }[] = [];
  ingresosLastPoint = { x: 0, y: 0 };
  gastosLastPoint = { x: 0, y: 0 };
  ingresosPoints: { x: number; y: number; value: number; label: string }[] = [];
  gastosPoints: { x: number; y: number; value: number; label: string }[] = [];

  /* Tarjetas resumen */
  summaryCards: SummaryCard[] = [
    {
      title: 'Balance total',
      amount: 0,
      changePercent: 0,
      changeType: 'neutral',
      icon: 'wallet',
      colorClass: 'blue',
      sparklinePoints: this.buildSparkline([0, 0, 0, 0, 0, 0, 0, 0]),
    },
    {
      title: 'Ingresos',
      amount: 0,
      changePercent: 0,
      changeType: 'neutral',
      icon: 'arrow-down-circle',
      colorClass: 'green',
      sparklinePoints: this.buildSparkline([0, 0, 0, 0, 0, 0, 0, 0]),
    },
    {
      title: 'Gastos',
      amount: 0,
      changePercent: 0,
      changeType: 'neutral',
      icon: 'arrow-up-circle',
      colorClass: 'blue-light',
      sparklinePoints: this.buildSparkline([0, 0, 0, 0, 0, 0, 0, 0]),
    },
    {
      title: 'Ahorro',
      amount: 0,
      changePercent: 0,
      changeType: 'neutral',
      icon: 'piggy-bank',
      colorClass: 'green-light',
      sparklinePoints: this.buildSparkline([0, 0, 0, 0, 0, 0, 0, 0]),
    },
  ];

  /* Categoría de gastos (dona) */
  private rawCategories: { name: string; amount: number; color: string }[] = [];
  categories: CategorySlice[] = [];
  totalGastos = 0;
  private readonly donutRadius = 70;
  private readonly donutCircumference = 2 * Math.PI * this.donutRadius;

  /* Gastos recientes */
  allExpenses: RecentExpense[] = [];
  /* Presupuesto */
  budgets: BudgetItem[] = [];
  monthlyBudgetLimit = 10000;

  get totalSpentThisMonth(): number {
    const now = new Date();
    return this.expenses
      .filter((expense) => {
        const date = new Date(expense.expense_date);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }

  get budgetPercent(): number {
    if (this.monthlyBudgetLimit <= 0) return 0;
    return Math.min(100, Math.round((this.totalSpentThisMonth / this.monthlyBudgetLimit) * 100));
  }

  get budgetStatus(): string {
    if (this.budgetPercent >= 100) return 'Has alcanzado o superado el presupuesto establecido.';
    if (this.budgetPercent >= 85) return 'Atención: Estás cerca de alcanzar el límite mensual.';
    return 'Tu ritmo de gasto está dentro del margen planificado.';
  }

  get selectedIncomeTotal(): number {
    return this.chartData.reduce((sum, point) => sum + point.ingresos, 0);
  }

  get selectedExpenseTotal(): number {
    return this.chartData.reduce((sum, point) => sum + point.gastos, 0);
  }

  /* Notificaciones */
  notifications: NotificationItem[] = [];
  visibleExpenses: RecentExpense[] = this.allExpenses;
  private incomes: Income[] = [];
  private expenses: Expense[] = [];

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
  activeRoute = 'dashboard';

  ngOnInit(): void {
    const savedBudget = localStorage.getItem('jax_monthly_budget');
    if (savedBudget) {
      const parsed = Number(savedBudget);
      if (Number.isFinite(parsed) && parsed > 0) this.monthlyBudgetLimit = parsed;
    }
    this.loadDashboardData();
    this.loadNotifications();
    this.notificationService.refresh$.subscribe(() => {
      this.loadDashboardData();
      this.loadNotifications();
    });
  }

  private loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (items) => {
        this.notifications = items.map((item) => ({
          id: item.id,
          message: item.message,
          time: new Date(item.created_at).toLocaleString('es-GT'),
          type: item.type,
          icon: item.icon,
          is_read: item.is_read,
        }));
      },
      error: () => { this.notifications = []; },
    });
  }

  private loadDashboardData(): void {
    this.financeService.getDashboardMetrics().subscribe({
      next: (response) => this.applyMetricChanges(response.data),
    });
    this.financeService.getIncomes().subscribe({
      next: (response) => {
        this.incomes = response.data.map((income) => ({ ...income, amount: Number(income.amount) || 0 }));
        this.refreshDashboard();
      },
    });
    this.financeService.getExpenses().subscribe({
      next: (response) => {
        this.expenses = response.data.map((expense) => ({ ...expense, amount: Number(expense.amount) || 0 }));
        this.allExpenses = this.expenses.slice(0, 6).map((expense) => ({
          description: expense.description,
          category: expense.category_name,
          date: expense.expense_date,
          method: expense.is_recurring ? 'Automático' : 'Manual',
          status: 'Completado',
          amount: expense.amount,
          icon: 'receipt',
          iconBg: expense.category_color || '#dbeafe',
        }));
        this.visibleExpenses = this.allExpenses;
        this.refreshDashboard();
      },
    });
  }

  private applyMetricChanges(metrics: DashboardMetrics): void {
    this.summaryCards[0].changePercent = metrics.balance.percentage;
    this.summaryCards[1].changePercent = metrics.incomes.percentage;
    this.summaryCards[2].changePercent = metrics.expenses.percentage;
    this.summaryCards[3].changePercent = metrics.savings.percentage;
  }

  private refreshDashboard(): void {
    const totalIncome = this.incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpense = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalSavings = this.savingsService.totalSavings();
    this.summaryCards[0].amount = totalIncome - totalExpense - totalSavings;
    this.summaryCards[1].amount = totalIncome;
    this.summaryCards[2].amount = totalExpense;
    this.summaryCards[3].amount = totalSavings;
    this.budgets = [];
    this.rawCategories = [];
    const categoryTotals = new Map<string, { amount: number; color: string }>();
    this.expenses.forEach((expense) => {
      const name = expense.category_name || 'Sin categoría';
      const current = categoryTotals.get(name) ?? { amount: 0, color: expense.category_color || '#9ca3af' };
      categoryTotals.set(name, { amount: current.amount + expense.amount, color: current.color });
    });
    this.rawCategories = [...categoryTotals.entries()].map(([name, value]) => ({ name, ...value }));
    this.buildCategoryDonut();
    this.chartData = this.buildRealChartData();
    this.buildLineChart();
  }

  private buildRealChartData(): ChartPoint[] {
    const now = new Date();
    if (this.rangeMode === 'Año') {
      return Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const key = `${now.getFullYear()}-${String(month).padStart(2, '0')}`;
        return {
          label: new Date(now.getFullYear(), index, 1).toLocaleDateString('es-GT', { month: 'short' }),
          ingresos: this.incomes.filter((income) => income.income_date.startsWith(key)).reduce((sum, income) => sum + income.amount, 0),
          gastos: this.expenses.filter((expense) => expense.expense_date.startsWith(key)).reduce((sum, expense) => sum + expense.amount, 0),
        };
      });
    }
    if (this.rangeMode === 'Semana') {
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - index));
        const key = date.toISOString().slice(0, 10);
        return {
          label: date.toLocaleDateString('es-GT', { weekday: 'short' }),
          ingresos: this.incomes.filter((income) => income.income_date.startsWith(key)).reduce((sum, income) => sum + income.amount, 0),
          gastos: this.expenses.filter((expense) => expense.expense_date.startsWith(key)).reduce((sum, expense) => sum + expense.amount, 0),
        };
      });
    }
    return Array.from({ length: 5 }, (_, index) => {
      const start = index * 7 + 1;
      const end = Math.min(start + 6, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
      const inRange = (date: string) => {
        const parsed = new Date(date);
        return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth() && parsed.getDate() >= start && parsed.getDate() <= end;
      };
      return {
        label: `${start} ${now.toLocaleDateString('es-GT', { month: 'short' })}`,
        ingresos: this.incomes.filter((income) => inRange(income.income_date)).reduce((sum, income) => sum + income.amount, 0),
        gastos: this.expenses.filter((expense) => inRange(expense.expense_date)).reduce((sum, expense) => sum + expense.amount, 0),
      };
    });
  }

  get isFemale(): boolean {
    return this.currentUser?.gender === 'female';
  }

  onAvatarError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.src.endsWith(this.defaultAvatar)) return;
    image.src = this.defaultAvatar;
  }

  getNotificationBadge(): string {
    const unreadCount = this.notificationService.unreadCount();
    return unreadCount > 99 ? '+99' : String(unreadCount);
  }

  onBellClick(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((notification) => ({ ...notification, is_read: true }));
      },
    });
    document.getElementById('notificationsSection')?.scrollIntoView({ behavior: 'smooth' });
  }

  formatYAxisValue(value: number): string {
    return this.currencyService.format(value);
  }

  getChangeClass(card: SummaryCard): string {
    if (card.changePercent === 0) {
      return 'neutral';
    }

    const isPositive = card.title === 'Gastos'
      ? card.changePercent < 0
      : card.changePercent > 0;
    return isPositive ? 'up' : 'down';
  }

  getMetricChangeClass(card: SummaryCard): string {
    if (card.changePercent === 0) return 'text-gray-400';
    const favorable = card.title === 'Gastos' ? card.changePercent < 0 : card.changePercent > 0;
    return favorable ? 'text-green-500' : 'text-red-500';
  }

  getMetricChangeArrow(card: SummaryCard): string {
    if (card.changePercent === 0) return '';
    return card.changePercent > 0 ? '↑' : '↓';
  }

  getChangeIcon(card: SummaryCard): string {
    if (card.changePercent === 0) {
      return '';
    }

    return card.changePercent > 0 ? 'chevron-up' : 'chevron-down';
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth < 900;
    if (this.isMobile) {
      this.sidebarCollapsed = true;
    }
  }

  /* ---------- Interacciones ---------- */

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  setActiveRoute(route: string): void {
    this.activeRoute = route;
    this.router.navigate(['/' + route]);
  }


  setRangeMode(mode: RangeMode): void {
    this.rangeMode = mode;
    this.chartData = this.buildRealChartData();
    this.buildLineChart();
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  onDashboardDateChange(date: string): void {
    this.selectedDashboardDate = date;
    const mappedExpenses: RecentExpense[] = this.expenses.map((expense) => ({
      description: expense.description || 'Sin descripción',
      category: expense.category_name || 'General',
      date: expense.expense_date || '',
      method: expense.is_recurring ? 'Automático' : 'Manual',
      status: 'Completado',
      amount: expense.amount,
      icon: 'receipt',
      iconBg: expense.category_color || '#dbeafe',
    }));

    if (!date) {
      this.visibleExpenses = mappedExpenses.slice(0, 6);
      return;
    }

    const filtered = mappedExpenses.filter((e) => e.date === date);
    this.visibleExpenses = filtered.length > 0 ? filtered : mappedExpenses.slice(0, 6);
  }

  onSearchChange(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const mappedExpenses: RecentExpense[] = this.expenses.map((expense) => ({
      description: expense.description || 'Sin descripción',
      category: expense.category_name || 'General',
      date: expense.expense_date || '',
      method: expense.is_recurring ? 'Automático' : 'Manual',
      status: 'Completado',
      amount: expense.amount,
      icon: 'receipt',
      iconBg: expense.category_color || '#dbeafe',
    }));

    if (!term) {
      this.visibleExpenses = mappedExpenses.slice(0, 6);
    } else {
      this.visibleExpenses = mappedExpenses.filter(
        (e) =>
          (e.description && e.description.toLowerCase().includes(term)) ||
          (e.category && e.category.toLowerCase().includes(term))
      );
    }
  }

  onGlobalSearchSubmit(term?: string): void {
    const q = (term ?? this.searchTerm).trim();
    if (!q) return;

    const lowerQ = q.toLowerCase();

    // Comprobar si coincide con categorías
    const isCategory =
      this.categories.some((c) => c.name.toLowerCase().includes(lowerQ)) ||
      lowerQ.includes('categor') ||
      lowerQ.includes('servicio') ||
      lowerQ.includes('comida') ||
      lowerQ.includes('transporte');

    // Comprobar si coincide con ingresos
    const isIncome =
      this.incomes.some(
        (i) =>
          (i.description && i.description.toLowerCase().includes(lowerQ)) ||
          (i.category_name && i.category_name.toLowerCase().includes(lowerQ)) ||
          (i.notes && i.notes.toLowerCase().includes(lowerQ))
      ) ||
      lowerQ.includes('ingreso') ||
      lowerQ.includes('salario') ||
      lowerQ.includes('sueldo');

    if (isCategory) {
      void this.router.navigate(['/categorias'], { queryParams: { search: q } });
    } else if (isIncome) {
      void this.router.navigate(['/ingresos'], { queryParams: { search: q } });
    } else {
      void this.router.navigate(['/gastos'], { queryParams: { search: q } });
    }
  }

  logout(): void {
    this.authService.logout();
  }

  formatCurrency(value: number): string {
    return this.currencyService.format(value);
  }

  /* ---------- Construcción de gráficas ---------- */

  private buildSparkline(values: number[]): string {
    const w = 100;
    const h = 30;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const step = w / (values.length - 1);
    return values
      .map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / range) * (h - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  private buildCategoryDonut(): void {
    this.totalGastos = this.rawCategories.reduce((s, c) => s + c.amount, 0);
    if (this.totalGastos === 0) {
      this.categories = this.rawCategories.map((c) => ({
        name: c.name,
        amount: 0,
        percent: 0,
        color: c.color,
        dashArray: `0 ${this.donutCircumference}`,
        dashOffset: 0,
      }));
      return;
    }
    let cumulative = 0;
    this.categories = this.rawCategories.map((c) => {
      const percent = Math.round((c.amount / this.totalGastos) * 100);
      const dash = (c.amount / this.totalGastos) * this.donutCircumference;
      const slice: CategorySlice = {
        name: c.name,
        amount: c.amount,
        percent,
        color: c.color,
        dashArray: `${dash} ${this.donutCircumference - dash}`,
        dashOffset: -cumulative,
      };
      cumulative += dash;
      return slice;
    });
  }

  private buildLineChart(): void {
    const w = this.chartWidth - this.padLeft - this.padRight;
    const h = this.chartHeight - this.padTop - this.padBottom;
    const maxValue = Math.max(...this.chartData.flatMap((point) => [point.ingresos, point.gastos]), 1);
    const niceMax = Math.ceil(maxValue / 1000) * 1000 || 1000;

    const stepX = this.chartData.length > 1 ? w / (this.chartData.length - 1) : 0;
    const scaleY = (v: number) => this.padTop + h - (v / niceMax) * h;
    const scaleX = (i: number) => this.padLeft + i * stepX;

    const toPath = (key: 'ingresos' | 'gastos') =>
      this.chartData
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(p[key]).toFixed(1)}`)
        .join(' ');

    const toArea = (key: 'ingresos' | 'gastos') => {
      const line = this.chartData
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(p[key]).toFixed(1)}`)
        .join(' ');
      const baseline = this.padTop + h;
      const lastX = scaleX(this.chartData.length - 1);
      return `${line} L ${lastX.toFixed(1)} ${baseline} L ${this.padLeft} ${baseline} Z`;
    };

    this.ingresosPath = toPath('ingresos');
    this.gastosPath = toPath('gastos');
    this.ingresosArea = toArea('ingresos');
    this.gastosArea = toArea('gastos');

    const last = this.chartData[this.chartData.length - 1];
    this.ingresosLastPoint = {
      x: scaleX(this.chartData.length - 1),
      y: scaleY(last.ingresos),
    };
    this.gastosLastPoint = {
      x: scaleX(this.chartData.length - 1),
      y: scaleY(last.gastos),
    };

    /* All point positions for dot markers */
    this.ingresosPoints = this.chartData.map((p, i) => ({
      x: scaleX(i), y: scaleY(p.ingresos), value: p.ingresos, label: p.label,
    }));
    this.gastosPoints = this.chartData.map((p, i) => ({
      x: scaleX(i), y: scaleY(p.gastos), value: p.gastos, label: p.label,
    }));

    this.yAxisTicks = [0, niceMax / 2, niceMax].map((v) => ({
      value: v,
      y: scaleY(v),
    }));

    const labelStep = this.chartData.length > 6 ? Math.ceil(this.chartData.length / 5) : 1;
    this.xAxisLabels = this.chartData
      .map((p, i) => ({ label: p.label, x: scaleX(i) }))
      .filter((_, i) => i % labelStep === 0 || i === this.chartData.length - 1);
  }

  /* ---------- Íconos (paths SVG reutilizables) ---------- */

  getIconPath(name: string): string {
    const icons: Record<string, string> = {
      home: 'M3 11.5 12 4l9 7.5 M5 10.5V20h5v-6h4v6h5v-9.5',
      receipt: 'M6 2h9l3 3v17H6z M9 8h6 M9 12h6 M9 16h4',
      'trending-up': 'M3 17l6-6 4 4 8-8 M15 6h6v6',
      'piggy-bank':
        'M4 12a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2h-1l-1 3h-3l-1-2H9l-1 2H6a1 1 0 0 1-1-1v-2H4z M8 9V7 M16.5 10h.01',
      grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
      'file-text': 'M7 2h7l4 4v16H7z M11 2v5h5 M9 12h6 M9 16h6',
      leaf: 'M12 3C7 3 4 7 4 11c0 3.5 2.2 5.6 4.4 6.6L12 21l3.6-3.4C17.8 16.6 20 14.5 20 11c0-4-3-8-8-8z M9 12c1-2 3-3 6-3',
      settings:
        'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M2 12h3 M19 12h3 M4.9 19.1l2.1-2.1 M17 7l2.1-2.1',
      search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M21 21l-4.3-4.3',
      calendar: 'M3 5h18v16H3z M16 2v6 M8 2v6 M3 10h18',
      bell: 'M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3z M10 20a2 2 0 0 0 4 0',
      wallet: 'M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M16.5 12h2.5 M3 9h18',
      'arrow-down-circle': 'M12 4v12 M7 11l5 5 5-5',
      'arrow-up-circle': 'M12 20V8 M7 13l5-5 5 5',
      'chevron-up': 'M6 15l6-6 6 6',
      'chevron-down': 'M6 9l6 6 6-6',
      play: 'M9 7v10l8-5z',
      cart: 'M3 3h2l2.2 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6 M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z M17 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
      car: 'M3 13l1.6-4.8A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.2L21 13 M3 13v4h2 M19 13v4h2 M5.5 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M18.5 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M3 13h18',
      plus: 'M12 5v14 M5 12h14',
      book: 'M4 4.5h8a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4z M20 4.5h-8a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h8z',
      alert: 'M12 3 2 20h20z M12 9.5v5 M12 17h.01',
      info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8h.01 M11 11.5h1v5.5h1',
      check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 12.5l2.5 2.5L16 9.5',
      user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 20.5a7.5 7.5 0 0 1 15 0',
      'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
      close: 'M6 18 18 6 M6 6l12 12',
      trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 15H6L5 6 M10 11v6 M14 11v6',
    };
    return icons[name] ?? '';
  }

  deleteNotification(notification: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter((item) => item.id !== notification.id);
        if (!notification.is_read) {
          this.notificationService.unreadCount.update((count) => Math.max(0, count - 1));
        }
      },
    });
  }

  getCategoryIcon(name: string): string {
    const icons: Record<string, string> = {
      Alimentación: 'cart',
      Transporte: 'car',
      Entretenimiento: 'play',
      Salud: 'plus',
      Educación: 'book',
      Servicios: 'receipt',
      Otros: 'grid',
    };
    return icons[name] ?? 'grid';
  }
}