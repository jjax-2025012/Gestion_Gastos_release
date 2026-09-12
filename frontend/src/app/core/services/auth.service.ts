import { Injectable, signal, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subscription, timer, tap } from 'rxjs';
import { LoginResponse, RegisterRequest, User } from '../models/auth.models';
import { environment } from '../../../environments/environment';
import { SavingsService } from './savings.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;

  private http = inject(HttpClient);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private savingsService = inject(SavingsService);

  public currentUser = signal<User | null>(this.getUserFromStorage());
  public sessionExpiredMessage: string | null = null;
  private timerSubscription?: Subscription;

  constructor() {
    this.initSessionWatch();

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.checkTokenExpirationNow());
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.checkTokenExpirationNow();
      });
    }
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    // Clear state/localStorage/sessionStorage on user switch
    this.clearSession();
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(res => {
        const initialAhorro = typeof res.user.ahorro === 'number' ? res.user.ahorro : 0;
        this.savingsService.initializeSavings(initialAhorro, []);
        this.setSession(res);
      })
    );
  }

  /**
   * Intercambia el ID Token emitido por Google por el JWT del sistema.
   * El backend valida la firma y crea la cuenta automáticamente si no existía.
   */
  googleLogin(idToken: string): Observable<LoginResponse> {
    // Clear state/localStorage/sessionStorage on user switch
    this.clearSession();
    return this.http.post<LoginResponse>(`${this.API_URL}/google`, { idToken }).pipe(
      tap(res => {
        const initialAhorro = typeof res.user.ahorro === 'number' ? res.user.ahorro : 0;
        this.savingsService.initializeSavings(initialAhorro, []);
        this.setSession(res);
      })
    );
  }

  register(data: RegisterRequest): Observable<LoginResponse> {
    // Explicitly set ahorro = 0 when registering local accounts
    const payload: RegisterRequest = {
      ...data,
      ahorro: 0,
    };
    // Clear state/localStorage/sessionStorage before creating new local account
    this.clearSession();
    this.savingsService.resetSavings();

    return this.http.post<LoginResponse>(`${this.API_URL}/register`, payload).pipe(
      tap(res => {
        // Enforce ahorro = 0 on client state and storage
        res.user.ahorro = 0;
        this.savingsService.initializeSavings(0, []);
        this.setSession(res);
      })
    );
  }

  updateProfile(data: { username?: string; gender?: string; avatar_url?: string }): Observable<{ success: boolean; user: User }> {
    return this.http.put<{ success: boolean; user: User }>(`${this.API_URL}/profile`, data).pipe(
      tap((res) => {
        if (res.user) {
          const current = this.currentUser();
          const updatedUser: User = {
            ...(current as User),
            ...res.user,
            avatar: res.user.avatar_url || res.user.avatar || current?.avatar,
            picture: res.user.avatar_url || res.user.picture || current?.picture,
            avatar_url: res.user.avatar_url || current?.avatar_url,
            ahorro: typeof res.user.ahorro === 'number' ? res.user.ahorro : current?.ahorro ?? 0,
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          this.currentUser.set(updatedUser);
        }
      })
    );
  }

  /**
   * Clear state/localStorage/sessionStorage on logout or user switch.
   */
  clearSession(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }
    this.currentUser.set(null);
    this.savingsService.resetSavings();

    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  }

  handleSessionExpiration(): void {
    this.clearSession();
    this.sessionExpiredMessage = 'Su sesión ha expirado. Por favor, inicia sesión nuevamente.';

    this.ngZone.run(() => {
      this.router.navigate(['/login'], {
        queryParams: { sessionExpired: 'true' }
      });
    });
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  isSessionValid(): boolean {
    const expiration = this.getTokenExpirationMs(this.getToken());
    return expiration !== null && expiration > Date.now();
  }

  private setSession(authResult: LoginResponse): void {
    const tokenPayload = this.decodeTokenPayload(authResult.token);
    const avatar = authResult.user.picture || authResult.user.avatar_url || authResult.user.avatar || authResult.user.avatarUrl || tokenPayload['picture'] || tokenPayload['avatar_url'];
    const ahorro = typeof authResult.user.ahorro === 'number' ? authResult.user.ahorro : 0;
    const user: User = {
      ...authResult.user,
      avatar,
      picture: authResult.user.picture || avatar,
      avatar_url: authResult.user.avatar_url || avatar,
      avatarUrl: authResult.user.avatarUrl || avatar,
      ahorro,
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', authResult.token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    this.currentUser.set(user);
    this.scheduleExpirationTimer();
  }

  private getUserFromStorage(): User | null {
    if (typeof localStorage === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  private initSessionWatch(): void {
    const token = this.getToken();
    if (!token) return;
    this.scheduleExpirationTimer();
  }

  private checkTokenExpirationNow(): void {
    const token = this.getToken();
    if (!token) return;

    const expiration = this.getTokenExpirationMs(token);
    if (expiration === null || expiration <= Date.now()) {
      this.handleSessionExpiration();
    }
  }

  private scheduleExpirationTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }

    const expiration = this.getTokenExpirationMs(this.getToken());
    if (expiration === null) {
      this.handleSessionExpiration();
      return;
    }

    const remainingMs = expiration - Date.now();

    if (remainingMs <= 0) {
      this.handleSessionExpiration();
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.timerSubscription = timer(remainingMs).subscribe(() => {
        this.handleSessionExpiration();
      });
    });
  }

  private getTokenExpirationMs(token: string | null): number | null {
    if (!token) return null;
    try {
      const payload = this.decodeTokenPayload(token);
      return typeof payload['exp'] === 'number' ? payload['exp'] * 1000 : null;
    } catch {
      return null;
    }
  }

  private decodeTokenPayload(token: string | null): Record<string, any> {
    if (!token) return {};
    try {
      return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return {};
    }
  }
}
