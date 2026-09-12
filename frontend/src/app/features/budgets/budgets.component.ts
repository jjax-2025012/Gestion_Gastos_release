import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService, Expense } from '../../core/services/finance.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyService } from '../../core/services/currency.service';
import { AppSidebarComponent } from '../../core/components/app-sidebar/app-sidebar.component';
import { AppHeaderComponent } from '../../core/components/app-header/app-header.component';
import { SavingsService } from '../../core/services/savings.service';

const ICON_PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5 M5 10.5V20h5v-6h4v6h5v-9.5',
  receipt: 'M6 2h9l3 3v17H6z M9 8h6 M9 12h6 M9 16h4',
  'trending-up': 'M3 17l6-6 4 4 8-8 M15 6h6v6',
  'piggy-bank':
    'M4 12a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2h-1l-1 3h-3l-1-2H9l-1 2H6a1 1 0 0 1-1-1v-2H4z',
  grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  'file-text': 'M7 2h7l4 4v16H7z M11 2v5h5 M9 12h6 M9 16h6',
  leaf: 'M12 3C7 3 4 7 4 11c0 3.5 2.2 5.6 4.4 6.6L12 21l3.6-3.4C17.8 16.6 20 14.5 20 11c0-4-3-8-8-8z',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M2 12h3 M19 12h3',
  bell: 'M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3z M10 20a2 2 0 0 0 4 0',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
};

interface CategoryBudget {
  name: string;
  spent: number;
  allocated: number;
  percent: number;
  color: string;
}

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent, AppHeaderComponent],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.css',
})
export class BudgetsComponent implements OnInit {
  private readonly financeService = inject(FinanceService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  public readonly currencyService = inject(CurrencyService);
  private readonly savingsService = inject(SavingsService);

  readonly ICON_PATHS = ICON_PATHS;
  readonly defaultAvatar = 'assets/user-avatar-hombre.png';

  sidebarCollapsed = false;
  isMobile = window.innerWidth < 900;
  userMenuOpen = false;
  activeRoute = 'presupuestos';

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

  get currentUser() {
    return this.authService.currentUser();
  }

  get unreadNotificationCount(): number {
    return this.notificationService.unreadCount();
  }

  get currentDateLabel(): string {
    const currentDate = new Date();
    const month = currentDate.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${currentDate.getDate()} de ${capitalizedMonth} de ${currentDate.getFullYear()}`;
  }

  // Presupuesto
  monthlyBudgetLimit = 10000;
  totalSpentThisMonth = 0;
  categoryBudgets: CategoryBudget[] = [];
  loading = false;

  // Modal para editar presupuesto
  showEditModal = false;
  newBudgetLimit = 10000;

  ngOnInit(): void {
    const saved = localStorage.getItem('jax_monthly_budget');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) this.monthlyBudgetLimit = parsed;
    }
    this.newBudgetLimit = this.monthlyBudgetLimit;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.financeService.getExpenses().subscribe({
      next: (res) => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const monthExpenses = res.data.filter((e) => {
          if (!e.expense_date) return false;
          const d = new Date(e.expense_date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });

        this.totalSpentThisMonth = monthExpenses.reduce(
          (sum, e) => sum + (Number(e.amount) || 0),
          0
        );

        // Agrupar por categoría
        const catMap = new Map<string, { spent: number; color: string }>();
        monthExpenses.forEach((e) => {
          const cat = e.category_name || 'Sin categoría';
          const prev = catMap.get(cat) ?? { spent: 0, color: e.category_color || '#3b82f6' };
          catMap.set(cat, { spent: prev.spent + (Number(e.amount) || 0), color: prev.color });
        });

        const totalSpent = this.totalSpentThisMonth;
        this.categoryBudgets = Array.from(catMap.entries()).map(([name, data]) => {
          // Asignación proporcional de presupuesto orientativa
          const share = totalSpent > 0 ? data.spent / totalSpent : 0.2;
          const allocated = Math.round(this.monthlyBudgetLimit * share);
          const percent = allocated > 0 ? Math.round((data.spent / allocated) * 100) : 0;
          return {
            name,
            spent: data.spent,
            allocated,
            percent,
            color: data.color,
          };
        });

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get overallPercent(): number {
    if (this.monthlyBudgetLimit <= 0) return 0;
    return Math.round((this.totalSpentThisMonth / this.monthlyBudgetLimit) * 100);
  }

  get remainingBudget(): number {
    return Math.max(0, this.monthlyBudgetLimit - this.totalSpentThisMonth - this.savingsService.totalSavings());
  }

  get isOverBudget(): boolean {
    return this.totalSpentThisMonth > this.monthlyBudgetLimit;
  }

  get progressColorClass(): string {
    const p = this.overallPercent;
    if (p > 100) return 'progress-danger';
    if (p > 85) return 'progress-warning';
    return 'progress-success';
  }

  formatCurrency(valInGTQ: number): string {
    return this.currencyService.format(valInGTQ);
  }

  openEditModal(): void {
    this.newBudgetLimit = this.monthlyBudgetLimit;
    this.showEditModal = true;
  }

  saveBudgetLimit(): void {
    if (this.newBudgetLimit > 0) {
      this.monthlyBudgetLimit = this.newBudgetLimit;
      localStorage.setItem('jax_monthly_budget', String(this.newBudgetLimit));
      this.showEditModal = false;
      this.loadData();
      this.notificationService.createNotification(
        `Límite de presupuesto mensual actualizado a ${this.formatCurrency(this.monthlyBudgetLimit)}.`,
        'info',
        'piggy-bank'
      ).subscribe({ next: () => undefined, error: () => undefined });
    }
  }

  getIconPath(name: string): string {
    return ICON_PATHS[name] ?? '';
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

  onBudgetInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.value) {
      const parts = input.value.split('.');
      if (parts.length > 1 && parts[1].length > 2) {
        input.value = `${parts[0]}.${parts[1].slice(0, 2)}`;
        this.newBudgetLimit = parseFloat(input.value);
      }
    }
  }

  onBudgetBlur(): void {
    if (this.newBudgetLimit !== null && !isNaN(this.newBudgetLimit)) {
      this.newBudgetLimit = Number(Number(this.newBudgetLimit).toFixed(2));
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth < 900;
    if (this.isMobile) this.sidebarCollapsed = true;
  }
}
