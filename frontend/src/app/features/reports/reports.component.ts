import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { AppSidebarComponent } from '../../core/components/app-sidebar/app-sidebar.component';
import { SavingsService } from '../../core/services/savings.service';
import { CurrencyService } from '../../core/services/currency.service';
import { AppHeaderComponent } from '../../core/components/app-header/app-header.component';
import { AuthService } from '../../core/services/auth.service';
import {
  FinanceService,
  Expense,
  Income,
} from '../../core/services/finance.service';

interface MonthlyComparison {
  monthKey: string;
  label: string;
  incomes: number;
  expenses: number;
  net: number;
  savingsRate: number;
  incomeHeight: number;
  expenseHeight: number;
}

interface CategoryBreakdown {
  name: string;
  color: string;
  icon: string;
  amount: number;
  percent: number;
  dashArray: string;
  dashOffset: number;
}

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
  printer: 'M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  cart: 'M3 3h2l2.2 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6 M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z M17 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  car: 'M3 13l1.6-4.8A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.2L21 13 M3 13v4h2 M19 13v4h2 M5.5 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M18.5 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M3 13h18',
  play: 'M9 7v10l8-5z',
  book: 'M4 4.5h8a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4z M20 4.5h-8a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h8z',
  home2: 'M3 12l9-9 9 9M5 10v10h14V10',
};

