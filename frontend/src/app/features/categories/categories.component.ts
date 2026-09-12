import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { FinanceService, IncomeCategory } from '../../core/services/finance.service';
import { AppSidebarComponent } from '../../core/components/app-sidebar/app-sidebar.component';
import { AppHeaderComponent } from '../../core/components/app-header/app-header.component';

const AVAILABLE_ICONS = [
  { key: 'cart', label: 'Compras / Alimentos', path: 'M3 3h2l2.2 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6 M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z M17 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z' },
  { key: 'car', label: 'Transporte / Auto', path: 'M3 13l1.6-4.8A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.9 1.2L21 13 M3 13v4h2 M19 13v4h2 M5.5 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M18.5 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M3 13h18' },
  { key: 'home', label: 'Vivienda / Casa', path: 'M3 11.5 12 4l9 7.5 M5 10.5V20h5v-6h4v6h5v-9.5' },
  { key: 'play', label: 'Entretenimiento / Ocio', path: 'M9 7v10l8-5z' },
  { key: 'book', label: 'Educación / Cursos', path: 'M4 4.5h8a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4z M20 4.5h-8a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h8z' },
  { key: 'receipt', label: 'Servicios / Facturas', path: 'M6 2h9l3 3v17H6z M9 8h6 M9 12h6 M9 16h4' },
  { key: 'briefcase', label: 'Salario / Trabajo', path: 'M4 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2' },
  { key: 'trending-up', label: 'Ventas / Negocios', path: 'M3 17l6-6 4 4 8-8 M15 6h6v6' },
  { key: 'dollar-sign', label: 'Inversiones / Dinero', path: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { key: 'plus-circle', label: 'Salud / Médico', path: 'M12 8v8 M8 12h8 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' },
  { key: 'coffee', label: 'Café / Restaurantes', path: 'M18 8h1a4 4 0 0 1 0 8h-1 M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3' },
  { key: 'gift', label: 'Regalos / Varios', path: 'M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z' },
  { key: 'grid', label: 'General / Otros', path: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z' },
];

const PRESET_COLORS = [
  '#2EC4B6', '#3A86EF', '#FFB703', '#8338EC', '#E63946',
  '#F4A261', '#2A9D8F', '#457B9D', '#D62828', '#10B981',
  '#2563EB', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4',
];

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
  check: 'M20 6L9 17l-5-5',
};

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebarComponent, AppHeaderComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export class CategoriesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly financeService = inject(FinanceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);

  get currentUser() {
    return this.authService.currentUser();
  }

  get unreadNotificationCount(): number {
    return this.notificationService.unreadCount();
  }

  readonly ICON_PATHS = ICON_PATHS;
  readonly availableIcons = AVAILABLE_ICONS;
  readonly presetColors = PRESET_COLORS;

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
  activeRoute = 'categorias';

  get currentDateLabel(): string {
    const currentDate = new Date();
    const month = currentDate.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${currentDate.getDate()} de ${capitalizedMonth} de ${currentDate.getFullYear()}`;
  }

  /* Datos */
  categories: IncomeCategory[] = [];
  visibleCategories: IncomeCategory[] = [];
  loading = false;
  loadingError = '';
  saving = false;
  deleting = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  /* Filtros */
  selectedTypeFilter: 'all' | 'expense' | 'income' = 'all';
  searchTerm = '';

  /* Modal */
  showModal = false;
  isEditing = false;
  editingCategoryId: string | null = null;
  formError = '';
  showDeleteModal = false;
  deletingCategory: IncomeCategory | null = null;

  form = {
    name: '',
    type: 'expense' as 'expense' | 'income' | 'both',
    color: '#3A86EF',
    icon: 'cart',
  };

  ngOnInit(): void {
    this.loadCategories();
    this.route.queryParams.subscribe((params) => {
      const search = params['search'] || params['q'] || params['searchTerm'];
      if (search) {
        this.searchTerm = search;
        this.applyFilter();
        this.scrollToFirstMatch(search);
      }
    });
  }

  loadCategories(): void {
    this.loading = true;
    this.loadingError = '';

    this.financeService.getAllCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.applyFilter();
        this.loading = false;
        if (this.searchTerm) {
          this.scrollToFirstMatch(this.searchTerm);
        }
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.loadingError = 'No se pudieron cargar las categorías.';
        this.loading = false;
      },
    });
  }

  setTypeFilter(type: 'all' | 'expense' | 'income'): void {
    this.selectedTypeFilter = type;
    this.applyFilter();
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.visibleCategories = this.categories.filter((c) => {
      if (this.selectedTypeFilter !== 'all') {
        if (c.type !== this.selectedTypeFilter && c.type !== 'both') {
          return false;
        }
      }
      if (term) {
        return c.name.toLowerCase().includes(term);
      }
      return true;
    });
  }

  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
    if (term.trim()) {
      this.scrollToFirstMatch(term);
    }
  }

  scrollToFirstMatch(term?: string): void {
    setTimeout(() => {
      const target = document.querySelector('.categories-grid .category-card');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (target as HTMLElement).classList.add('search-highlight');
        setTimeout(() => (target as HTMLElement).classList.remove('search-highlight'), 2500);
      }
    }, 200);
  }

  openNewModal(): void {
    this.isEditing = false;
    this.editingCategoryId = null;
    this.formError = '';
    this.form = {
      name: '',
      type: this.selectedTypeFilter === 'income' ? 'income' : 'expense',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      icon: 'cart',
    };
    this.showModal = true;
  }

  openEditModal(cat: IncomeCategory): void {
    this.isEditing = true;
    this.editingCategoryId = cat.id;
    this.formError = '';
    this.form = {
      name: cat.name,
      type: cat.type,
      color: cat.color || '#3A86EF',
      icon: cat.icon || 'grid',
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formError = '';
  }

  selectColor(color: string): void {
    this.form.color = color;
  }

  selectIcon(key: string): void {
    this.form.icon = key;
  }

  submit(): void {
    if (!this.form.name.trim()) {
      this.formError = 'El nombre de la categoría es requerido.';
      return;
    }

    this.saving = true;
    this.formError = '';

    const payload = {
      name: this.form.name.trim(),
      type: this.form.type,
      color: this.form.color,
      icon: this.form.icon,
    };

    const req$ = this.isEditing && this.editingCategoryId
      ? this.financeService.updateCategory(this.editingCategoryId, payload)
      : this.financeService.createCategory(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.showToast(this.isEditing ? 'Categoría actualizada con éxito.' : 'Categoría creada con éxito.', 'success');
        this.notificationService.notifyDataChanged();
        this.loadCategories();
      },
      error: (err) => {
        console.error('Error al guardar categoría:', err);
        this.saving = false;
        this.formError = err?.error?.message || 'No se pudo guardar la categoría.';
      },
    });
  }

  openDeleteModal(cat: IncomeCategory): void {
    this.deletingCategory = cat;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deletingCategory = null;
  }

  confirmDelete(): void {
    if (!this.deletingCategory) return;
    this.deleting = true;

    this.financeService.deleteCategory(this.deletingCategory.id).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.deletingCategory = null;
        this.showToast('Categoría eliminada con éxito.', 'success');
        this.notificationService.notifyDataChanged();
        this.loadCategories();
      },
      error: (err) => {
        console.error('Error al eliminar categoría:', err);
        this.deleting = false;
        this.showToast('No se puede eliminar una categoría del sistema.', 'error');
      },
    });
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    window.setTimeout(() => (this.toastMessage = ''), 3500);
  }

  getCategoryIconPath(key: string | null): string {
    const found = AVAILABLE_ICONS.find((i) => i.key === key);
    if (found) return found.path;
    return ICON_PATHS[key || 'grid'] ?? ICON_PATHS['grid'];
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
