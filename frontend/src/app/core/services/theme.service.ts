import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'jax_theme';
  private readonly LEGACY_KEY = 'theme';
  public currentTheme = signal<AppTheme>(this.getSavedTheme());

  constructor() {
    this.applyTheme(this.currentTheme());
  }

  private getSavedTheme(): AppTheme {
    if (typeof localStorage !== 'undefined') {
      const saved = (localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem(this.LEGACY_KEY)) as AppTheme;
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light'; // Claro por defecto según requerimiento
  }

  setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, theme);
      localStorage.setItem(this.LEGACY_KEY, theme);
    }
    this.applyTheme(theme);
  }

  private applyTheme(theme: AppTheme): void {
    if (typeof document !== 'undefined') {
      const body = document.body;
      if (theme === 'dark') {
        body.classList.remove('theme-light', 'light-theme');
        body.classList.add('theme-dark', 'dark-theme', 'dark');
      } else {
        body.classList.remove('theme-dark', 'dark-theme', 'dark');
        body.classList.add('theme-light', 'light-theme');
      }
    }
  }
}
