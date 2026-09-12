import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'app-budget-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-budget-summary.component.html',
  styleUrl: './app-budget-summary.component.css',
})
export class AppBudgetSummaryComponent {
  @Input() spent = 0;
  @Input() limit = 0;
  @Input() title = 'Presupuesto Mensual';

  readonly currencyService = inject(CurrencyService);

  get percent(): number {
    if (this.limit <= 0) return 0;
    return Math.min(100, Math.round((this.spent / this.limit) * 100));
  }

  get status(): string {
    if (this.percent >= 100) return 'Has alcanzado o superado el presupuesto establecido.';
    if (this.percent >= 85) return 'Atención: Estás cerca de alcanzar el límite mensual.';
    return 'Tu ritmo de gasto está dentro del margen planificado.';
  }

  formatCurrency(value: number): string {
    return this.currencyService.format(value);
  }
}
