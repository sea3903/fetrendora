/**
 * Login Component - Trendora Fashion
 * Đen trắng, tối giản, i18n, form validation
 */
import { Component, ViewChild, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { LoginDTO } from '../../dtos/user/login.dto';
import { NgForm, FormsModule } from '@angular/forms';
import { Role } from '../../models/role';
import { UserResponse } from '../../responses/user/user.response';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../base/base.component';
import { tap, switchMap, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    FooterComponent,
    HeaderComponent,
    CommonModule,
    FormsModule,
    TranslateModule
  ]
})
export class LoginComponent extends BaseComponent implements OnInit {
  @ViewChild('loginForm') loginForm!: NgForm;

  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  // Form fields
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  rememberMe: boolean = true;

  // Validation errors
  emailError: string = '';
  passwordError: string = '';

  roles: Role[] = [];
  selectedRole: Role | undefined;
  userResponse?: UserResponse;

  // Language
  currentLang: string = 'vi';

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Get saved language
      const savedLang = localStorage.getItem('lang') || 'vi';
      this.currentLang = savedLang;
      this.translate.use(savedLang);
    }

    this.translate.setDefaultLang('vi');

    // Get roles
    this.roleService.getRoles().subscribe({
      next: ({ data: roles }: ApiResponse) => {
        this.roles = roles;
        this.selectedRole = roles.find((r: Role) => r.name.toLowerCase() === 'user') || roles[0];
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading roles:', error);
      }
    });
  }

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lang', lang);
    }
  }

  validateEmail(): boolean {
    if (!this.email || this.email.trim() === '') {
      this.emailError = this.translate.instant('LOGIN.VALIDATION.EMAIL_REQUIRED');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.emailError = this.translate.instant('LOGIN.VALIDATION.EMAIL_INVALID');
      return false;
    }
    this.emailError = '';
    return true;
  }

  validatePassword(): boolean {
    if (!this.password || this.password.trim() === '') {
      this.passwordError = this.translate.instant('LOGIN.VALIDATION.PASSWORD_REQUIRED');
      return false;
    }
    if (this.password.length < 6) {
      this.passwordError = this.translate.instant('LOGIN.VALIDATION.PASSWORD_MIN');
      return false;
    }
    this.passwordError = '';
    return true;
  }

  login() {
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    const loginDTO: LoginDTO = {
      email: this.email,
      password: this.password,
      role_id: this.selectedRole?.id ?? 1
    };

    this.userService.login(loginDTO).pipe(
      tap((apiResponse: ApiResponse) => {
        const { token } = apiResponse.data;
        this.tokenService.setToken(token);
      }),
      switchMap((apiResponse: ApiResponse) => {
        const { token } = apiResponse.data;
        return this.userService.getUserDetail(token).pipe(
          tap((apiResponse2: ApiResponse) => {
            this.userResponse = {
              ...apiResponse2.data,
              date_of_birth: new Date(apiResponse2.data.date_of_birth),
            };

            // Luôn lưu user vào localStorage để Header có thể hiển thị
            this.userService.saveUserResponseToLocalStorage(this.userResponse);
            console.log('Login: User saved to localStorage:', this.userResponse);

            if (this.userResponse?.role.name === 'admin') {
              this.router.navigate(['/admin']);
            } else {
              this.router.navigate(['/']);
            }
          }),
          catchError((error: HttpErrorResponse) => {
            console.error('Error getting user details:', error?.error?.message ?? '');
            return of(null);
          })
        );
      }),
      finalize(() => {
        this.cartService.refreshCart();
      })
    ).subscribe({
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: this.translate.instant('LOGIN.ERROR.INVALID_CREDENTIALS'),
          title: this.translate.instant('COMMON.ERROR')
        });
      }
    });
  }

  loginWithGoogle() {
    this.authService.authenticate('google').subscribe({
      next: (url: string) => {
        window.location.href = url;
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Google login error',
          title: this.translate.instant('COMMON.ERROR')
        });
      }
    });
  }

  loginWithFacebook() {
    this.authService.authenticate('facebook').subscribe({
      next: (url: string) => {
        window.location.href = url;
      },
      error: (error: HttpErrorResponse) => {
        this.toastService.showToast({
          error: error,
          defaultMsg: 'Facebook login error',
          title: this.translate.instant('COMMON.ERROR')
        });
      }
    });
  }

  createAccount() {
    this.router.navigate(['/register']);
  }

  forgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
