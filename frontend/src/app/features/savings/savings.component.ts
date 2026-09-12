import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService, Expense, Income } from '../../core/services/finance.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SavingsService, SavingsDeposit } from '../../core/services/savings.service';
import { CurrencyService } from '../../core/services/currency.service';
import { AppSidebarComponent } from '../../core/components/app-sidebar/app-sidebar.component';
import { AppHeaderComponent } from '../../core/components/app-header/app-header.component';

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
  plus: 'M12 5v14 M5 12h14',
  check: 'M20 6L9 17l-5-5',
};

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent, AppHeaderComponent],
  templateUrl: './savings.component.html',
  styleUrl: './savings.component.css',
})
export class SavingsComponent implements OnInit {
  private readonly financeService = inject(FinanceService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  public readonly savingsService = inject(SavingsService);
  public readonly currencyService = inject(CurrencyService);

  readonly ICON_PATHS = ICON_PATHS;
  readonly defaultAvatar = 'assets/user-avatar-hombre.png';

  sidebarCollapsed = false;
  isMobile = window.innerWidth < 900;
  userMenuOpen = false;
  activeRoute = 'ahorro';

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

  // Datos financieros
  totalIncomes = 0;
  totalExpenses = 0;
  savingsGoal = 25000;
  loading = false;

  // Modal para agregar ahorro
  showDepositModal = false;
  showWithdrawalModal = false;
  depositAmount: number | null = null;
  withdrawalAmount: number | null = null;
  depositNote = 'Aporte voluntario a fondo de ahorro';
  withdrawalNote = 'Retiro del fondo de ahorro';

  ngOnInit(): void {
    const savedGoal = localStorage.getItem('jax_savings_goal');
    if (savedGoal) {
      const g = parseFloat(savedGoal);
      if (!isNaN(g) && g > 0) this.savingsGoal = g;
    }
    this.loadFinancialData();
  }

  loadFinancialData(): void {
    this.loading = true;
    this.financeService.getIncomes().subscribe({
      next: (incRes) => {
        this.totalIncomes = incRes.data.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        this.financeService.getExpenses().subscribe({
          next: (expRes) => {
            this.totalExpenses = expRes.data.reduce((s, e) => s + (Number(e.amount) || 0), 0);
            this.loading = false;
          },
          error: () => { this.loading = false; },
        });
      },
      error: () => { this.loading = false; },
    });
  }

  get totalSavings(): number {
    return this.savingsService.totalSavings();
  }

  get remainingBalance(): number {
    return Math.max(0, this.totalIncomes - this.totalExpenses - this.totalSavings);
  }

  get goalPercent(): number {
    if (this.savingsGoal <= 0) return 0;
    return Math.min(100, Math.round((this.totalSavings / this.savingsGoal) * 100));
  }

  get savingsRate(): number {
    if (this.totalIncomes <= 0) return 0;
    return Math.round((this.totalSavings / this.totalIncomes) * 100);
  }

  formatCurrency(valInGTQ: number): string {
    return this.currencyService.format(valInGTQ);
  }

  openDepositModal(): void {
    this.depositAmount = null;
    this.depositNote = 'Aporte voluntario a fondo de ahorro';
    this.showDepositModal = true;
  }

  submitDeposit(): void {
    if (!this.depositAmount || this.depositAmount <= 0) return;

    this.savingsService.depositToSavings(this.depositAmount, this.depositNote.trim());
    this.showDepositModal = false;
  }

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  withdrawalError = '';

  showToast(msg: string, type: 'success' | 'error' = 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    window.setTimeout(() => (this.toastMessage = ''), 4000);
  }

  openWithdrawalModal(): void {
    if (this.totalSavings === 0) {
      this.showToast('no tienes fondos como para poder realizar esta accion', 'error');
      return;
    }
    this.withdrawalAmount = null;
    this.withdrawalNote = 'Retiro del fondo de ahorro';
    this.withdrawalError = '';
    this.showWithdrawalModal = true;
  }

  submitWithdrawal(): void {
    const currentBalance = this.totalSavings;
    if (currentBalance === 0) {
      const msg = 'no tienes fondos como para poder realizar esta accion';
      this.withdrawalError = msg;
      this.showToast(msg, 'error');
      return;
    }

    if (!this.withdrawalAmount || this.withdrawalAmount <= 0) {
      this.withdrawalError = 'Por favor ingresa un monto válido.';
      return;
    }

    if (this.withdrawalAmount > currentBalance) {
      const msg = 'no tiene los fondos suficientes para realizar esta accion';
      this.withdrawalError = msg;
      this.showToast(msg, 'error');
      return;
    }

    if (this.savingsService.withdrawFromSavings(this.withdrawalAmount, this.withdrawalNote.trim())) {
      this.showWithdrawalModal = false;
      this.withdrawalError = '';
      this.showToast('Retiro realizado exitosamente.', 'success');
    }
  }

  onDepositInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.value) {
      const parts = input.value.split('.');
      if (parts.length > 1 && parts[1].length > 2) {
        input.value = `${parts[0]}.${parts[1].slice(0, 2)}`;
        this.depositAmount = parseFloat(input.value);
      }
    }
  }

  onDepositBlur(): void {
    if (this.depositAmount !== null && this.depositAmount !== undefined && !isNaN(this.depositAmount)) {
      this.depositAmount = Number(Number(this.depositAmount).toFixed(2));
    }
  }

  onWithdrawalInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.value) {
      const parts = input.value.split('.');
      if (parts.length > 1 && parts[1].length > 2) {
        input.value = `${parts[0]}.${parts[1].slice(0, 2)}`;
        this.withdrawalAmount = parseFloat(input.value);
      }
    }
  }

  onWithdrawalBlur(): void {
    if (this.withdrawalAmount !== null && this.withdrawalAmount !== undefined && !isNaN(this.withdrawalAmount)) {
      this.withdrawalAmount = Number(Number(this.withdrawalAmount).toFixed(2));
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

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth < 900;
    if (this.isMobile) this.sidebarCollapsed = true;
  }
}
