import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, fromEvent, merge } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Tracks user inactivity with a 5s idle grace delay before triggering the inactivity counter.
 *
 * Monitored events: mousemove, keydown, click, scroll, touchstart.
 * - Trigger inactivity counter ONLY after 5s of continuous idle.
 * - On any activity: reset inactive seconds to 0, clear active intervals/timeouts,
 *   and restart the 5s grace period timer.
 */
@Injectable({
  providedIn: 'root',
})
export class InactivityService implements OnDestroy {
  /** 5s grace period delay before inactivity counter triggers */
  public static readonly GRACE_PERIOD_MS = 5 * 1000;
  /** Overall idle timeout in milliseconds */
  public static readonly IDLE_TIMEOUT_MS = 15 * 1000;

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly destroy$ = new Subject<void>();

  /** Current inactive seconds elapsed since the counter started */
  public inactiveSeconds = 0;
  public readonly inactiveSecondsSignal = signal<number>(0);

  private graceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private counterIntervalId: ReturnType<typeof setInterval> | null = null;
  private isWatching = false;

  /**
   * Call from AppComponent to begin watching user activity.
   * Runs outside Angular zone to avoid unnecessary change-detection cycles.
   */
  startWatching(): void {
    if (typeof window === 'undefined') return;
    if (this.isWatching) return;
    this.isWatching = true;

    this.ngZone.runOutsideAngular(() => {
      const activity$ = merge(
        fromEvent(window, 'mousemove'),
        fromEvent(window, 'keydown'),
        fromEvent(window, 'click'),
        fromEvent(window, 'scroll'),
        fromEvent(window, 'touchstart'),
      );

      activity$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.handleActivity();
      });

      // Start initial 5s grace period timer
      this.resetAndRestartGraceTimer();
    });
  }

  /**
   * On any activity (mousemove, keydown, click, scroll, touchstart):
   * - Reset inactive seconds to 0
   * - Clear active intervals/timeouts
   * - Restart the 5s grace period timer
   */
  public handleActivity = (): void => {
    this.resetAndRestartGraceTimer();
  };

  /** Alias for manual reset */
  public resetInactivity = (): void => {
    this.handleActivity();
  };

  /** Clear all active intervals and timeouts */
  public clearTimers(): void {
    if (this.graceTimeoutId !== null) {
      clearTimeout(this.graceTimeoutId);
      this.graceTimeoutId = null;
    }
    if (this.counterIntervalId !== null) {
      clearInterval(this.counterIntervalId);
      this.counterIntervalId = null;
    }
  }

  /**
   * Resets inactive seconds to 0, clears active intervals/timeouts,
   * and restarts the 5s grace period timer.
   */
  private resetAndRestartGraceTimer(): void {
    this.inactiveSeconds = 0;
    this.inactiveSecondsSignal.set(0);
    this.clearTimers();

    if (!this.isWatching) return;

    this.graceTimeoutId = setTimeout(() => {
      this.triggerInactivityCounter();
    }, InactivityService.GRACE_PERIOD_MS);
  }

  /**
   * Trigger inactivity counter ONLY after 5s of continuous idle.
   */
  public triggerInactivityCounter(): void {
    // Clear any previous interval/timeout before starting counter
    if (this.counterIntervalId !== null) {
      clearInterval(this.counterIntervalId);
      this.counterIntervalId = null;
    }

    this.inactiveSeconds = 0;
    this.inactiveSecondsSignal.set(0);

    const maxCounterSeconds = Math.max(
      5,
      Math.floor((InactivityService.IDLE_TIMEOUT_MS - InactivityService.GRACE_PERIOD_MS) / 1000)
    );

    this.counterIntervalId = setInterval(() => {
      this.inactiveSeconds++;
      this.inactiveSecondsSignal.set(this.inactiveSeconds);

      if (this.inactiveSeconds >= maxCounterSeconds) {
        this.onIdleTimeout();
      }
    }, 1000);
  }

  /** Stop all timers (e.g. on manual logout). */
  stopWatching(): void {
    this.isWatching = false;
    this.clearTimers();
    this.inactiveSeconds = 0;
    this.inactiveSecondsSignal.set(0);
  }

  private onIdleTimeout(): void {
    this.clearTimers();

    // Guard: only act if the user is actually logged in.
    if (!this.authService.getToken()) return;

    this.authService.clearSession();
    this.ngZone.run(() => {
      this.router.navigate(['/login'], {
        queryParams: { sessionExpired: 'inactivity' },
      });
    });
  }

  ngOnDestroy(): void {
    this.stopWatching();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
