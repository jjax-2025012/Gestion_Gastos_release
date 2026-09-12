import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css',
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  @Input() title = '';
  @Input() subtitle = '';
  @Input() searchPlaceholder = '';
  @Input() searchTerm = '';
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() searchSubmit = new EventEmitter<string>();
  @Input() selectedDate = '';
  @Output() dateChange = new EventEmitter<string>();

  userMenuOpen = false;
  readonly defaultAvatar = 'assets/user-avatar-hombre.png';

  get currentUser() {
    return this.authService.currentUser();
  }

  get unreadCount(): number {
    return this.notificationService.unreadCount();
  }

  get currentDateLabel(): string {
    const currentDate = new Date();
    const month = currentDate.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    return `${currentDate.getDate()} de ${capitalizedMonth} de ${currentDate.getFullYear()}`;
  }

  get displayDateLabel(): string {
    if (this.selectedDate) {
      const parts = this.selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const month = d.toLocaleDateString('es-ES', { month: 'long' });
        const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
        return `${d.getDate()} de ${capMonth} de ${d.getFullYear()}`;
      }
    }
    return this.currentDateLabel;
  }

  ngOnInit(): void {
    this.loadNotifications();
    this.notificationService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadNotifications());
  }

  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.searchTermChange.emit(value);
  }

  onSearchEnter(): void {
    if (this.searchSubmit.observed) {
      this.searchSubmit.emit(this.searchTerm);
    } else {
      this.handleGlobalSearch(this.searchTerm);
    }
  }

  handleGlobalSearch(query: string): void {
    const term = (query || '').trim();
    if (!term) return;
    const lower = term.toLowerCase();
    if (lower.includes('categor')) {
      void this.router.navigate(['/categorias'], { queryParams: { search: term } });
    } else if (lower.includes('ingreso') || lower.includes('sueldo') || lower.includes('salario')) {
      void this.router.navigate(['/ingresos'], { queryParams: { search: term } });
    } else {
      void this.router.navigate(['/gastos'], { queryParams: { search: term } });
    }
  }

  onDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) {
      this.selectedDate = val;
      this.dateChange.emit(val);
    }
  }

  openDatePicker(dateInput?: HTMLInputElement): void {
    if (dateInput) {
      if (typeof (dateInput as any).showPicker === 'function') {
        try {
          (dateInput as any).showPicker();
        } catch {
          dateInput.focus();
        }
      } else {
        dateInput.focus();
      }
    }
  }

  onBellClick(): void {
    this.notificationService.markAllAsRead().subscribe({ next: () => undefined });
    void this.router.navigate(['/dashboard'], { fragment: 'notificationsSection' });
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

  private loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: () => undefined,
      error: () => undefined,
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