const CATEGORY_ICONS: Record<string, string> = {
  Alimentación: 'cart',
  Transporte: 'car',
  Entretenimiento: 'play',
  Educación: 'book',
  'Vivienda y Servicios': 'home2',
  Servicios: 'receipt',
  Otros: 'grid',
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent, AppHeaderComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly financeService = inject(FinanceService);
  private readonly router = inject(Router);
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
  activeRoute = 'reportes';

  get currentDateLabel(): string {
    const currentDate = new Date();
    const month = currentDate.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${currentDate.getDate()} de ${capitalizedMonth} de ${currentDate.getFullYear()}`;
  }

  /* Datos */
  expenses: Expense[] = [];
  incomes: Income[] = [];
  loading = false;
  loadingError = '';

  /* Período */
  selectedPeriod: 'month' | '3months' | '6months' | 'year' | 'all' = 'year';

  /* Métricas Globales */
  totalIncomes = 0;
  totalExpenses = 0;
  netSavings = 0;
  savingsRate = 0;
  topExpenseCategory = '—';
  topExpenseAmount = 0;

  /* Comparativa Mensual (Gráfico de Barras) */
  monthlyData: MonthlyComparison[] = [];
  chartMax = 1000;

  /* Desglose por Categoría (Dona y Barras) */
  categoryBreakdown: CategoryBreakdown[] = [];
  donutTotal = 0;
  private readonly donutRadius = 70;
  private readonly donutCircumference = 2 * Math.PI * this.donutRadius;

  ngOnInit(): void {
    this.loadData();
    this.notificationService.refresh$.subscribe(() => this.generateReport());
  }

  loadData(): void {
    this.loading = true;
    this.loadingError = '';

    this.financeService.getExpenses().subscribe({
      next: (expRes) => {
        this.expenses = expRes.data.map((e) => ({ ...e, amount: Number(e.amount) || 0 }));
        this.financeService.getIncomes().subscribe({
          next: (incRes) => {
            this.incomes = incRes.data.map((i) => ({ ...i, amount: Number(i.amount) || 0 }));
            this.generateReport();
            this.loading = false;
          },
          error: () => {
            this.incomes = [];
            this.generateReport();
            this.loading = false;
          },
        });
      },
      error: () => {
        this.expenses = [];
        this.loadingError = 'No se pudieron obtener los datos para los reportes.';
        this.loading = false;
      },
    });
  }

  setPeriod(period: 'month' | '3months' | '6months' | 'year' | 'all'): void {
    this.selectedPeriod = period;
    this.generateReport();
  }

  private filterByPeriod<T extends { expense_date?: string; income_date?: string }>(items: T[]): T[] {
    const now = new Date();
    return items.filter((it) => {
      const dateStr = it.expense_date || it.income_date;
      if (!dateStr) return false;
      const d = new Date(dateStr);

      if (this.selectedPeriod === 'month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (this.selectedPeriod === '3months') {
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return d >= threeMonthsAgo;
      }
      if (this.selectedPeriod === '6months') {
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        return d >= sixMonthsAgo;
      }
      if (this.selectedPeriod === 'year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  }

  generateReport(): void {
    const filteredExpenses = this.filterByPeriod(this.expenses);
    const filteredIncomes = this.filterByPeriod(this.incomes);

    this.totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    this.totalIncomes = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
    this.netSavings = this.totalIncomes - this.totalExpenses - this.savingsService.totalSavings();
    this.savingsRate = this.totalIncomes > 0 ? Math.round((this.netSavings / this.totalIncomes) * 100) : 0;

    // Comparativa mensual (agrupar por YYYY-MM)
    const monthMap = new Map<string, { incomes: number; expenses: number; label: string }>();

    // Inicializar los últimos meses según el filtro
    const now = new Date();
    const monthsCount = this.selectedPeriod === 'month' ? 1 : (this.selectedPeriod === '3months' ? 3 : (this.selectedPeriod === '6months' ? 6 : 12));
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-GT', { month: 'short', year: '2-digit' });
      monthMap.set(key, { incomes: 0, expenses: 0, label });
    }

    filteredIncomes.forEach((i) => {
      const key = (i.income_date || '').slice(0, 7);
      if (key && monthMap.has(key)) {
        monthMap.get(key)!.incomes += i.amount;
      } else if (key) {
        monthMap.set(key, { incomes: i.amount, expenses: 0, label: key });
      }
    });

    filteredExpenses.forEach((e) => {
      const key = (e.expense_date || '').slice(0, 7);
      if (key && monthMap.has(key)) {
        monthMap.get(key)!.expenses += e.amount;
      } else if (key) {
        monthMap.set(key, { incomes: 0, expenses: e.amount, label: key });
      }
    });

    const maxVal = Math.max(
      ...[...monthMap.values()].flatMap((m) => [m.incomes, m.expenses]),
      1000
    );
    this.chartMax = Math.ceil(maxVal / 1000) * 1000 || 1000;

    this.monthlyData = [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, val]) => {
        const net = val.incomes - val.expenses;
        const rate = val.incomes > 0 ? Math.round((net / val.incomes) * 100) : 0;
        return {
          monthKey,
          label: val.label,
          incomes: val.incomes,
          expenses: val.expenses,
          net,
          savingsRate: rate,
          incomeHeight: Math.round((val.incomes / this.chartMax) * 160),
          expenseHeight: Math.round((val.expenses / this.chartMax) * 160),
        };
      });

    // Desglose por Categoría
    const catMap = new Map<string, { amount: number; color: string; icon: string }>();
    filteredExpenses.forEach((e) => {
      const name = e.category_name || 'Sin categoría';
      const color = e.category_color || '#e63946';
      const cur = catMap.get(name) ?? { amount: 0, color, icon: CATEGORY_ICONS[name] ?? 'grid' };
      catMap.set(name, { amount: cur.amount + e.amount, color: cur.color, icon: cur.icon });
    });

    const catTotal = [...catMap.values()].reduce((sum, c) => sum + c.amount, 0);
    this.donutTotal = catTotal;

    let cumulative = 0;
    this.categoryBreakdown = [...catMap.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([name, data]) => {
        const percent = catTotal > 0 ? Math.round((data.amount / catTotal) * 100) : 0;
        const dash = catTotal > 0 ? (data.amount / catTotal) * this.donutCircumference : 0;
        const item: CategoryBreakdown = {
          name,
          color: data.color,
          icon: data.icon,
          amount: data.amount,
          percent,
          dashArray: `${dash} ${this.donutCircumference - dash}`,
          dashOffset: -cumulative,
        };
        cumulative += dash;
        return item;
      });

    if (this.categoryBreakdown.length > 0) {
      this.topExpenseCategory = this.categoryBreakdown[0].name;
      this.topExpenseAmount = this.categoryBreakdown[0].amount;
    } else {
      this.topExpenseCategory = '—';
      this.topExpenseAmount = 0;
    }
  }

  printReport(): void {
    window.print();
  }

  exportCSV(): void {
    const headers = ['Tipo', 'Fecha', 'Categoría', 'Descripción', 'Monto (Q)', 'Notas'];
    const rows: string[][] = [];

    const filteredExpenses = this.filterByPeriod(this.expenses);
    const filteredIncomes = this.filterByPeriod(this.incomes);

    filteredIncomes.forEach((i) => {
      rows.push(['Ingreso', i.income_date, i.category_name || 'General', `"${(i.description || '').replace(/"/g, '""')}"`, i.amount.toFixed(2), `"${(i.notes || '').replace(/"/g, '""')}"`]);
    });

    filteredExpenses.forEach((e) => {
      rows.push(['Gasto', e.expense_date, e.category_name || 'General', `"${(e.description || '').replace(/"/g, '""')}"`, (-e.amount).toFixed(2), `"${(e.notes || '').replace(/"/g, '""')}"`]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Financiero_JAXINDUSTRIES_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  formatCurrency(val: number): string {
    return this.currencyService.format(val);
  }

  getIconPath(name: string): string {
    return ICON_PATHS[name] ?? '';
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
