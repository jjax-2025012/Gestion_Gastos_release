import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'ingresos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/incomes/incomes.component').then(
        (m) => m.IncomesComponent
      ),
  },
  {
    path: 'gastos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/expenses/expenses.component').then(
        (m) => m.ExpensesComponent
      ),
  },
  {
    path: 'categorias',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/categories/categories.component').then(
        (m) => m.CategoriesComponent
      ),
  },
  {
    path: 'categoria',
    redirectTo: 'categorias',
    pathMatch: 'full',
  },
  {
    path: 'presupuestos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/budgets/budgets.component').then(
        (m) => m.BudgetsComponent
      ),
  },
  {
    path: 'presupuesto',
    redirectTo: 'presupuestos',
    pathMatch: 'full',
  },
  {
    path: 'ahorro',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/savings/savings.component').then(
        (m) => m.SavingsComponent
      ),
  },
  {
    path: 'ahorros',
    redirectTo: 'ahorro',
    pathMatch: 'full',
  },
  {
    path: 'reportes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reports/reports.component').then(
        (m) => m.ReportsComponent
      ),
  },
  {
    path: 'configuracion',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent
      ),
  },
  { path: '**', redirectTo: 'login' },
];