import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { InactivityService } from './core/services/inactivity.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {
  /**
   * Inject ThemeService eagerly so its constructor runs at bootstrap,
   * applying the saved (or default 'light') theme class to document.body
   * before any child component renders. This prevents the flash of
   * white text on light backgrounds observed on first load.
   */
  private readonly themeService = inject(ThemeService);

  /**
   * Inject InactivityService to start the idle-timeout watcher
   * which auto-logs the user out after 15 minutes of inactivity.
   */
  private readonly inactivityService = inject(InactivityService);

  ngOnInit(): void {
    this.inactivityService.startWatching();
  }
}
