/**
 * Register Component - Trendora Fashion
 * Đen trắng, tối giản, i18n, form validation
 */
import { Component, ViewChild, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { RegisterDTO } from '../../dtos/user/register.dto';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../base/base.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    FooterComponent,
    TranslateModule
  ]
})
export class RegisterComponent extends BaseComponent implements OnInit {
  @ViewChild('registerForm') registerForm!: NgForm;

  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  // Form fields
  email: string = '';
  fullName: string = '';
  password: string = '';
  retypePassword: string = '';
  phoneNumber: string = '';

  // Validation errors
  fullNameError: string = '';
  emailError: string = '';
  passwordError: string = '';
  retypePasswordError: string = '';

  showPassword: boolean = false;
  showRetypePassword: boolean = false;
  isLoading: boolean = false;
  registrationSuccess: boolean = false;

  // Language
  currentLang: string = 'vi';

  constructor() {
    super();
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem('lang') || 'vi';
      this.currentLang = savedLang;
      this.translate.use(savedLang);
    }
    this.translate.setDefaultLang('vi');
  }

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lang', lang);
    }
  }

  validateFullName(): boolean {
    if (!this.fullName || this.fullName.trim() === '') {
      this.fullNameError = this.translate.instant('REGISTER.VALIDATION.FULLNAME_REQUIRED');
      return false;
    }
    this.fullNameError = '';
    return true;
  }

  validateEmail(): boolean {
    if (!this.email || this.email.trim() === '') {
      this.emailError = this.translate.instant('REGISTER.VALIDATION.EMAIL_REQUIRED');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.emailError = this.translate.instant('REGISTER.VALIDATION.EMAIL_INVALID');
      return false;
    }
    this.emailError = '';
    return true;
  }

  validatePassword(): boolean {
    if (!this.password || this.password.trim() === '') {
      this.passwordError = this.translate.instant('REGISTER.VALIDATION.PASSWORD_REQUIRED');
      return false;
    }
    if (this.password.length < 6) {
      this.passwordError = this.translate.instant('REGISTER.VALIDATION.PASSWORD_MIN');
      return false;
    }
    this.passwordError = '';
    return true;
  }

  validateRetypePassword(): boolean {
    if (!this.retypePassword || this.retypePassword.trim() === '') {
      this.retypePasswordError = this.translate.instant('REGISTER.VALIDATION.CONFIRM_REQUIRED');
      return false;
    }
    if (this.password !== this.retypePassword) {
      this.retypePasswordError = this.translate.instant('REGISTER.ERROR.PASSWORD_MISMATCH');
      return false;
    }
    this.retypePasswordError = '';
    return true;
  }

  register() {
    const isFullNameValid = this.validateFullName();
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();
    const isRetypeValid = this.validateRetypePassword();

    if (!isFullNameValid || !isEmailValid || !isPasswordValid || !isRetypeValid) {
      return;
    }

    this.isLoading = true;

    const registerDTO: RegisterDTO = {
      fullname: this.fullName,
      email: this.email,
      phone_number: this.phoneNumber || undefined,
      password: this.password,
      retype_password: this.retypePassword,
      facebook_account_id: 0,
      google_account_id: 0,
      role_id: 1
    };

    this.userService.register(registerDTO).subscribe({
      next: (apiResponse: ApiResponse) => {
        this.isLoading = false;
        this.registrationSuccess = true;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.toastService.showToast({
          error: error,
          defaultMsg: this.translate.instant('REGISTER.ERROR.EMAIL_EXISTS'),
          title: this.translate.instant('COMMON.ERROR')
        });
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleRetypePassword() {
    this.showRetypePassword = !this.showRetypePassword;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
