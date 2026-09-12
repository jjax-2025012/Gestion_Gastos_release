import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { AppSidebarComponent } from '../../core/components/app-sidebar/app-sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { CurrencyCode, CurrencyService } from '../../core/services/currency.service';
import { ThemeService } from '../../core/services/theme.service';
import { AppHeaderComponent } from '../../core/components/app-header/app-header.component';

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
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  check: 'M20 6L9 17l-5-5',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent, AppHeaderComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly currencyService = inject(CurrencyService);
  private readonly themeService = inject(ThemeService);

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
  activeRoute = 'configuracion';

  get currentDateLabel(): string {
    const currentDate = new Date();
    const month = currentDate.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${currentDate.getDate()} de ${capitalizedMonth} de ${currentDate.getFullYear()}`;
  }

  /* Formulario de Perfil */
  profileForm = {
    username: '',
    email: '',
    gender: 'male',
    avatar_url: '',
  };
  savingProfile = false;
  profileSuccess = false;
  profileError = '';
  googleAvatarUrl = '';

  /* Preferencias del Sistema */
  systemPrefs = {
    currency: 'GTQ',
    monthlyBudget: 10000,
    theme: 'light',
    budgetAlerts: true,
    emailAlerts: false,
  };
  savingPrefs = false;
  prefsSuccess = false;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  ngOnInit(): void {
    const user = this.currentUser;
    if (user) {
      this.profileForm.username = user.username || '';
      this.profileForm.email = user.email || '';
      this.profileForm.gender = user.gender || 'male';
      this.profileForm.avatar_url = user.avatar_url || user.avatar || user.picture || this.defaultAvatar;
      this.googleAvatarUrl = user.picture || '';
    }

    // Cargar preferencias guardadas
    const savedCurrency = localStorage.getItem('jax_currency');
    if (savedCurrency) this.systemPrefs.currency = savedCurrency;

    const savedBudget = localStorage.getItem('jax_monthly_budget');
    if (savedBudget) {
      const parsed = parseFloat(savedBudget);
      if (!isNaN(parsed) && parsed > 0) this.systemPrefs.monthlyBudget = parsed;
    }

    const savedTheme = localStorage.getItem('jax_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') this.systemPrefs.theme = savedTheme;

    const savedAlerts = localStorage.getItem('jax_budget_alerts');
    if (savedAlerts !== null) this.systemPrefs.budgetAlerts = savedAlerts === 'true';
  }

  selectPresetAvatar(type: 'hombre' | 'mujer'): void {
    const path = `assets/user-avatar-${type}.png`;
    this.profileForm.avatar_url = path;
    this.profileForm.gender = type === 'mujer' ? 'female' : 'male';
  }

  restoreGoogleAvatar(): void {
    if (this.googleAvatarUrl) {
      this.profileForm.avatar_url = this.googleAvatarUrl;
    }
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.profileError = 'La imagen no debe superar los 5MB.';
        this.showToast('La imagen no debe superar los 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          this.profileForm.avatar_url = e.target.result as string;
          this.showToast('Foto cargada exitosamente. Haz clic en "Guardar Cambios de Perfil" para conservarla.', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  }

  onBudgetInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.value) {
      const parts = input.value.split('.');
      if (parts.length > 1 && parts[1].length > 2) {
        input.value = `${parts[0]}.${parts[1].slice(0, 2)}`;
        this.systemPrefs.monthlyBudget = parseFloat(input.value);
      }
    }
  }

  onBudgetBlur(): void {
    if (this.systemPrefs.monthlyBudget !== null && !isNaN(this.systemPrefs.monthlyBudget)) {
      this.systemPrefs.monthlyBudget = Number(Number(this.systemPrefs.monthlyBudget).toFixed(2));
    }
  }

  saveProfile(): void {
    if (!this.profileForm.username.trim()) {
      this.profileError = 'El nombre de usuario no puede estar vacío.';
      return;
    }

    this.savingProfile = true;
    this.profileError = '';
    this.profileSuccess = false;

    this.authService
      .updateProfile({
        username: this.profileForm.username.trim(),
        gender: this.profileForm.gender,
        avatar_url: this.profileForm.avatar_url.trim(),
      })
      .subscribe({
        next: () => {
          this.savingProfile = false;
          this.profileSuccess = true;
          this.showToast('Perfil actualizado correctamente.', 'success');
          this.notificationService.notifyDataChanged();
          window.setTimeout(() => (this.profileSuccess = false), 3000);
        },
        error: (err) => {
          console.error('Error al actualizar perfil:', err);
          this.savingProfile = false;
          this.profileError = 'No se pudo actualizar el perfil en el servidor.';
          this.showToast('Error al actualizar el perfil.', 'error');
        },
      });
  }

  savePreferences(): void {
    this.savingPrefs = true;

    this.currencyService.setCurrency(this.systemPrefs.currency as CurrencyCode);
    localStorage.setItem('jax_monthly_budget', String(this.systemPrefs.monthlyBudget));
    this.themeService.setTheme(this.systemPrefs.theme as 'light' | 'dark');
    localStorage.setItem('jax_budget_alerts', String(this.systemPrefs.budgetAlerts));

    window.setTimeout(() => {
      this.savingPrefs = false;
      this.prefsSuccess = true;
      this.showToast('Preferencias guardadas exitosamente.', 'success');
      window.setTimeout(() => (this.prefsSuccess = false), 3000);
    }, 400);
  }

  get isGoogleLinked(): boolean {
    return !!(this.currentUser as any)?.google_id;
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    window.setTimeout(() => (this.toastMessage = ''), 3500);
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
