import { Injectable, signal, inject } from '@angular/core';
import { NotificationService } from './notification.service';
import { CurrencyService } from './currency.service';

export interface SavingsDeposit {
  id: string;
  amount: number;
  date: string;
  note: string;
  type?: 'deposit' | 'withdrawal';
}

@Injectable({
  providedIn: 'root',
})
export class SavingsService {
  private readonly notificationService = inject(NotificationService);
  private readonly currencyService = inject(CurrencyService);

  private readonly STORAGE_TOTAL_KEY = 'jax_savings_total';
  private readonly STORAGE_HISTORY_KEY = 'jax_savings_history';
  private readonly STORAGE_SUGGESTION_KEY = 'jax_savings_prompt_dismissed';

  public totalSavings = signal<number>(this.getSavedTotal());
  public savingsHistory = signal<SavingsDeposit[]>(this.getSavedHistory());

  // Modal de sugerencia de ahorro reactivo
  public showSavingsSuggestionModal = signal<boolean>(false);
  public suggestedRemainingBalance = signal<number>(0);

  private getSavedTotal(): number {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(this.STORAGE_TOTAL_KEY);
      if (v) {
        const n = parseFloat(v);
        if (!isNaN(n)) return n;
      }
    }
    return 0;
  }

  private getSavedHistory(): SavingsDeposit[] {
    if (typeof localStorage !== 'undefined') {
      const h = localStorage.getItem(this.STORAGE_HISTORY_KEY);
      if (h) {
        try {
          return JSON.parse(h);
        } catch {
          return [];
        }
      }
    }
    return [];
  }

  depositToSavings(amount: number, note = 'Destinado al fondo de ahorro'): boolean {
    if (amount <= 0) return false;

    const newTotal = this.totalSavings() + amount;
    this.totalSavings.set(newTotal);

    const deposit: SavingsDeposit = {
      id: 'sav_' + Date.now(),
      amount,
      date: new Date().toISOString().slice(0, 10),
      note,
      type: 'deposit',
    };

    const newHistory = [deposit, ...this.savingsHistory()];
    this.savingsHistory.set(newHistory);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_TOTAL_KEY, String(newTotal));
      localStorage.setItem(this.STORAGE_HISTORY_KEY, JSON.stringify(newHistory));
    }

    this.notificationService.notifyDataChanged();
    const formatted = this.currencyService.format(amount);
    this.notificationService.createNotification(
      `¡Excelente! Has transferido ${formatted} a tu fondo de Ahorro.`,
      'success',
      'leaf'
    ).subscribe({ next: () => undefined, error: () => undefined });

    return true;
  }

  withdrawFromSavings(amount: number, note = 'Retiro del fondo de ahorro'): boolean {
    if (amount <= 0 || amount > this.totalSavings()) return false;

    const newTotal = this.totalSavings() - amount;
    this.totalSavings.set(newTotal);

    const withdrawal: SavingsDeposit = {
      id: 'sav_' + Date.now(),
      amount,
      date: new Date().toISOString().slice(0, 10),
      note,
      type: 'withdrawal',
    };
    const newHistory = [withdrawal, ...this.savingsHistory()];
    this.savingsHistory.set(newHistory);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_TOTAL_KEY, String(newTotal));
      localStorage.setItem(this.STORAGE_HISTORY_KEY, JSON.stringify(newHistory));
    }

    this.notificationService.notifyDataChanged();
    const formatted = this.currencyService.format(amount);
    this.notificationService.createNotification(
      `Has retirado ${formatted} de tu fondo de Ahorro.`,
      'info',
      'leaf'
    ).subscribe({ next: () => undefined, error: () => undefined });

    return true;
  }

  checkSavingsSuggestion(incomesCount: number, expensesCount: number, remainingBalance: number): void {
    if (typeof sessionStorage !== 'undefined') {
      const alreadyPrompted = sessionStorage.getItem(this.STORAGE_SUGGESTION_KEY);
      if (alreadyPrompted === 'true') return;
    }

    // Regla de negocio: usuario registra ingresos y acumula entre 2 o 3 gastos registrados
    if (incomesCount >= 1 && expensesCount >= 2 && expensesCount <= 3 && remainingBalance > 0) {
      this.suggestedRemainingBalance.set(remainingBalance);
      this.showSavingsSuggestionModal.set(true);
    }
  }

  dismissSuggestion(): void {
    this.showSavingsSuggestionModal.set(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.STORAGE_SUGGESTION_KEY, 'true');
    }
  }

  /**
   * Reset all savings state and clear storage keys to prevent leaking between accounts.
   */
  resetSavings(): void {
    this.totalSavings.set(0);
    this.savingsHistory.set([]);
    this.showSavingsSuggestionModal.set(false);
    this.suggestedRemainingBalance.set(0);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_TOTAL_KEY);
      localStorage.removeItem(this.STORAGE_HISTORY_KEY);
      localStorage.removeItem('jax_savings_goal');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.STORAGE_SUGGESTION_KEY);
    }
  }

  /**
   * Explicitly initialize savings for a user session.
   */
  initializeSavings(total = 0, history: SavingsDeposit[] = []): void {
    const validTotal = typeof total === 'number' && !isNaN(total) && total >= 0 ? total : 0;
    this.totalSavings.set(validTotal);
    this.savingsHistory.set(history);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_TOTAL_KEY, String(validTotal));
      localStorage.setItem(this.STORAGE_HISTORY_KEY, JSON.stringify(history));
    }
  }
}
