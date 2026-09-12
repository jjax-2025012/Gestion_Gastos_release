import { Component, inject, OnInit, AfterViewInit, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; text?: string; width?: number }
          ) => void;
        };
      };
    };
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ngZone = inject(NgZone);

  @ViewChild('googleButton', { static: true }) googleButtonRef!: ElementRef;

  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;
  isGoogleLoading = false; // beforeRender suspendemos el loading
  private googleInitiated = false;

  readonly environment = environment;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const sessionExpired = params.get('sessionExpired');
      const unauthorized = params.get('unauthorized') === 'true';

      if (sessionExpired === 'inactivity') {
        this.errorMessage = 'Tu sesión ha expirado por inactividad (15 minutos sin interacción). Inicia sesión nuevamente.';
      } else if (sessionExpired) {
        this.errorMessage = 'Su sesión ha expirado. Por favor, inicia sesión nuevamente.';
      } else if (unauthorized) {
        this.errorMessage = 'Debes iniciar sesión para acceder a esta sección.';
      } else if (this.authService.sessionExpiredMessage) {
        this.errorMessage = this.authService.sessionExpiredMessage;
        this.authService.sessionExpiredMessage = null;
      }
    });
  }

  ngAfterViewInit(): void {
    this.renderGoogleButton();
  }

  private renderGoogleButton(): void {
    if (!environment.googleClientId) return;
    if (typeof window === 'undefined' || !window.google?.accounts) {
      // El script aún no cargó; reintentamos a los 500 ms.
      window.setTimeout(() => this.renderGoogleButton(), 500);
      return;
    }
    if (this.googleInitiated) return;
    this.googleInitiated = true;

    window.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response) => this.handleGoogleCredential(response.credential),
    });

    window.google.accounts.id.renderButton(this.googleButtonRef.nativeElement, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      width: this.googleButtonRef.nativeElement.clientWidth || 360,
    });
  }

  private handleGoogleCredential(credential: string): void {
    if (!credential) return;
    this.isGoogleLoading = true;
    this.errorMessage = '';

    this.authService.googleLogin(credential).subscribe({
      next: () => {
        this.isGoogleLoading = false;
        this.ngZone.run(() => {
          this.router.navigate(['/dashboard']);
        });
      },
      error: (err) => {
        this.isGoogleLoading = false;
        this.errorMessage = err.error?.message || 'No se pudo iniciar sesión con Google. Intenta de nuevo.';
      }
    });
  }

  onGoogleNotConfigured(): void {
    this.errorMessage = 'El inicio de sesión con Google está habilitado en el servidor, pero aún no se configura el Client ID. Revisa la variable GOOGLE_CLIENT_ID.';
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor ingresa tu correo y contraseña.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Credenciales incorrectas o error en el servidor.';
      }
    });
  }
}