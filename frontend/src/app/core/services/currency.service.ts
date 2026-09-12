import { Injectable, signal } from '@angular/core';

export type CurrencyCode = 'GTQ' | 'USD' | 'EUR' | 'MXN';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rate: number; // 1 GTQ = rate * (Unidad de Moneda Seleccionada)
}

export const CURRENCY_MAP: Record<CurrencyCode, CurrencyInfo> = {
  GTQ: { code: 'GTQ', symbol: 'Q', name: 'Quetzal (GTQ)', rate: 1.0 },
  USD: { code: 'USD', symbol: '$', name: 'Dólar (USD)', rate: 1 / 7.75 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (EUR)', rate: 1 / 8.40 },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Peso Mexicano (MXN)', rate: 2.60 },
};

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private readonly STORAGE_KEY = 'jax_currency';
  public currentCurrency = signal<CurrencyCode>(this.getSavedCurrency());

  private getSavedCurrency(): CurrencyCode {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.STORAGE_KEY) as CurrencyCode;
      if (saved && CURRENCY_MAP[saved]) return saved;
    }
    return 'GTQ';
  }

  setCurrency(code: CurrencyCode): void {
    if (!CURRENCY_MAP[code]) return;
    this.currentCurrency.set(code);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, code);
    }
  }

  get currency(): CurrencyCode {
    return this.currentCurrency();
  }

  get symbol(): string {
    return CURRENCY_MAP[this.currency].symbol;
  }

  convert(amountInGTQ: number): number {
    const rate = CURRENCY_MAP[this.currency].rate;
    const num = Number(amountInGTQ);
    return (Number.isFinite(num) ? num : 0) * rate;
  }

  format(amountInGTQ: number | null | undefined): string {
    const num = amountInGTQ === null || amountInGTQ === undefined || !Number.isFinite(Number(amountInGTQ))
      ? 0
      : Number(amountInGTQ);
    const converted = this.convert(num);
    const sym = this.symbol;
    return `${sym}${converted.toLocaleString('es-GT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  formatNumber(val: number | null | undefined): string {
    const num = val === null || val === undefined || !Number.isFinite(Number(val)) ? 0 : Number(val);
    return num.toLocaleString('es-GT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
