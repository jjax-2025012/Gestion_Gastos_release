import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { AppSidebarComponent } from '../../core/components/app-sidebar/app-sidebar.component';
import { SavingsService } from '../../core/services/savings.service';
import { CurrencyService } from '../../core/services/currency.service';
import { AppHeaderComponent } from '../../core/components/app-header/app-header.component';
import { AuthService } from '../../core/services/auth.service';
import {
  FinanceService,
  Income,
  Expense,
} from '../../core/services/finance.service';

/* ----------------------- Modelos de la vista ----------------------- */

interface SummaryCard {
  title: string;
  amount: number;
  changePercent: number;
  colorLine: 'blue' | 'green';
  iconSrc: string;
}

interface ChartPoint {
  label: string;
  ingresos: number;
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

interface RecentIncome {
  id: string;
  description: string;
  source: string;
  date: string;
  method: string;
  status: string;
  amount: number;
}

type RangeMode = 'Semana' | 'Mes' | 'Año';

/* ----------------------- Datasets mock por rango ----------------------- */

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

/* Fuentes de ingreso esperadas en la leyenda de la dona */
const SOURCE_COLORS: Record<string, string> = {
  Salarios: '#22c55e',
  Ventas: '#2563eb',
  Consultorías: '#10b981',
  Rentas: '#8b5cf6',
  Intereses: '#f59e0b',
  Servicios: '#06b6d4',
  Otros: '#9ca3af',
};

const SOURCE_PALETTE = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#06B6D4', '#EF4444', '#9CA3AF'];

const ICON_PATHS: Record<string, string> = {
  bell: 'M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3z M10 20a2 2 0 0 0 4 0',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  close: 'M6 18 18 6 M6 6l12 12',
  'chevron-up': 'M6 15l6-6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  transfer: 'M17 2l4 4-4 4 M21 6H9a4 4 0 0 0-4 4 M7 22l-4-4 4-4 M3 18h12a4 4 0 0 0 4-4',
  check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 12.5l2.5 2.5L16 9.5',
  alert: 'M12 3 2 20h20z M12 9.5v5 M12 17h.01',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8h.01 M11 11.5h1v5.5h1',
    edit: 'M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
    trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 15H6L5 6 M10 11v6 M14 11v6',
};

@Component({
  selector: 'app-incomes',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent, AppHeaderComponent],
  templateUrl: './incomes.component.html',
  styleUrl: './incomes.component.css',
})
export class IncomesComponent implements OnInit {
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

  /* ---------------- Layout ---------------- */
  sidebarCollapsed = false;
  isMobile = window.innerWidth < 900;
  userMenuOpen = false;
  readonly defaultAvatar = 'assets/user-avatar-hombre.png';
  searchTerm: string = '';
  filterCategoryId: string = '';
  filterDateFrom = '';
  filterDateTo = '';
  filterMinAmount: number | null = null;
  filterMaxAmount: number | null = null;

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
  activeRoute = 'ingresos';

