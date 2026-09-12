import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

interface SidebarItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.css',
})
export class AppSidebarComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly menuItems: SidebarItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: 'dashboard' },
    { label: 'Gastos', icon: 'gastos', route: 'gastos' },
    { label: 'Ingresos', icon: 'ingresos', route: 'ingresos' },
    { label: 'Presupuestos', icon: 'presupuestos', route: 'presupuestos' },
    { label: 'Categorías', icon: 'categoria', route: 'categorias' },
    { label: 'Reportes', icon: 'reportes', route: 'reportes' },
    { label: 'Ahorro', icon: 'ahorro', route: 'ahorro' },
    { label: 'Configuración', icon: 'configuracion', route: 'configuracion' },
  ];

  collapsed = false;

  constructor(private readonly router: Router) {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => undefined);
  }

  isActive(route: string): boolean {
    return this.router.url.split('?')[0].replace(/^\//, '') === route;
  }

  navigateTo(route: string): void {
    void this.router.navigate(['/', route]);
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