  get currentDateLabel(): string {
    const currentDate = new Date();
    const month = currentDate.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${currentDate.getDate()} de ${capitalizedMonth} de ${currentDate.getFullYear()}`;
  }

  onAvatarError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.src.endsWith(this.defaultAvatar)) return;
    image.src = this.defaultAvatar;
  }

  /* ---------------- Datos ---------------- */
  incomes: Income[] = [];
  expenses: Expense[] = [];
  categories: any[] = [];
  visibleIncomes: any[] = [];
  summaryMetrics: any[] = [];
  monthBars: any[] = [];
  loading: boolean = false;
  loadingError: string = '';
  saving: boolean = false;
  deleting: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' = 'success';
  showModal: boolean = false;
  isEditing: boolean = false;
  formError: string = '';
  showDeleteModal: boolean = false;
  deletingIncome: any = null;
  form = {
    category_id: '',
    amount: null as number | null,
    description: '',
    income_date: '',
    is_recurring: false,
    notes: '',
  };

  /* ---------------- Tarjetas de resumen ---------------- */
  summaryCards: SummaryCard[] = [
    {
      title: 'Balance total',
      amount: 0,
      changePercent: 0,
      colorLine: 'blue',
      iconSrc: 'assets/icon-balance.png',
    },
    {
      title: 'Ingresos',
      amount: 0,
      changePercent: 0,
      colorLine: 'green',
      iconSrc: 'assets/ingresos-resumen.png',
    },
    {
      title: 'Gastos',
      amount: 0,
      changePercent: 0,
      colorLine: 'blue',
      iconSrc: 'assets/gastos-resumen.png',
    },
    {
      title: 'Ahorro',
      amount: 0,
      changePercent: 0,
      colorLine: 'green',
      iconSrc: 'assets/icon-ahorro-resumen.png',
    },
  ];

  /* ---------------- Gráfica de líneas ---------------- */
  rangeMode: RangeMode = 'Mes';
  rangeOptions: RangeMode[] = ['Semana', 'Mes', 'Año'];
  chartData: ChartPoint[] = DATASETS['Mes'];

  readonly chartWidth = 540;
  readonly chartHeight = 210;
  readonly padLeft = 46;
  readonly padRight = 16;
  readonly padTop = 20;
  readonly padBottom = 26;

  ingresosPath = '';
  ingresosArea = '';
  yAxisTicks: { value: number; y: number }[] = [];
  xAxisLabels: { label: string; x: number }[] = [];
  incomePointPositions: ChartPointPosition[] = [];

  /* ---------------- Dona de ingresos por fuente ---------------- */
  donutSlices: DonutSlice[] = [];
  donutTotal = 0;
  private readonly donutRadius = 70;
  private readonly donutCircumference = 2 * Math.PI * this.donutRadius;

  /* ---------------- Tabla de ingresos recientes ---------------- */
  recentIncomes: RecentIncome[] = [];

  /* ---------------- Presupuesto ---------------- */
  budgetTotal = 0;
  budgetTarget = 10000;

  get today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    this.loadData();
    this.notificationService.refresh$.subscribe(() => this.buildSummaryCards());
    this.financeService.getIncomeCategories('income').subscribe({
      next: (categories) => (this.categories = categories),
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

  private loadData(): void {
    this.loadIncomes();

    this.financeService.getExpenses().subscribe({
      next: (res) => {
        this.expenses = res.data.map((e) => ({
          ...e,
          amount: Number(e.amount) || 0,
        }));
        this.applyData();
      },
      error: () => {
        this.expenses = [];
        this.applyData();
      },
    });
  }

  private applyData(): void {
    this.buildSummaryCards();
    this.fillLineChartData();
    this.buildLineChart();
    this.buildDonut();
    this.buildRecentTable();
    this.buildBudget();
  }

  private monthKey(iso: string): string {
    return (iso ?? '').slice(0, 7);
  }

  private sumOf<T>(items: T[], pick: (t: T) => number): number {
    return items.reduce((sum, it) => sum + (Number(pick(it)) || 0), 0);
  }

  /* ====================== Tarjetas de resumen ====================== */

  private buildSummaryCards(): void {
    const totalIncomes = this.sumOf(this.incomes, (i) => i.amount);
    const totalExpenses = this.sumOf(this.expenses, (e) => e.amount);
    const savings = this.savingsService.totalSavings();
    const balance = totalIncomes - totalExpenses - savings;

    this.summaryCards[0].amount = balance;
    this.summaryCards[1].amount = totalIncomes;
    this.summaryCards[2].amount = totalExpenses;
    this.summaryCards[3].amount = savings;
    this.summaryCards[0].changePercent = this.percentChange(balance, this.previousMonthBalance());
    this.summaryCards[1].changePercent = this.percentChange(
      this.sumForMonth(this.incomes, 'income_date'),
      this.sumForMonth(this.incomes, 'income_date', -1)
    );
    this.summaryCards[2].changePercent = this.percentChange(
      this.sumForMonth(this.expenses, 'expense_date'),
      this.sumForMonth(this.expenses, 'expense_date', -1)
    );
    this.summaryCards[3].changePercent = 0;
  }

  private percentChange(current: number, previous: number): number {
    return previous === 0 ? 0 : ((current - previous) / previous) * 100;
  }

  private sumForMonth(items: any[], dateField: string, offset = 0): number {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return this.sumOf(items.filter((item) => this.monthKey(item[dateField]) === key), (item) => item.amount);
  }

  private previousMonthBalance(): number {
    return this.sumForMonth(this.incomes, 'income_date', -1) - this.sumForMonth(this.expenses, 'expense_date', -1);
  }

  /* ====================== Gráfica de líneas ====================== */

  private fillLineChartData(): void {
    const now = new Date();

    if (this.rangeMode === 'Año') {
      this.chartData = Array.from({ length: 12 }, (_, index) => {
        const monthKey = `${now.getFullYear()}-${String(index + 1).padStart(2, '0')}`;
        return {
          label: new Date(now.getFullYear(), index, 1).toLocaleDateString('es-GT', { month: 'short' }).replace('.', ''),
          ingresos: this.sumOf(this.incomes.filter((income) => this.monthKey(income.income_date) === monthKey), (income) => income.amount),
          gastos: 0,
        };
      });
      return;
    }

    if (this.rangeMode === 'Mes') {
      const weeks = [
        { label: 'Sem 1', start: 1, end: 7 },
        { label: 'Sem 2', start: 8, end: 14 },
        { label: 'Sem 3', start: 15, end: 21 },
        { label: 'Sem 4', start: 22, end: 31 },
      ];
      this.chartData = weeks.map((week) => ({
        label: week.label,
        ingresos: this.sumOf(this.incomes.filter((income) => {
          const date = new Date(income.income_date);
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() >= week.start && date.getDate() <= week.end;
        }), (income) => income.amount),
        gastos: 0,
      }));
      return;
    }

    this.chartData = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      return {
        label: date.toLocaleDateString('es-GT', { weekday: 'short' }).replace('.', ''),
        ingresos: this.sumForDate(this.incomes, 'income_date', date),
        gastos: 0,
      };
    });
  }

  private sumForDate(items: any[], dateField: string, date: Date): number {
    return this.sumOf(items.filter((item) => item[dateField]?.slice(0, 10) === date.toISOString().slice(0, 10)), (item) => item.amount);
  }

  setRangeMode(mode: RangeMode): void {
    this.rangeMode = mode;
    this.fillLineChartData();
    this.buildLineChart();
  }

  private buildLineChart(): void {
    const w = this.chartWidth - this.padLeft - this.padRight;
    const h = this.chartHeight - this.padTop - this.padBottom;

    const all = this.chartData.map((p) => p.ingresos);
    const maxVal = Math.max(...all, 1);
    const niceMax = this.ceilToNice(maxVal);

    const stepX = this.chartData.length > 1 ? w / (this.chartData.length - 1) : 0;
    const scaleY = (v: number) => this.padTop + h - (v / niceMax) * h;
    const scaleX = (i: number) => this.padLeft + i * stepX;

    const points = this.chartData.map((point, index) => ({
      x: scaleX(index),
      y: scaleY(point.ingresos),
    }));
    this.ingresosPath = this.buildSmoothPath(points);
    const baseline = this.padTop + h;
    this.ingresosArea = `${this.ingresosPath} L ${points[points.length - 1].x.toFixed(1)} ${baseline.toFixed(1)} L ${points[0].x.toFixed(1)} ${baseline.toFixed(1)} Z`;

    this.yAxisTicks = [0, niceMax / 2, niceMax].map((v) => ({
      value: v,
      y: scaleY(v),
    }));

    const labelStep = this.chartData.length > 6 ? Math.ceil(this.chartData.length / 5) : 1;
    this.xAxisLabels = this.chartData
      .map((p, i) => ({ label: p.label, x: scaleX(i) }))
      .filter((_, i) => i % labelStep === 0 || i === this.chartData.length - 1);
    this.incomePointPositions = this.chartData.map((point, index) => ({ x: scaleX(index), y: scaleY(point.ingresos), value: point.ingresos, label: point.label }));
  }

  private buildSmoothPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

    return points.map((point, index) => {
      if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      const previous = points[index - 1];
      const midpoint = (previous.x + point.x) / 2;
      return `C ${midpoint.toFixed(1)} ${previous.y.toFixed(1)}, ${midpoint.toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }).join(' ');
  }

  private ceilToNice(value: number): number {
    if (value <= 0) return 100;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    const n = value / pow;
    const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return nice * pow;
  }

  formatYAxisValue(v: number): string {
    if (v >= 1000) return `Q${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return `Q${v}`;
  }

  /* ====================== Dona de ingresos ====================== */

  private buildDonut(): void {
    const totals = new Map<string, number>();
    for (const inc of this.incomes) {
      const name = this.normalizeSource(inc.category_name);
      totals.set(name, (totals.get(name) ?? 0) + inc.amount);
    }

    const entries = [...totals.entries()];
    this.donutTotal = entries.reduce((sum, [, v]) => sum + v, 0);

    let cumulative = 0;
    this.donutSlices = entries.map(([name, amount], index) => {
      const color = SOURCE_COLORS[name] ?? SOURCE_PALETTE[index % SOURCE_PALETTE.length];
      const percent = this.donutTotal > 0 ? Math.round((amount / this.donutTotal) * 100) : 0;
      const dash = this.donutTotal > 0 ? (amount / this.donutTotal) * this.donutCircumference : 0;
      const slice: DonutSlice = {
        name,
        color,
        amount,
        percent,
        dashArray: `${dash} ${this.donutCircumference - dash}`,
        dashOffset: -cumulative,
      };
      cumulative += dash;
      return slice;
    });
  }

  private normalizeSource(name: string): string {
    const map: Record<string, string> = {
      Salario: 'Salarios',
      'Ventas': 'Ventas',
      'Consultoría': 'Consultorías',
      'Consultorías': 'Consultorías',
      Renta: 'Rentas',
      Rentas: 'Rentas',
      Intereses: 'Intereses',
      Servicios: 'Servicios',
      'Otros ingresos': 'Otros',
      Otros: 'Otros',
    };
    return map[name] ?? name;
  }

  /* ====================== Tabla de ingresos recientes ====================== */

  private buildRecentTable(): void {
    const sorted = [...this.incomes].sort((a, b) =>
      (b.income_date ?? '').localeCompare(a.income_date ?? '')
    );
    this.recentIncomes = sorted.slice(0, 6).map((inc) => ({
      id: inc.id,
      description: inc.description,
      source: inc.category_name || 'Sin categoría',
      date: this.formatDate(inc.income_date),
      method: inc.is_recurring ? 'Automático' : 'Manual',
      status: 'Completado',
      amount: inc.amount,
    }));
  }

  /* ====================== Presupuesto ====================== */

  private buildBudget(): void {
    this.budgetTotal = this.sumOf(this.incomes, (i) => i.amount);
  }

  get budgetPercent(): number {
    const pct = this.budgetTarget > 0 ? (this.budgetTotal / this.budgetTarget) * 100 : 0;
    return Math.min(Math.round(pct), 100);
  }

  private buildIncomeMetrics(): void {
    const total = this.sumOf(this.incomes, (income) => income.amount);
    const recurring = this.sumOf(this.incomes.filter((income) => income.is_recurring), (income) => income.amount);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTotal = this.sumOf(this.incomes.filter((income) => this.monthKey(income.income_date) === currentMonth), (income) => income.amount);
    this.summaryMetrics = [];
    const monthly = new Map<string, number>();
    this.incomes.forEach((income) => {
      const key = this.monthKey(income.income_date);
      monthly.set(key, (monthly.get(key) ?? 0) + income.amount);
    });
    const months = [...monthly.keys()].sort().slice(-6);
    const max = Math.max(...months.map((month) => monthly.get(month) ?? 0), 1);
    this.monthBars = months.map((month) => ({
      label: new Date(`${month}-01T00:00:00`).toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
      amount: monthly.get(month) ?? 0,
      heightPct: (monthly.get(month) ?? 0) / max,
    }));
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.visibleIncomes = this.incomes.filter((income) => {
      const matchesCategory = !this.filterCategoryId || String(income.category_id) === String(this.filterCategoryId);
      const incomeDate = (income.income_date || '').slice(0, 10);
      const matchesDateFrom = !this.filterDateFrom || incomeDate >= this.filterDateFrom;
      const matchesDateTo = !this.filterDateTo || incomeDate <= this.filterDateTo;
      const amount = Number(income.amount) || 0;
      const matchesMinAmount = this.filterMinAmount === null || amount >= this.filterMinAmount;
      const matchesMaxAmount = this.filterMaxAmount === null || amount <= this.filterMaxAmount;
      const searchable = `${income.description ?? ''} ${income.category_name ?? ''} ${income.notes ?? ''}`.toLowerCase();
      return matchesCategory && matchesDateFrom && matchesDateTo && matchesMinAmount && matchesMaxAmount && (!term || searchable.includes(term));
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

  getCategoryIcon(categoryName: string): string {
    const normalized = (categoryName ?? '').toLowerCase();
    if (normalized.includes('salari') || normalized.includes('nómin')) return 'M4 19h16M6 17V7h12v10M9 7V4h6v3';
    if (normalized.includes('venta')) return 'M3 6h18l-2 13H5L3 6z M8 6a4 4 0 0 1 8 0';
    if (normalized.includes('renta') || normalized.includes('alquiler')) return 'M3 21h18 M5 21V9l7-6 7 6v12 M9 21v-6h6v6';
    if (normalized.includes('servicio') || normalized.includes('consult')) return 'M12 3v18 M3 12h18';
    return 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0-9-18z M8 12h8';
  }

  openNewModal(): void {
    this.form = { category_id: '', amount: null, description: '', income_date: new Date().toISOString().slice(0, 10), is_recurring: false, notes: '' };
    this.formError = '';
    this.isEditing = false;
    this.deletingIncome = null;
    this.showModal = true;
  }

  openEditModal(income: any): void {
    this.form = { category_id: income.category_id ?? '', amount: Number(income.amount) || null, description: income.description ?? '', income_date: (income.income_date ?? '').slice(0, 10), is_recurring: Boolean(income.is_recurring), notes: income.notes ?? '' };
    this.formError = '';
    this.isEditing = true;
    this.deletingIncome = income;
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  openDeleteModal(income: any): void {
    this.deletingIncome = income;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deletingIncome = null;
  }

  confirmDelete(): void {
    if (!this.deletingIncome?.id) return;
    this.deleting = true;
    this.financeService.deleteIncome(this.deletingIncome.id).subscribe({
      next: () => { this.deleting = false; this.cancelDelete(); this.showToast('Ingreso eliminado correctamente.', 'success'); this.notificationService.notifyDataChanged(); this.loadIncomes(); },
      error: (error) => { console.error('Error al eliminar el ingreso:', error); this.deleting = false; this.showToast('No se pudo eliminar el ingreso.', 'error'); },
    });
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

  submit(): void {
    if (!this.form.category_id || !this.form.amount || this.form.amount <= 0 || !this.form.income_date) {
      this.formError = 'Completa la categoría, el monto y la fecha.';
      return;
    }
    if (this.form.income_date > this.today) {
      this.formError = 'La fecha del ingreso no puede ser futura.';
      return;
    }
    this.saving = true;
    this.formError = '';
    const payload = { ...this.form, amount: Number(this.form.amount), notes: this.form.notes || null };
    const request = this.isEditing && this.deletingIncome?.id ? this.financeService.updateIncome(this.deletingIncome.id, payload) : this.financeService.createIncome(payload);
    request.subscribe({
      next: () => { this.saving = false; this.closeModal(); this.showToast(this.isEditing ? 'Ingreso actualizado correctamente.' : 'Ingreso creado correctamente.', 'success'); this.notificationService.notifyDataChanged(); this.loadIncomes(); },
      error: (error) => { console.error('Error al guardar el ingreso:', error); this.saving = false; this.formError = 'No se pudo guardar el ingreso.'; },
    });
  }

  loadIncomes(): void {
    this.loading = true;
    this.loadingError = '';
    this.financeService.getIncomes().subscribe({
      next: (res) => {
        this.incomes = res.data.map((income) => ({ ...income, amount: Number(income.amount) || 0 }));
        this.buildIncomeMetrics();
        this.applyFilters();
        this.applyData();
        this.loading = false;
        if (this.searchTerm) {
          this.scrollToFirstMatch(this.searchTerm);
        }
      },
      error: () => { this.incomes = []; this.visibleIncomes = []; this.loadingError = 'No se pudieron cargar los ingresos.'; this.loading = false; },
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    window.setTimeout(() => (this.toastMessage = ''), 3500);
  }

  /* ====================== Notificaciones ====================== */

  onBellClick(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => undefined,
    });
    this.router.navigate(['/dashboard'], { fragment: 'notificationsSection' });
  }

  /* ====================== Utilidades ====================== */

  formatCurrency(value: number): string {
    return this.currencyService.format(value);
  }

  formatDate(value: string): string {
    if (!value) return '—';
    const [y, m, d] = value.slice(0, 10).split('-');
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  }

  getIconPath(name: string): string {
    return ICON_PATHS[name] ?? '';
  }

  /* ====================== Navegación / Layout ====================== */

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

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth < 900;
    if (this.isMobile) {
      this.sidebarCollapsed = true;
    }
  }
}